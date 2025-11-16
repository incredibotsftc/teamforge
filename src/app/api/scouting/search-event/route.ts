import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RateLimitPresets } from '@/lib/rateLimit'
import { ftcEventsService, type FTCEvent, type FTCRanking } from '@/lib/ftcEventsService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.SCOUTING_SEARCH)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many search requests. Please try again later.' },
      {
        status: 429,
        headers: rateLimitResult.headers
      }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const eventCode = searchParams.get('eventCode')
    const seasonParam = searchParams.get('season')

    // Support both 'query' (for name search) and 'eventCode' (for code search)
    const searchValue = query || eventCode

    if (!searchValue) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (searchValue.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Use provided season or fall back to current season
    const season = seasonParam || await ftcEventsService.getCurrentSeason()

    let events: FTCEvent[] = []

    // If eventCode parameter is used, search by code (for events page)
    if (eventCode) {
      events = await ftcEventsService.searchEventsByCode(parseInt(season), eventCode)

      if (events.length === 0) {
        return NextResponse.json({
          success: true,
          events: [],
          teams: []
        })
      }

      // Get teams for the first matching event
      const firstEvent = events[0]
      const teams = await ftcEventsService.getEventTeams(parseInt(season), firstEvent.code)

      // Get rankings for the event
      let rankings: FTCRanking[] = []
      try {
        rankings = await ftcEventsService.getEventRankings(parseInt(season), firstEvent.code)
      } catch {
        // No rankings available for this event yet
      }

      // Merge teams with their rankings
      const teamsWithRankings = teams.map(team => {
        // Try matching with type conversion
        const ranking = rankings.find(r =>
          r.teamNumber === team.teamNumber
        )

        return {
          ...team,
          rank: ranking?.rank || null,
          wins: ranking?.wins ?? null,
          losses: ranking?.losses ?? null,
          ties: ranking?.ties ?? null,
          // The API uses sortOrder fields for ranking points
          sortOrder1: ranking?.sortOrder1 ?? null, // Ranking Points (RP)
          sortOrder2: ranking?.sortOrder2 ?? null, // TBP (Tie Breaker Points)
          sortOrder3: ranking?.sortOrder3 ?? null, // Highest score
          sortOrder4: ranking?.sortOrder4 ?? null, // Second highest score
          qualAverage: ranking?.qualAverage ?? null,
          matchesPlayed: ranking?.matchesPlayed ?? null,
          matchesCounted: ranking?.matchesCounted ?? null
        }
      })

      // Sort by rank (teams without rank go to the end)
      teamsWithRankings.sort((a, b) => {
        if (a.rank === null && b.rank === null) return 0
        if (a.rank === null) return 1
        if (b.rank === null) return -1
        return a.rank - b.rank
      })

      return NextResponse.json({
        success: true,
        events: events,
        teams: teamsWithRankings
      })
    } else {
      // If query parameter is used, search by name (for Fill Scouting Sheet)
      events = await ftcEventsService.searchEventsByName(parseInt(season), query!)

      // Return just the events with their eventId included
      const eventsWithId = events.map(event => ({
        code: event.code,
        name: event.name,
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
        city: event.city,
        stateprov: event.stateprov,
        venue: event.venue,
        eventId: event.eventId
      }))

      return NextResponse.json({
        success: true,
        events: eventsWithId
      })
    }

  } catch (error) {
    console.error('Error searching for event:', error)

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
        error: 'Failed to search for event',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
