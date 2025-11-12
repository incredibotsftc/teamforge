import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamNumbers, season } = body

    if (!Array.isArray(teamNumbers) || teamNumbers.length === 0) {
      return NextResponse.json(
        { error: 'teamNumbers must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!season) {
      return NextResponse.json(
        { error: 'season is required' },
        { status: 400 }
      )
    }

    // Fetch teams from cache
    const { data: cachedTeams, error: cacheError } = await supabase
      .from('ftc_teams_cache')
      .select('*')
      .eq('season', season)
      .in('team_number', teamNumbers)

    if (cacheError) {
      console.error('Error fetching teams from cache:', cacheError)
      return NextResponse.json(
        { error: 'Failed to fetch teams from cache' },
        { status: 500 }
      )
    }

    // Transform to the expected format
    const teams = (cachedTeams || []).map((team: CachedTeam) => ({
      teamNumber: team.team_number,
      nameFull: team.name_full,
      nameShort: team.name_short || team.name_full || `Team ${team.team_number}`,
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
      teams,
      fromCache: true
    })

  } catch (error) {
    console.error('Error in bulk team fetch:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch teams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
