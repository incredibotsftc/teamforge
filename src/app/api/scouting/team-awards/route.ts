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
        awards: []
      })
    }

    // Get awards for each event
    const allAwards = []
    for (const event of teamEvents) {
      try {
        // Get all awards for the event (not filtered by team)
        const eventAwards = await ftcEventsService.getEventAwards(parseInt(season), event.code)

        // Filter to only awards for this team
        const teamAwards = eventAwards.filter(award => award.teamNumber === teamNumber)

        // Add event info to each award
        const awardsWithEvent = teamAwards.map(award => ({
          ...award,
          eventName: event.name,
          eventCode: event.code,
          eventStart: event.dateStart,
          eventEnd: event.dateEnd,
          eventCity: event.city,
          eventState: event.stateprov
        }))

        allAwards.push(...awardsWithEvent)
      } catch (error) {
        // Skip events with no awards or errors
        console.error(`Error fetching awards for event ${event.code}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      teamNumber,
      events: teamEvents,
      awards: allAwards,
      totalAwards: allAwards.length
    })

  } catch (error) {
    console.error('Error fetching team awards:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch team awards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
