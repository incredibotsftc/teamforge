import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Note: No rate limiting for cache population since:
  // 1. It requires authentication
  // 2. It's a legitimate admin operation
  // 3. It needs to make many sequential requests to complete

  try {
    const { season, page = 1 } = await request.json()

    if (!season) {
      return NextResponse.json(
        { error: 'Season parameter is required' },
        { status: 400 }
      )
    }

    // Get auth header and create authenticated client
    // RLS policies require authenticated users for insert/update
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createClient(
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

    // Fetch a single page of teams from FTC API (fast!)
    const FTC_API_BASE_URL = 'https://ftc-api.firstinspires.org/v2.0'
    const username = process.env.FTC_API_USERNAME
    const apiKey = process.env.FTC_API_KEY

    if (!username || !apiKey) {
      return NextResponse.json(
        { error: 'FTC API credentials not configured' },
        { status: 500 }
      )
    }

    const credentials = Buffer.from(`${username.trim()}:${apiKey.trim()}`).toString('base64')

    // Request maximum page size (500 teams per page to reduce total pages)
    const response = await fetch(`${FTC_API_BASE_URL}/${season}/teams?page=${page}&pageSize=500`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`FTC API request failed: ${response.status}`)
    }

    interface FTCTeamResponse {
      teamNumber: number
      nameFull?: string
      nameShort?: string
      schoolName?: string
      city?: string
      stateProv?: string
      country?: string
      rookieYear?: number
      website?: string
      robotName?: string
      districtCode?: string
      homeCMP?: string
    }

    const data = await response.json()
    const teams = data.teams || []
    const pageTotal = data.pageTotal || 1
    const pageCurrent = data.pageCurrent || page

    // Log what the API is actually returning
    console.log(`[populate-cache] FTC API returned: ${teams.length} teams, page ${pageCurrent}/${pageTotal}`)

    // Prepare teams for upsert
    const teamsToCache = teams.map((team: FTCTeamResponse) => ({
      team_number: team.teamNumber,
      season: season,
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

    // Upsert this page's teams
    const { error } = await supabase
      .from('ftc_teams_cache')
      .upsert(teamsToCache, {
        onConflict: 'team_number,season',
        ignoreDuplicates: false
      })

    if (error) {
      console.error(`Error caching page ${page}:`, error)
      return NextResponse.json(
        { error: 'Failed to cache teams', details: error.message },
        { status: 500 }
      )
    }

    // Get total cached count
    const { count } = await supabase
      .from('ftc_teams_cache')
      .select('*', { count: 'exact', head: true })
      .eq('season', season)

    return NextResponse.json({
      success: true,
      page: pageCurrent,
      pageTotal: pageTotal,
      teamsInPage: teams.length,
      totalCached: count,
      hasMore: pageCurrent < pageTotal,
      message: `Cached page ${pageCurrent} of ${pageTotal} (${teams.length} teams)`
    })

  } catch (error) {
    console.error('Error populating cache:', error)
    return NextResponse.json(
      {
        error: 'Failed to populate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
