import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, status = 'draft' } = body

    // Validate required fields
    if (!title) {
      throw ValidationError.MISSING_FIELDS(['title'])
    }

    // Validate status
    if (!['draft', 'published', 'closed'].includes(status)) {
      throw new Error('Invalid survey status. Must be draft, published, or closed.')
    }

    return await withAuth(request, async ({ user, teamMember, supabase }) => {
      // Get current season for the team
      const { data: currentSeason, error: seasonError } = await supabase
        .from('seasons')
        .select('id')
        .eq('team_id', teamMember.team_id)
        .eq('is_current_season', true)
        .single()

      if (seasonError || !currentSeason) {
        throw new Error('No current season found')
      }

      // Create the survey
      const { data: survey, error } = await supabase
        .from('surveys')
        .insert({
          title,
          description,
          status,
          team_id: teamMember.team_id,
          season_id: currentSeason.id,
          created_by: user.id,
          published_at: status === 'published' ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create survey: ${error.message}`)
      }

      return NextResponse.json({ survey }, { status: 201 })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const season_id = searchParams.get('season_id')
    const status = searchParams.get('status')

    return await withAuth(request, async ({ teamMember, supabase }) => {
      // Get current season if not provided
      let targetSeasonId = season_id
      if (!targetSeasonId) {
        const { data: currentSeason } = await supabase
          .from('seasons')
          .select('id')
          .eq('team_id', teamMember.team_id)
          .eq('is_current_season', true)
          .single()

        if (currentSeason) {
          targetSeasonId = currentSeason.id
        }
      }

      // Query surveys for the team
      let query = supabase
        .from('surveys')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .order('created_at', { ascending: false })

      // Filter by season if provided
      if (targetSeasonId) {
        query = query.eq('season_id', targetSeasonId)
      }

      // Filter by status if provided
      if (status && ['draft', 'published', 'closed'].includes(status)) {
        query = query.eq('status', status)
      }

      const { data: surveys, error } = await query

      if (error) {
        throw new Error(`Failed to fetch surveys: ${error.message}`)
      }

      // Get question counts for each survey
      const surveysWithCount = await Promise.all(
        (surveys || []).map(async (survey) => {
          const { count } = await supabase
            .from('survey_questions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', survey.id)

          return {
            ...survey,
            question_count: count || 0
          }
        })
      )

      return NextResponse.json({ surveys: surveysWithCount })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
