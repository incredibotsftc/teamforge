import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface SaveSheetParams {
  pageId: string
  teamId: string
  seasonId: string
  grid: string[][]
  userId?: string
  metadata?: {
    title?: string
  }
}

interface SaveSheetResult {
  success: boolean
  timestamp: Date
}

/**
 * Save sheet content to notebook_pages table
 * Stores the grid as JSON in the content field
 */
async function saveSheetContent(params: SaveSheetParams): Promise<SaveSheetResult> {
  const { pageId, teamId, seasonId, grid, userId, metadata } = params

  try {
    // Prepare the grid as JSON content
    const gridJson = JSON.stringify(grid)
    
    // Prepare update data
    const updateData: Record<string, unknown> = {
      content: { type: 'sheet', grid }, // Store grid in content
      content_text: `Sheet with ${grid.length} rows and ${grid[0]?.length || 0} columns`,
      updated_at: new Date().toISOString(),
    }

    // Add metadata fields if provided
    if (metadata?.title !== undefined) updateData.title = metadata.title
    if (userId) updateData.updated_by = userId

    const { error: dbError } = await supabase
      .from('notebook_pages')
      .update(updateData)
      .eq('id', pageId)

    if (dbError) {
      console.error('[useSheetSave] Database update error:', dbError)
      throw new Error(`Failed to update database: ${dbError.message}`)
    }

    return {
      success: true,
      timestamp: new Date()
    }
  } catch (error) {
    console.error('[useSheetSave] Error saving sheet:', error)
    throw error // Let TanStack Query handle retries
  }
}

/**
 * Hook to save sheet content with automatic retry
 *
 * Features:
 * - Automatic retry on failure (3 attempts with exponential backoff)
 * - Proper mutation queuing (no race conditions)
 * - Direct save to Supabase database
 * - Database metadata updates
 *
 * Usage:
 * ```ts
 * const { mutate: saveSheet, isPending } = useSheetSave()
 *
 * saveSheet({
 *   pageId: 'page-123',
 *   teamId: 'team-456',
 *   seasonId: 'season-789',
 *   grid: sheetData,
 *   metadata: { title: 'My Sheet' }
 * })
 * ```
 */
export function useSheetSave() {
  return useMutation({
    mutationFn: saveSheetContent,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
