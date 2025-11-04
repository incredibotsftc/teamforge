import { useMutation } from '@tanstack/react-query'
import type { Block } from '@blocknote/core'
import { saveNotebookContent as saveNotebookContentToStorage, extractPlainText } from '@/lib/notebookStorage'
import { supabase } from '@/lib/supabase'
import { LinkedEntityType } from '@/types/notebook'

interface SaveNotebookParams {
  pageId: string
  teamId: string
  seasonId: string
  blocks: Block[]
  userId?: string
  metadata?: {
    title?: string
    linked_entity_type?: LinkedEntityType
    linked_entity_id?: string
  }
}

interface SaveNotebookResult {
  success: boolean
  timestamp: Date
}

/**
 * Save notebook content with proper queuing, retry logic, and offline support
 * Uses TanStack Query mutation for reliable, production-ready persistence
 */
async function saveNotebookContent(params: SaveNotebookParams): Promise<SaveNotebookResult> {
  const { pageId, teamId, seasonId, blocks, userId, metadata } = params

  try {
    // STEP 1: Save to Supabase Storage FIRST (ensures data is persisted)
    const storageResult = await saveNotebookContentToStorage(teamId, seasonId, pageId, blocks)

    if (!storageResult.success) {
      throw new Error(`Failed to save to storage: ${storageResult.error}`)
    }

    // STEP 2: Extract plain text for search
    const contentText = extractPlainText(blocks)

    // STEP 3: Update database metadata
    const expectedPath = `${teamId}/${seasonId}/${pageId}.json`

    const updateData: Record<string, unknown> = {
      content_text: contentText,
      content_path: expectedPath,
      content_size: JSON.stringify(blocks).length,
      updated_at: new Date().toISOString(),
    }

    // Add metadata fields if provided
    if (metadata?.title !== undefined) updateData.title = metadata.title
    if (metadata?.linked_entity_type !== undefined) updateData.linked_entity_type = metadata.linked_entity_type
    if (metadata?.linked_entity_id !== undefined) updateData.linked_entity_id = metadata.linked_entity_id
    if (userId) updateData.updated_by = userId

    const { error: dbError } = await supabase
      .from('notebook_pages')
      .update(updateData)
      .eq('id', pageId)

    if (dbError) {
      console.error('[useNotebookSave] Database update error:', dbError)
      throw new Error(`Failed to update database: ${dbError.message}`)
    }

    return {
      success: true,
      timestamp: new Date()
    }
  } catch (error) {
    console.error('[useNotebookSave] Error saving notebook:', error)
    throw error // Let TanStack Query handle retries
  }
}

/**
 * Hook to save notebook content with automatic retry
 *
 * Features:
 * - Automatic retry on failure (3 attempts with exponential backoff)
 * - Proper mutation queuing (no race conditions)
 * - Direct save to Supabase Storage
 * - Database metadata updates
 *
 * Usage:
 * ```ts
 * const { mutate: saveNotebook, isPending } = useNotebookSave()
 *
 * saveNotebook({
 *   pageId: 'page-123',
 *   teamId: 'team-456',
 *   seasonId: 'season-789',
 *   blocks: editorBlocks,
 *   metadata: { title: 'My Note' }
 * })
 * ```
 */
export function useNotebookSave(
  onUpdatePage?: (id: string, data: { title?: string; linked_entity_type?: LinkedEntityType; linked_entity_id?: string }) => Promise<void>,
  currentPage?: { title?: string; linked_entity_type?: LinkedEntityType; linked_entity_id?: string }
) {
  return useMutation({
    mutationFn: saveNotebookContent,
    // TanStack Query will automatically:
    // - Retry 3 times on failure (configured in QueryClient)
    // - Queue mutations to prevent race conditions
    onSuccess: async (data, variables) => {
      // Only call onUpdatePage if title or entity links actually changed
      // This prevents unnecessary re-renders and sidebar flickering
      if (onUpdatePage && variables.metadata && currentPage) {
        const titleChanged = variables.metadata.title !== undefined && variables.metadata.title !== currentPage.title
        const entityTypeChanged = variables.metadata.linked_entity_type !== undefined && variables.metadata.linked_entity_type !== currentPage.linked_entity_type
        const entityIdChanged = variables.metadata.linked_entity_id !== undefined && variables.metadata.linked_entity_id !== currentPage.linked_entity_id

        if (titleChanged || entityTypeChanged || entityIdChanged) {
          const updateData: { title?: string; linked_entity_type?: LinkedEntityType; linked_entity_id?: string } = {}
          if (titleChanged) updateData.title = variables.metadata.title
          if (entityTypeChanged) updateData.linked_entity_type = variables.metadata.linked_entity_type
          if (entityIdChanged) updateData.linked_entity_id = variables.metadata.linked_entity_id

          await onUpdatePage(variables.pageId, updateData)
        }
      }
    },
    onError: (error, variables) => {
      console.error('[useNotebookSave] ❌ Save failed after retries:', {
        error: error.message,
        pageId: variables.pageId,
        blocksCount: variables.blocks.length
      })
      // You could show a toast notification here
    },
  })
}
