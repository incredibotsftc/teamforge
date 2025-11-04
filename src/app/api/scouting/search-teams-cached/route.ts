import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ftcEventsService, FTCTeam } from '@/lib/ftcEventsService'
import { rateLimit, RateLimitPresets } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'

interface CachedTeam {
  team_number: number
  season: number
  name_full: string
  name_short: string | null
  school_name: string | null
  city: string | null
  state_prov: string | null
  country: string | null
  rookie_year: number | null
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
    const seasonParam = searchParams.get('season')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const season = seasonParam ? parseInt(seasonParam) : parseInt(await ftcEventsService.getCurrentSeason())
    const searchTerm = query.trim().toLowerCase()

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

    // Check if it's a team number search
    const teamNumber = parseInt(searchTerm)
    const isNumberSearch = !isNaN(teamNumber) && teamNumber > 0

    // First, try to search in the cache
    let cacheQuery = supabase
      .from('ftc_teams_cache')
      .select('*')
      .eq('season', season)

    if (isNumberSearch) {
      // For number searches, search by team number
      cacheQuery = cacheQuery.eq('team_number', teamNumber)
    } else {
      // For name searches, use text search
      cacheQuery = cacheQuery.or(`name_full.ilike.%${searchTerm}%,name_short.ilike.%${searchTerm}%,school_name.ilike.%${searchTerm}%`)
    }

    const { data: cachedTeams, error: cacheError } = await cacheQuery.limit(10)

    if (cacheError) {
      console.error('Cache query error:', cacheError)
      // Continue to FTC API if cache fails
    }

    // If we have cached results, return them
    if (cachedTeams && cachedTeams.length > 0) {
      const transformedTeams = cachedTeams.map((team: CachedTeam) => ({
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
        matches: transformedTeams,
        fromCache: true
      })
    }

    // If no cached results, fetch from FTC API
    const allTeams = await ftcEventsService.getAllTeams(season)

    // Search through the teams
    const searchLower = searchTerm.toLowerCase()
    const matches = allTeams.filter(team => {
      const nameFullMatch = team.nameFull?.toLowerCase().includes(searchLower)
      const nameShortMatch = team.nameShort?.toLowerCase().includes(searchLower)
      const schoolMatch = team.schoolName?.toLowerCase().includes(searchLower)
      const robotNameMatch = team.robotName?.toLowerCase().includes(searchLower)
      return nameFullMatch || nameShortMatch || schoolMatch || robotNameMatch
    }).slice(0, 10)

    // Update cache in the background (don't await) if user is authenticated
    if (authClient) {
      updateCacheInBackground(season, allTeams, authClient).catch(err => {
        console.error('Background cache update failed:', err)
      })
    }

    return NextResponse.json({
      success: true,
      matches,
      fromCache: false
    })

  } catch (error) {
    console.error('Error in cached team search:', error)
    return NextResponse.json(
      {
        error: 'Failed to search teams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Background function to update cache
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateCacheInBackground(season: number, teams: FTCTeam[], authClient: SupabaseClient<any, any, any>) {
  try {
    // Prepare teams for upsert
    const teamsToCache = teams.map(team => ({
      team_number: team.teamNumber,
      season: season,
      // Use nameShort as fallback if nameFull is null/empty
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

    // Upsert teams in batches of 500
    const batchSize = 500
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < teamsToCache.length; i += batchSize) {
      const batch = teamsToCache.slice(i, i + batchSize)

      const { error } = await authClient
        .from('ftc_teams_cache')
        .upsert(batch, {
          onConflict: 'team_number,season',
          ignoreDuplicates: false
        })

      if (error) {
        errorCount++
        console.error(`[updateCacheInBackground] Error in batch ${Math.floor(i / batchSize) + 1}:`, error)
        console.error(`[updateCacheInBackground] Error details:`, JSON.stringify(error, null, 2))
      } else {
        successCount++
      }
    }

    // Log final counts
    if (errorCount > 0 || successCount > 0) {
      console.error(`[updateCacheInBackground] Completed: ${successCount} successful batches, ${errorCount} failed batches`)
    }
  } catch (error) {
    console.error('[updateCacheInBackground] Fatal error updating cache:', error)
    if (error instanceof Error) {
      console.error('[updateCacheInBackground] Error stack:', error.stack)
    }
    // Don't throw - this is a background operation
  }
}
