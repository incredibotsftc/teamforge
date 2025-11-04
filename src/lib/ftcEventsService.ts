/**
 * FTC Events API Service
 *
 * Provides methods to interact with the official FIRST Tech Challenge Events API
 * API Documentation: https://ftc-events.firstinspires.org/api-docs
 *
 * Authentication: HTTP Basic Auth
 * Required environment variables:
 * - FTC_API_USERNAME: Your FTC API username
 * - FTC_API_KEY: Your FTC API authorization key
 */

const FTC_API_BASE_URL = 'https://ftc-api.firstinspires.org/v2.0'

// Simple in-memory cache for teams (valid for 1 hour)
let teamsCache: { data: FTCTeam[]; timestamp: number } | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

interface FTCEvent {
  eventId: string
  code: string
  divisionCode: string | null
  name: string
  remote: boolean
  hybrid: boolean
  fieldCount: number
  published: boolean
  type: string
  typeName: string
  regionCode: string
  leagueCode: string | null
  districtCode: string | null
  venue: string
  address: string
  city: string
  stateprov: string
  country: string
  website: string | null
  liveStreamUrl: string | null
  coordinates: {
    lat: number
    lon: number
  } | null
  timezone: string
  dateStart: string
  dateEnd: string
  teamCount: number
}

export interface FTCMatch {
  eventCode: string
  tournamentLevel: string
  series: number
  matchNumber: number
  startTime: string
  actualStartTime: string | null
  postResultTime: string | null
  scoreRedFinal: number | null
  scoreRedAuto: number | null
  scoreRedTeleop: number | null
  scoreRedEndgame: number | null
  scoreBlueFinal: number | null
  scoreBlueAuto: number | null
  scoreBlueTeleop: number | null
  scoreBlueEndgame: number | null
  teams?: Array<{
    teamNumber: number
    station: string
    dq: boolean
    onField: boolean
  }>
}

export interface FTCTeam {
  teamNumber: number
  nameFull: string
  nameShort: string
  schoolName: string
  city: string
  stateProv: string
  country: string
  rookieYear: number
  website: string | null
  robotName: string | null
  districtCode: string | null
  homeCMP: string | null
}

/**
 * Create HTTP Basic Auth header for FTC Events API
 */
function getAuthHeader(): string {
  const username = process.env.FTC_API_USERNAME
  const apiKey = process.env.FTC_API_KEY

  if (!username || !apiKey) {
    console.error('Missing credentials:', {
      hasUsername: !!username,
      hasApiKey: !!apiKey
    })
    throw new Error('FTC API credentials not configured. Set FTC_API_USERNAME and FTC_API_KEY in environment variables.')
  }

  // Trim any whitespace from credentials
  const cleanUsername = username.trim()
  const cleanApiKey = apiKey.trim()

  // Create Base64 encoded credentials for HTTP Basic Auth
  const credentials = Buffer.from(`${cleanUsername}:${cleanApiKey}`).toString('base64')
  return `Basic ${credentials}`
}

/**
 * Make authenticated request to FTC Events API
 */
async function ftcApiFetch<T>(endpoint: string): Promise<T> {
  const url = `${FTC_API_BASE_URL}${endpoint}`

  try {
    const authHeader = getAuthHeader()
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('FTC API authentication failed. Check your FTC_API_USERNAME and FTC_API_KEY.')
      }
      throw new Error(`FTC API request failed: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('FTC API returned non-JSON response. The endpoint may be incorrect.')
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while fetching from FTC API')
  }
}

export interface FTCRanking {
  rank: number
  teamNumber: number
  team: {
    teamNumber: number
    nameFull: string
    nameShort: string
  }
  wins: number
  losses: number
  ties: number
  qualifyingPoints?: number
  rankingPoints?: number
  sortOrder1?: number  // Ranking Points (RP)
  sortOrder2?: number  // Tie Breaker Points (TBP)
  sortOrder3?: number  // Highest score
  sortOrder4?: number  // Second highest score
  qualAverage?: number
  tieBreaker1?: number
  tieBreaker2?: number
  tieBreaker3?: number
  matchesPlayed: number
  matchesCounted: number
}

interface FTCAward {
  awardId: number
  eventCode: string
  teamNumber: number | null
  personName: string | null
  name: string
  series: number
}

export const ftcEventsService = {
  /**
   * Get the current FTC season year
   * Returns the year of the current competition season
   */
  async getCurrentSeason(): Promise<string> {
    // Hardcoded to 2024 season
    return '2024'
  },

  /**
   * Get all events for a specific season
   */
  async getEventsForSeason(season: number): Promise<FTCEvent[]> {
    const response = await ftcApiFetch<{ events: FTCEvent[] }>(`/${season}/events`)
    return response.events || []
  },

  /**
   * Search for events by event code (partial match supported, min 3 chars)
   */
  async searchEventsByCode(season: number, eventCode: string): Promise<FTCEvent[]> {
    if (eventCode.length < 3) {
      throw new Error('Event code must be at least 3 characters')
    }

    // Get all events for the season and filter by event code
    const allEvents = await this.getEventsForSeason(season)
    const searchTerm = eventCode.toUpperCase()

    return allEvents.filter(event =>
      event.code.toUpperCase().includes(searchTerm)
    )
  },

  /**
   * Get upcoming events (events that haven't ended yet)
   */
  async getUpcomingEvents(): Promise<FTCEvent[]> {
    const season = await this.getCurrentSeason()
    const allEvents = await this.getEventsForSeason(parseInt(season))
    const now = new Date()

    return allEvents.filter(event => new Date(event.dateEnd) >= now)
  },

  /**
   * Get details for a specific event
   */
  async getEvent(season: number, eventCode: string): Promise<FTCEvent> {
    const response = await ftcApiFetch<FTCEvent>(`/${season}/events/${eventCode}`)
    return response
  },

  /**
   * Get all teams attending a specific event
   */
  async getEventTeams(season: number, eventCode: string): Promise<FTCTeam[]> {
    const response = await ftcApiFetch<{ teams: FTCTeam[] }>(`/${season}/teams?eventCode=${encodeURIComponent(eventCode)}`)
    return response.teams || []
  },

  /**
   * Check if a team is participating in a specific event
   */
  async checkTeamParticipation(eventCode: string, teamNumber: number): Promise<boolean> {
    const season = await this.getCurrentSeason()
    try {
      const teams = await this.getEventTeams(parseInt(season), eventCode)
      return teams.some(team => team.teamNumber === teamNumber)
    } catch {
      return false
    }
  },

  /**
   * Get all matches for a specific event
   */
  async getEventMatches(season: number, eventCode: string): Promise<FTCMatch[]> {
    const response = await ftcApiFetch<{ matches: FTCMatch[] }>(`/${season}/matches/${eventCode}`)
    return response.matches || []
  },

  /**
   * Get matches for a specific team at an event
   */
  async getEventMatchesByTeam(season: number, eventCode: string, teamNumber: number): Promise<FTCMatch[]> {
    const response = await ftcApiFetch<{ matches: FTCMatch[] }>(`/${season}/matches/${eventCode}?teamNumber=${teamNumber}`)
    return response.matches || []
  },

  /**
   * Get event rankings
   */
  async getEventRankings(season: number, eventCode: string): Promise<FTCRanking[]> {
    const response = await ftcApiFetch<{ rankings: FTCRanking[] }>(`/${season}/rankings/${eventCode}`)
    return response.rankings || []
  },

  /**
   * Get awards for a specific event
   */
  async getEventAwards(season: number, eventCode: string, teamNumber?: number): Promise<FTCAward[]> {
    let endpoint = `/${season}/awards/${eventCode}`

    if (teamNumber) {
      endpoint += `/team/${teamNumber}`
    }

    const response = await ftcApiFetch<{ awards: FTCAward[] }>(endpoint)
    return response.awards || []
  },

  /**
   * Get details for a specific team
   */
  async getTeam(season: number, teamNumber: number): Promise<FTCTeam> {
    const response = await ftcApiFetch<FTCTeam>(`/${season}/teams/${teamNumber}`)
    return response
  },

  /**
   * Get team info (alias for getTeam using current season)
   */
  async getTeamInfo(teamNumber: number): Promise<FTCTeam> {
    const season = await this.getCurrentSeason()
    return this.getTeam(parseInt(season), teamNumber)
  },

  /**
   * Get events a specific team is attending
   */
  async getTeamEvents(season: number, teamNumber: number): Promise<FTCEvent[]> {
    const response = await ftcApiFetch<{ events: FTCEvent[] }>(`/${season}/events?teamNumber=${teamNumber}`)
    return response.events || []
  },

  /**
   * Get team event history (alias for getTeamEvents)
   */
  async getTeamEventHistory(teamNumber: number): Promise<FTCEvent[]> {
    const season = await this.getCurrentSeason()
    return this.getTeamEvents(parseInt(season), teamNumber)
  },

  /**
   * Get all teams for a season (with caching)
   * Fetches all pages of teams and caches the result for 1 hour
   */
  async getAllTeams(season: number): Promise<FTCTeam[]> {
    // Check if we have valid cached data
    if (teamsCache && (Date.now() - teamsCache.timestamp) < CACHE_DURATION) {
      return teamsCache.data
    }

    const allTeams: FTCTeam[] = []
    let page = 1
    let hasMorePages = true

    while (hasMorePages) {
      try {
        const response = await ftcApiFetch<{ teams: FTCTeam[]; pageTotal: number; pageCurrent: number }>(`/${season}/teams?page=${page}`)

        if (response.teams && response.teams.length > 0) {
          allTeams.push(...response.teams)

          // Check if there are more pages
          if (response.pageCurrent && response.pageTotal && response.pageCurrent < response.pageTotal) {
            page++
          } else {
            hasMorePages = false
          }
        } else {
          hasMorePages = false
        }
      } catch (error) {
        console.error(`Error fetching teams page ${page}:`, error)
        hasMorePages = false
      }
    }

    // Cache the results
    teamsCache = {
      data: allTeams,
      timestamp: Date.now()
    }

    return allTeams
  },

  /**
   * Search teams by name (uses cached team list)
   */
  async searchTeamsByName(season: number, searchTerm: string): Promise<FTCTeam[]> {
    const allTeams = await this.getAllTeams(season)
    const searchLower = searchTerm.toLowerCase()

    return allTeams.filter(team => {
      const nameFullMatch = team.nameFull?.toLowerCase().includes(searchLower)
      const nameShortMatch = team.nameShort?.toLowerCase().includes(searchLower)
      const schoolMatch = team.schoolName?.toLowerCase().includes(searchLower)
      const robotNameMatch = team.robotName?.toLowerCase().includes(searchLower)

      return nameFullMatch || nameShortMatch || schoolMatch || robotNameMatch
    })
  }
}
