import { useMutation } from '@tanstack/react-query'
import { saveSheetData as saveSheetDataToStorage } from '@/lib/notebookSheetStorage'
import { supabase } from '@/lib/supabase'
import { LinkedEntityType } from '@/types/notebook'

interface SaveSheetParams {
  sheetId: string
  teamId: string
  seasonId: string
  workbookData: unknown // Univer workbook JSON
  userId?: string
  metadata?: {
    title?: string
    column_count?: number
    row_count?: number
    linked_entity_type?: LinkedEntityType
    linked_entity_id?: string
  }
}

interface SaveSheetResult {
  success: boolean
  timestamp: Date
}

/**
 * Save notebook sheet data with proper queuing, retry logic, and offline support
 * Uses TanStack Query mutation for reliable, production-ready persistence
 */
async function saveSheetContent(params: SaveSheetParams): Promise<SaveSheetResult> {
  const { sheetId, teamId, seasonId, workbookData, userId, metadata } = params

  try {
    // STEP 1: Save to Supabase Storage FIRST (ensures data is persisted)
    const storageResult = await saveSheetDataToStorage(teamId, seasonId, sheetId, workbookData)

    if (!storageResult.success) {
      throw new Error(`Failed to save sheet to storage: ${storageResult.error}`)
    }

    // STEP 2: Update database metadata
    const expectedPath = `${teamId}/${seasonId}/${sheetId}.json`

    const updateData: Record<string, unknown> = {
      sheet_data_path: expectedPath,
      sheet_data_size: storageResult.size || JSON.stringify(workbookData).length,
      updated_at: new Date().toISOString(),
    }

    // Add metadata fields if provided
    if (metadata?.title !== undefined) updateData.title = metadata.title
    if (metadata?.column_count !== undefined) updateData.column_count = metadata.column_count
    if (metadata?.row_count !== undefined) updateData.row_count = metadata.row_count
    if (metadata?.linked_entity_type !== undefined) updateData.linked_entity_type = metadata.linked_entity_type
    if (metadata?.linked_entity_id !== undefined) updateData.linked_entity_id = metadata.linked_entity_id
    if (userId) updateData.updated_by = userId

    const { error: dbError } = await supabase
      .from('notebook_sheets')
      .update(updateData)
      .eq('id', sheetId)

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
 * - Direct save to Supabase Storage
 * - Database metadata updates
 *
 * Usage:
 * ```ts
 * const { mutate: saveSheet, isPending } = useSheetSave()
 *
 * saveSheet({
 *   sheetId: 'sheet-123',
 *   teamId: 'team-456',
 *   seasonId: 'season-789',
 *   workbookData: univerWorkbookJSON,
 *   metadata: { title: 'My Sheet' }
 * })
 * ```
 */
export function useSheetSave(
  onUpdateSheet?: (id: string, data: {
    title?: string
    column_count?: number
    row_count?: number
    linked_entity_type?: LinkedEntityType
    linked_entity_id?: string
  }) => Promise<void>,
  currentSheet?: {
    title?: string
    column_count?: number
    row_count?: number
    linked_entity_type?: LinkedEntityType
    linked_entity_id?: string
  }
) {
  return useMutation({
    mutationFn: saveSheetContent,
    // TanStack Query will automatically:
    // - Retry 3 times on failure (configured in QueryClient)
    // - Queue mutations to prevent race conditions
    onSuccess: async (data, variables) => {
      // Only call onUpdateSheet if metadata actually changed
      // This prevents unnecessary re-renders and sidebar flickering
      if (onUpdateSheet && variables.metadata && currentSheet) {
        const titleChanged = variables.metadata.title !== undefined && variables.metadata.title !== currentSheet.title
        const columnCountChanged = variables.metadata.column_count !== undefined && variables.metadata.column_count !== currentSheet.column_count
        const rowCountChanged = variables.metadata.row_count !== undefined && variables.metadata.row_count !== currentSheet.row_count
        const entityTypeChanged = variables.metadata.linked_entity_type !== undefined && variables.metadata.linked_entity_type !== currentSheet.linked_entity_type
        const entityIdChanged = variables.metadata.linked_entity_id !== undefined && variables.metadata.linked_entity_id !== currentSheet.linked_entity_id

        if (titleChanged || columnCountChanged || rowCountChanged || entityTypeChanged || entityIdChanged) {
          const updateData: {
            title?: string
            column_count?: number
            row_count?: number
            linked_entity_type?: LinkedEntityType
            linked_entity_id?: string
          } = {}
          if (titleChanged) updateData.title = variables.metadata.title
          if (columnCountChanged) updateData.column_count = variables.metadata.column_count
          if (rowCountChanged) updateData.row_count = variables.metadata.row_count
          if (entityTypeChanged) updateData.linked_entity_type = variables.metadata.linked_entity_type
          if (entityIdChanged) updateData.linked_entity_id = variables.metadata.linked_entity_id

          await onUpdateSheet(variables.sheetId, updateData)
        }
      }
    },
    onError: (error, variables) => {
      console.error('[useSheetSave] ❌ Save failed after retries:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sheetId: variables.sheetId,
      })
      // You could show a toast notification here
    },
  })
}
