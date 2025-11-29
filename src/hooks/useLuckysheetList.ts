import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'

export interface LuckysheetPage {
    id: string
    title: string
    created_at: string
    updated_at: string
    content?: {
        type: string
        data: any
    }
}

/**
 * Fetch all Luckysheet pages for the current team and season
 */
async function fetchLuckysheetPages(teamId: string, seasonId: string): Promise<LuckysheetPage[]> {
    const { data, error } = await supabase
        .from('notebook_pages')
        .select('id, title, created_at, updated_at, content')
        .eq('team_id', teamId)
        .eq('season_id', seasonId)
        .eq('page_type', 'luckysheet')
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('[useLuckysheetList] Error fetching pages:', error)
        throw new Error(`Failed to fetch Luckysheet pages: ${error.message}`)
    }

    return data || []
}

/**
 * Hook to fetch all Luckysheet pages for the current team and season
 *
 * Features:
 * - Automatically refetches on window focus
 * - Caches results with TanStack Query
 * - Returns loading/error states
 *
 * Usage:
 * ```ts
 * const { data: sheets, isLoading, error } = useLuckysheetList()
 * ```
 */
export function useLuckysheetList() {
    const { user } = useAuth()
    const { team, currentSeason } = useAppData()

    return useQuery({
        queryKey: ['luckysheet-pages', team?.id, currentSeason?.id],
        queryFn: () => fetchLuckysheetPages(team!.id, currentSeason!.id),
        enabled: !!team && !!currentSeason && !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    })
}
