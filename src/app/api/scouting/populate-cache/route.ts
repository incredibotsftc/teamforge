import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ftcEventsService } from '@/lib/ftcEventsService'
import { rateLimit, RateLimitPresets } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.STRICT)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many cache population requests. Please try again later.' },
      {
        status: 429,
        headers: rateLimitResult.headers
      }
    )
  }

  try {
    const { season } = await request.json()

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

    // Fetch all teams from FTC API
    const allTeams = await ftcEventsService.getAllTeams(season)

    // Prepare teams for upsert
    const teamsToCache = allTeams.map(team => ({
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

      const { error } = await supabase
        .from('ftc_teams_cache')
        .upsert(batch, {
          onConflict: 'team_number,season',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error)
        errorCount++
      } else {
        successCount++
      }
    }

    // Verify cache
    const { count } = await supabase
      .from('ftc_teams_cache')
      .select('*', { count: 'exact', head: true })
      .eq('season', season)

    return NextResponse.json({
      success: true,
      message: `Cache population completed for season ${season}`,
      stats: {
        totalTeams: allTeams.length,
        successfulBatches: successCount,
        failedBatches: errorCount,
        cachedTeams: count
      }
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
