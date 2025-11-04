import { NextRequest, NextResponse } from 'next/server'
import { ftcEventsService } from '@/lib/ftcEventsService'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, RateLimitPresets } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'

interface CachedTeam {
  team_number: number
  name_full: string
  name_short: string | null
  school_name: string | null
  city: string
  state_prov: string
  country: string
  rookie_year: number
  website: string | null
  robot_name: string | null
  district_code: string | null
  home_cmp: string | null
}

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
    const type = searchParams.get('type') // 'team' or 'event'
    const seasonParam = searchParams.get('season')

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (!type || (type !== 'team' && type !== 'event')) {
      return NextResponse.json(
        { error: 'Type must be either "team" or "event"' },
        { status: 400 }
      )
    }

    // Use provided season or fall back to current season
    const season = seasonParam || await ftcEventsService.getCurrentSeason()
    const searchTerm = query.toLowerCase().trim()

    // Create authenticated client for cache writes (if user is authenticated)
    const authHeader = request.headers.get('authorization')
    const authClient = authHeader
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: authHeader
              }
            }
          }
        )
      : null

    if (type === 'team') {
      try {
        // Check if it's a team number
        const teamNumber = parseInt(query)
        if (!isNaN(teamNumber) && teamNumber > 0) {
          // Query cache directly for team number
          const { data: cachedTeam, error: cacheError } = await supabase
            .from('ftc_teams_cache')
            .select('*')
            .eq('team_number', teamNumber)
            .eq('season', parseInt(season))
            .single()

          if (cachedTeam && !cacheError) {
            return NextResponse.json({
              success: true,
              type: 'team',
              matches: [{
                teamNumber: cachedTeam.team_number,
                nameFull: cachedTeam.name_full,
                nameShort: cachedTeam.name_short || '',
                schoolName: cachedTeam.school_name || '',
                city: cachedTeam.city || '',
                stateProv: cachedTeam.state_prov || '',
                country: cachedTeam.country || '',
                rookieYear: cachedTeam.rookie_year || 0,
                website: cachedTeam.website,
                robotName: cachedTeam.robot_name,
                districtCode: cachedTeam.district_code,
                homeCMP: cachedTeam.home_cmp
              }],
              exactMatch: true,
              fromCache: true
            })
          }

          // Cache miss - fetch from FTC API
          const allTeams = await ftcEventsService.getAllTeams(parseInt(season))
          const matchingTeam = allTeams.find(team => team.teamNumber === teamNumber)

          // Cache ALL teams in background (fire and forget) if user is authenticated
          if (authClient) {
            void (async () => {
              try {
                const teamsToCache = allTeams.map(team => ({
                  team_number: team.teamNumber,
                  season: parseInt(season),
                  name_full: team.nameFull || team.nameShort || `Team ${team.teamNumber}`,
                  name_short: team.nameShort,
                  school_name: team.schoolName,
                  city: team.city,
                  state_prov: team.stateProv,
                  country: team.country,
                  rookie_year: team.rookieYear,
                  website: team.website,
                  robot_name: team.robotName,
                  district_code: team.districtCode,
                  home_cmp: team.homeCMP,
                  last_updated: new Date().toISOString()
                }))

                await authClient
                  .from('ftc_teams_cache')
                  .upsert(teamsToCache, {
                    onConflict: 'team_number,season',
                    ignoreDuplicates: false
                  })
              } catch (err) {
                console.error('[/api/scouting/search] Cache update error:', err)
              }
            })()
          }

          if (matchingTeam) {
            return NextResponse.json({
              success: true,
              type: 'team',
              matches: [matchingTeam],
              exactMatch: true,
              fromCache: false
            })
          } else {
            return NextResponse.json({
              success: true,
              type: 'team',
              matches: [],
              exactMatch: false
            })
          }
        }

        // For name searches, query cache directly
        // Query cache with text search
        const { data: cachedTeams, error: cacheError } = await supabase
          .from('ftc_teams_cache')
          .select('*')
          .eq('season', parseInt(season))
          .or(`name_full.ilike.%${searchTerm}%,name_short.ilike.%${searchTerm}%,school_name.ilike.%${searchTerm}%`)
          .limit(10)

        if (cachedTeams && cachedTeams.length > 0 && !cacheError) {
          const matches = cachedTeams.map((team: CachedTeam) => ({
            teamNumber: team.team_number,
            nameFull: team.name_full,
            nameShort: team.name_short || '',
            schoolName: team.school_name || '',
            city: team.city || '',
            stateProv: team.state_prov || '',
            country: team.country || '',
            rookieYear: team.rookie_year || 0,
            website: team.website,
            robotName: team.robot_name,
            districtCode: team.district_code,
            homeCMP: team.home_cmp
          }))

          return NextResponse.json({
            success: true,
            type: 'team',
            matches,
            exactMatch: matches.length === 1,
            fromCache: true
          })
        }

        // Cache miss - fetch ALL teams from FTC API and filter locally
        const allTeams = await ftcEventsService.getAllTeams(parseInt(season))

        // Filter teams locally by name
        const teams = allTeams.filter(team => {
          const nameFullMatch = team.nameFull?.toLowerCase().includes(searchTerm)
          const nameShortMatch = team.nameShort?.toLowerCase().includes(searchTerm)
          const schoolMatch = team.schoolName?.toLowerCase().includes(searchTerm)
          const robotNameMatch = team.robotName?.toLowerCase().includes(searchTerm)
          return nameFullMatch || nameShortMatch || schoolMatch || robotNameMatch
        }).slice(0, 10) // Limit to 10 results

        // Cache ALL teams in background (fire and forget) if user is authenticated
        if (authClient) {
          void (async () => {
            try {
              const teamsToCache = allTeams.map(team => ({
                team_number: team.teamNumber,
                season: parseInt(season),
                name_full: team.nameFull || team.nameShort || `Team ${team.teamNumber}`,
                name_short: team.nameShort,
                school_name: team.schoolName,
                city: team.city,
                state_prov: team.stateProv,
                country: team.country,
                rookie_year: team.rookieYear,
                website: team.website,
                robot_name: team.robotName,
                district_code: team.districtCode,
                home_cmp: team.homeCMP,
                last_updated: new Date().toISOString()
              }))

              await authClient
                .from('ftc_teams_cache')
                .upsert(teamsToCache, {
                  onConflict: 'team_number,season',
                  ignoreDuplicates: false
                })
            } catch (err) {
              console.error('[/api/scouting/search] Cache update error:', err)
            }
          })()
        }

        return NextResponse.json({
          success: true,
          type: 'team',
          matches: teams,
          exactMatch: teams.length === 1,
          fromCache: false
        })
      } catch (error) {
        console.error('Error searching teams:', error)
        return NextResponse.json({
          success: false,
          type: 'team',
          matches: [],
          error: 'Failed to search teams. Please try again.'
        })
      }
    }

    if (type === 'event') {
      // Get all events for the season
      const allEvents = await ftcEventsService.getEventsForSeason(parseInt(season))

      // Fuzzy match by event name, code, city, or state
      const searchWords = searchTerm.split(' ').filter(word => word.length > 0)

      const matches = allEvents.filter(event => {
        const eventName = event.name.toLowerCase()
        const eventCode = event.code.toLowerCase()
        const eventCity = event.city.toLowerCase()
        const eventState = event.stateprov.toLowerCase()

        // Check if name or code contains the full search term
        if (eventName.includes(searchTerm) || eventCode.includes(searchTerm)) {
          return true
        }

        // Check if city or state contains the search term
        if (eventCity.includes(searchTerm) || eventState.includes(searchTerm)) {
          return true
        }

        // Check if all search words appear in the name (for multi-word searches)
        if (searchWords.length > 1) {
          const allWordsInName = searchWords.every(word =>
            eventName.includes(word) || eventCity.includes(word) || eventState.includes(word)
          )
          if (allWordsInName) return true
        }

        return false
      })

      // Sort by relevance (exact matches first, then partial matches)
      matches.sort((a, b) => {
        const aExactName = a.name.toLowerCase() === searchTerm
        const bExactName = b.name.toLowerCase() === searchTerm
        const aExactCode = a.code.toLowerCase() === searchTerm
        const bExactCode = b.code.toLowerCase() === searchTerm

        if ((aExactName || aExactCode) && !(bExactName || bExactCode)) return -1
        if (!(aExactName || aExactCode) && (bExactName || bExactCode)) return 1

        return a.name.localeCompare(b.name)
      })

      return NextResponse.json({
        success: true,
        type: 'event',
        matches: matches,
        exactMatch: matches.length === 1
      })
    }

    return NextResponse.json(
      { error: 'Invalid search type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in search:', error)

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
        error: 'Failed to search',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
