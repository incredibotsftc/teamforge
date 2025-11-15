import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventCode = searchParams.get('eventCode')
    const seasonId = searchParams.get('seasonId')

    if (!eventCode) {
      return NextResponse.json(
        { error: 'Event code is required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Query scouting responses by event code stored in metadata
    let query = supabase
      .from('scouting_responses')
      .select(`
        *,
        teams:team_id (
          team_number,
          team_name
        )
      `)
      .filter('metadata->>event_code', 'eq', eventCode)
      .order('created_at', { ascending: false })

    // Optionally filter by season
    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching event responses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scouting responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      responses: data || []
    })
  } catch (error) {
    console.error('Error in event-responses API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
