import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Global state to persist across component remounts
const globalPopulationState = {
  isPopulating: false,
  progress: { current: 0, total: 0, cached: 0 },
  season: 0,
  abortController: null as AbortController | null
}

export function useCachePopulation() {
  const [isPopulating, setIsPopulating] = useState(globalPopulationState.isPopulating)
  const [progress, setProgress] = useState(globalPopulationState.progress)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // Sync with global state on mount
  useEffect(() => {
    isMountedRef.current = true
    setIsPopulating(globalPopulationState.isPopulating)
    setProgress(globalPopulationState.progress)

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const populateCache = useCallback(async (season: number) => {
    // Prevent duplicate population attempts
    if (globalPopulationState.isPopulating && globalPopulationState.season === season) {
      console.log('Cache population already in progress for this season')
      return true
    }

    // Update global state
    globalPopulationState.isPopulating = true
    globalPopulationState.season = season
    globalPopulationState.progress = { current: 0, total: 0, cached: 0 }

    setIsPopulating(true)
    setError(null)
    setProgress({ current: 0, total: 0, cached: 0 })

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      let currentPage = 1
      let hasMore = true

      while (hasMore) {
        const response = await fetch('/api/scouting/populate-cache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ season, page: currentPage })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to populate cache')
        }

        const data = await response.json()

        // Update both local and global state
        const newProgress = {
          current: data.page,
          total: data.pageTotal,
          cached: data.totalCached
        }

        globalPopulationState.progress = newProgress
        if (isMountedRef.current) {
          setProgress(newProgress)
        }

        hasMore = data.hasMore
        currentPage++
      }

      // Clear global state on completion
      globalPopulationState.isPopulating = false
      if (isMountedRef.current) {
        setIsPopulating(false)
      }
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to populate cache'
      globalPopulationState.isPopulating = false
      if (isMountedRef.current) {
        setError(errorMsg)
        setIsPopulating(false)
      }
      return false
    }
  }, [])

  const checkCacheStatus = useCallback(async (season: number): Promise<boolean> => {
    try {
      const { count } = await supabase
        .from('ftc_teams_cache')
        .select('*', { count: 'exact', head: true })
        .eq('season', season)

      // Consider cache populated if we have at least 10,000 teams (full cache is ~14,000)
      // This threshold means we've successfully cached most/all teams for the season
      return (count || 0) >= 10000
    } catch (err) {
      console.error('Error checking cache status:', err)
      return false
    }
  }, [])

  return {
    isPopulating,
    progress,
    error,
    populateCache,
    checkCacheStatus
  }
}
