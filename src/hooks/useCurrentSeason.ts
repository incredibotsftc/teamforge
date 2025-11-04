'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Season {
  id: string
  name: string
  start_year: number
  end_year: number
  is_current_season: boolean
}

interface UseCurrentSeasonReturn {
  currentSeason: Season | null
  loading: boolean
  error: string | null
}

export function useCurrentSeason(): UseCurrentSeasonReturn {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCurrentSeason = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: seasonError } = await supabase
          .from('seasons')
          .select('*')
          .eq('is_current_season', true)
          .single()

        if (seasonError) {
          // If no current season found, return null - no defaults
          if (seasonError.code === 'PGRST116') {
            setCurrentSeason(null)
          } else {
            throw seasonError
          }
        } else {
          setCurrentSeason(data)
        }
      } catch (err) {
        console.error('Error fetching current season:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch current season')
        // No fallback - return null if error
        setCurrentSeason(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentSeason()
  }, [])

  return {
    currentSeason,
    loading,
    error
  }
}

// Helper function to format season display
export function formatSeasonDisplay(season: Season | null): string {
  if (!season) return 'Loading...'
  const yearDisplay = `${season.start_year}-${season.end_year.toString().slice(-2)}`
  return `${season.name} (${yearDisplay})`
}
