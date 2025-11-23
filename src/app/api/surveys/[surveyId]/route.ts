import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params

    return await withAuth(request, async ({ teamMember, supabase }) => {
      // Fetch survey with all questions
      const { data: survey, error } = await supabase
        .from('surveys')
        .select('*, survey_questions(*)')
        .eq('id', surveyId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Survey not found' },
            { status: 404 }
          )
        }
        throw new Error(`Failed to fetch survey: ${error.message}`)
      }

      // Sort questions by sort_order
      if (survey.survey_questions) {
        survey.survey_questions.sort((a, b) => a.sort_order - b.sort_order)
      }

      return NextResponse.json({ survey })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const body = await request.json()
    const { title, description, status } = body

    // Validate status if provided
    if (status && !['draft', 'published', 'closed'].includes(status)) {
      throw new Error('Invalid survey status. Must be draft, published, or closed.')
    }

    return await withAuth(request, async ({ teamMember, supabase }) => {
      // First, fetch the current survey to check status transitions
      const { data: currentSurvey, error: fetchError } = await supabase
        .from('surveys')
        .select('status')
        .eq('id', surveyId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Survey not found' },
            { status: 404 }
          )
        }
        throw new Error(`Failed to fetch survey: ${fetchError.message}`)
      }

      // Build update object
      const updateData: {
        title?: string
        description?: string
        status?: string
        updated_at?: string
        published_at?: string
        closed_at?: string
      } = {
        updated_at: new Date().toISOString()
      }

      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description

      // Handle status transitions
      if (status && status !== currentSurvey.status) {
        updateData.status = status

        // Set published_at when transitioning to published
        if (status === 'published') {
          updateData.published_at = new Date().toISOString()
        }

        // Set closed_at when transitioning to closed
        if (status === 'closed') {
          updateData.closed_at = new Date().toISOString()
        }
      }

      // Update the survey
      const { data: survey, error } = await supabase
        .from('surveys')
        .update(updateData)
        .eq('id', surveyId)
        .eq('team_id', teamMember.team_id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update survey: ${error.message}`)
      }

      return NextResponse.json({ survey })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params

    return await withAuth(request, async ({ teamMember, supabase }) => {
      // Delete the survey (CASCADE will delete questions, responses, and answers)
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId)
        .eq('team_id', teamMember.team_id)

      if (error) {
        throw new Error(`Failed to delete survey: ${error.message}`)
      }

      return NextResponse.json({ success: true }, { status: 200 })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
