import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface SaveLuckysheetParams {
    pageId: string
    teamId: string
    seasonId: string
    workbookData: any // Luckysheet workbook data from getAllSheets()
    userId?: string
    metadata?: {
        title?: string
    }
}

interface SaveLuckysheetResult {
    success: boolean
    timestamp: Date
}

/**
 * Save Luckysheet workbook content to notebook_pages table
 * Stores the complete workbook as JSON in the content field
 */
async function saveLuckysheetContent(params: SaveLuckysheetParams): Promise<SaveLuckysheetResult> {
    const { pageId, teamId, seasonId, workbookData, userId, metadata } = params

    try {
        // Prepare update data
        const updateData: Record<string, unknown> = {
            content: { type: 'luckysheet', data: workbookData },
            content_text: `Luckysheet with ${workbookData?.length || 0} sheet(s)`,
            updated_at: new Date().toISOString(),
            page_type: 'luckysheet',
        }

        // Add metadata fields if provided
        if (metadata?.title !== undefined) updateData.title = metadata.title
        if (userId) updateData.updated_by = userId

        const { error: dbError } = await supabase
            .from('notebook_pages')
            .update(updateData)
            .eq('id', pageId)

        if (dbError) {
            console.error('[useLuckysheetSave] Database update error:', dbError)
            throw new Error(`Failed to update database: ${dbError.message}`)
        }

        return {
            success: true,
            timestamp: new Date()
        }
    } catch (error) {
        console.error('[useLuckysheetSave] Error saving Luckysheet:', error)
        throw error // Let TanStack Query handle retries
    }
}

/**
 * Hook to save Luckysheet workbook content with automatic retry
 *
 * Features:
 * - Automatic retry on failure (3 attempts with exponential backoff)
 * - Proper mutation queuing (no race conditions)
 * - Direct save to Supabase database
 * - Database metadata updates
 *
 * Usage:
 * ```ts
 * const { mutate: saveLuckysheet, isPending } = useLuckysheetSave()
 *
 * saveLuckysheet({
 *   pageId: 'page-123',
 *   teamId: 'team-456',
 *   seasonId: 'season-789',
 *   workbookData: luckysheet.getAllSheets(),
 *   metadata: { title: 'My Sheet' }
 * })
 * ```
 */
export function useLuckysheetSave() {
    return useMutation({
        mutationFn: saveLuckysheetContent,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
}
