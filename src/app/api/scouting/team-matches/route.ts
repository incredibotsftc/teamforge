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
    const season = seasonParam || await ftcEventsService.getCurrentSeason()

    // Get all events the team participated in
    const teamEvents = await ftcEventsService.getTeamEvents(parseInt(season), teamNumber)

    if (teamEvents.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        matches: []
      })
    }

    // Get matches for each event where this team participated
    const allMatches = []
    for (const event of teamEvents) {
      try {
        const eventMatches = await ftcEventsService.getEventMatchesByTeam(parseInt(season), event.code, teamNumber)

        // Add event info to each match
        const matchesWithEvent = eventMatches.map(match => ({
          ...match,
          eventName: event.name,
          eventCode: event.code,
          eventStart: event.dateStart,
          eventEnd: event.dateEnd,
          eventCity: event.city,
          eventState: event.stateprov
        }))

        allMatches.push(...matchesWithEvent)
      } catch (error) {
        // Skip events with no matches or errors
        console.error(`Error fetching matches for event ${event.code}:`, error)
      }
    }

    // Sort matches chronologically by actual start time (or scheduled start time if not started)
    allMatches.sort((a, b) => {
      const timeA = a.actualStartTime || a.startTime
      const timeB = b.actualStartTime || b.startTime
      return new Date(timeA).getTime() - new Date(timeB).getTime()
    })

    return NextResponse.json({
      success: true,
      teamNumber,
      events: teamEvents,
      matches: allMatches,
      totalMatches: allMatches.length
    })

  } catch (error) {
    console.error('Error fetching team matches:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch team matches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
