'use client'

import { useState, useEffect } from 'react'
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
}

interface UseTeamDataReturn {
  team: TeamData | null
  teamMembers: TeamMember[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTeamData(): UseTeamDataReturn {
  const { user } = useAuth()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First, get the user's team membership
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (memberError) {
        throw new Error('Failed to fetch team membership')
      }

      if (!memberData) {
        throw new Error('User is not a member of any team')
      }

      // Get team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', memberData.team_id)
        .single()

      if (teamError) {
        throw new Error('Failed to fetch team details')
      }

      setTeam(teamData)

      // Get all team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('id, first_name, last_name, email, role, is_active')
        .eq('team_id', memberData.team_id)
        .eq('is_active', true)
        .order('role', { ascending: true })
        .order('first_name', { ascending: true })

      if (membersError) {
        throw new Error('Failed to fetch team members')
      }

      setTeamMembers(membersData || [])

    } catch (err) {
      console.error('Error fetching team data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch team data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return {
    team,
    teamMembers,
    loading,
    error,
    refetch: fetchTeamData
  }
}
