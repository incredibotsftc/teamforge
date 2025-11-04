'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface TeamData {
  id: string
  team_number: number
  team_name: string
  school_name: string | null
  state: string | null
  country: string | null
  logo_url: string | null
  created_at: string
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
  discord_user_id?: string
  discord_username?: string
}

interface SeasonData {
  id: string
  name: string
  start_year: number
  end_year: number
  is_current_season: boolean
}

interface AppDataContextType {
  team: TeamData | null
  teamMembers: TeamMember[]
  currentSeason: SeasonData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextType>({
  team: null,
  teamMembers: [],
  currentSeason: null,
  loading: true,
  error: null,
  refetch: async () => {}
})

export const useAppData = () => {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider')
  }
  return context
}

interface AppDataProviderProps {
  children: React.ReactNode
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [currentSeason, setCurrentSeason] = useState<SeasonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppData = async () => {
    if (!user) {
      setTeam(null)
      setTeamMembers([])
      setCurrentSeason(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [teamMembershipResult, seasonResult] = await Promise.all([
        // Get user's team membership
        supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single(),
        
        // Get current season
        supabase
          .from('seasons')
          .select('*')
          .eq('is_current_season', true)
          .maybeSingle()
      ])

      // Handle season data
      if (!seasonResult.error && seasonResult.data) {
        setCurrentSeason(seasonResult.data)
      }

      // Handle team data
      if (teamMembershipResult.error || !teamMembershipResult.data) {
        throw new Error('User is not a member of any team')
      }

      const teamId = teamMembershipResult.data.team_id

      // Fetch team details and team members in parallel
      // Fetch team members with Discord fields
      
      const [teamResult, membersResult] = await Promise.all([
        supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single(),
        
        supabase
          .from('team_members')
          .select('id, first_name, last_name, email, role, is_active, discord_user_id, discord_username')
          .eq('team_id', teamId)
          .eq('is_active', true)
          .order('role', { ascending: true })
          .order('first_name', { ascending: true })
      ]);


      if (teamResult.error) {
        console.error('❌ Team fetch error:', teamResult.error);
        throw new Error(`Failed to fetch team details: ${teamResult.error.message}`)
      }

      if (membersResult.error) {
        console.error('❌ Members fetch error:', membersResult.error);
        throw new Error(`Failed to fetch team members: ${membersResult.error.message}`)
      }

      setTeam(teamResult.data)
      setTeamMembers(membersResult.data || [])

    } catch (err) {
      console.error('❌ Error fetching app data:', err)
      if (err instanceof Error && err.message.includes('invalid authentication token')) {
        console.error('🔒 Authentication token error - user may need to sign in again')
        setError('Authentication expired. Please sign in again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch app data')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <AppDataContext.Provider value={{
      team,
      teamMembers,
      currentSeason,
      loading,
      error,
      refetch: fetchAppData
    }}>
      {children}
    </AppDataContext.Provider>
  )
}
