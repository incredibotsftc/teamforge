import { NextRequest, NextResponse } from 'next/server'
import { ftcEventsService } from '@/lib/ftcEventsService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamNumberStr = searchParams.get('teamNumber')
    const seasonParam = searchParams.get('season')

    if (!teamNumberStr) {
      return NextResponse.json(
        { error: 'Team number is required' },
        { status: 400 }
      )
    }

    const teamNumber = parseInt(teamNumberStr)
    if (isNaN(teamNumber) || teamNumber <= 0) {
      return NextResponse.json(
        { error: 'Invalid team number' },
        { status: 400 }
      )
    }

    // Use provided season or fall back to current season
    const season = seasonParam ? parseInt(seasonParam) : parseInt(await ftcEventsService.getCurrentSeason())

    // Get all events the team is registered for
    const teamEvents = await ftcEventsService.getTeamEvents(season, teamNumber)

    return NextResponse.json({
      success: true,
      teamNumber,
      season,
      events: teamEvents,
      totalEvents: teamEvents.length
    })

  } catch (error) {
    console.error('Error fetching team events:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for missing or invalid API credentials
    if (errorMessage.includes('FTC API credentials not configured') ||
        errorMessage.includes('FTC API authentication failed')) {
      return NextResponse.json(
        {
          error: 'API_CREDENTIALS_MISSING',
          message: errorMessage
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch team events',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
