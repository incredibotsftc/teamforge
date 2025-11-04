import { supabase } from './supabase'
import type { Block } from '@blocknote/core'

const BUCKET_NAME = 'notebook-content'

/**
 * Content wrapper format for storage
 */
interface StoredContent {
  version: string
  blocks: Block[]
  updated_at: string
}

/**
 * Generate storage path for notebook content
 */
export function getContentPath(teamId: string, seasonId: string, pageId: string): string {
  return `${teamId}/${seasonId}/${pageId}.json`
}

/**
 * Save notebook content to Supabase storage
 */
export async function saveNotebookContent(
  teamId: string,
  seasonId: string,
  pageId: string,
  blocks: Block[]
): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
  try {
    const path = getContentPath(teamId, seasonId, pageId)

    // Deep clone blocks to remove any circular references or non-serializable data
    // This also filters out any blocks that fail JSON serialization
    const cleanBlocks: Block[] = []
    for (let i = 0; i < blocks.length; i++) {
      try {
        const blockJson = JSON.stringify(blocks[i])
        const cleanBlock = JSON.parse(blockJson) as Block
        cleanBlocks.push(cleanBlock)
      } catch (error) {
        console.error(`[Storage] ❌ Block ${i} (type: ${blocks[i]?.type}) failed serialization:`, error)
        console.error('[Storage] Problematic block:', blocks[i])
      }
    }

    if (cleanBlocks.length !== blocks.length) {
      console.error(`[Storage] ⚠️ Lost ${blocks.length - cleanBlocks.length} blocks during serialization!`)
    }

    const contentWrapper: StoredContent = {
      version: '1',
      blocks: cleanBlocks,
      updated_at: new Date().toISOString()
    }

    const contentString = JSON.stringify(contentWrapper, null, 2)

    // Use File instead of Blob for better compatibility with Supabase Storage
    const contentFile = new File([contentString], `${pageId}.json`, {
      type: 'application/json',
      lastModified: Date.now()
    })
    const contentSize = contentFile.size

    // Use upload with upsert: true to replace existing files
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, contentFile, {
        cacheControl: 'no-cache, no-store, must-revalidate', // Prevent ALL caching including ETag-based caching
        upsert: true // Replace existing file if it exists
      })

    if (uploadError) {
      console.error('[Storage] Error uploading content to storage:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Return path and size for caller to update the database
    // This ensures React state stays in sync
    return { success: true, path, size: contentSize }
  } catch (error) {
    console.error('Error saving notebook content:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Load notebook content from Supabase storage
 */
export async function loadNotebookContent(
  teamId: string,
  seasonId: string,
  pageId: string
): Promise<{ success: boolean; blocks?: Block[]; error?: string }> {
  try {
    const path = getContentPath(teamId, seasonId, pageId)

    // Use signed URL with cache-busting to bypass browser cache
    // Create a new signed URL each time with timestamp to ensure uniqueness
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 60) // 60 second expiration

    if (signedUrlError) {
      console.error('[Storage] Error creating signed URL:', signedUrlError)
      return { success: false, error: signedUrlError.message }
    }

    if (!signedUrlData?.signedUrl) {
      console.error('[Storage] No signed URL received')
      return { success: false, error: 'No signed URL received' }
    }

    // Fetch with aggressive cache-busting headers and timestamp query param
    const cacheBustingUrl = `${signedUrlData.signedUrl}&_t=${Date.now()}`

    const response = await fetch(cacheBustingUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

    if (!response.ok) {
      console.error('[Storage] Fetch failed:', response.status, response.statusText)
      return { success: false, error: `Fetch failed: ${response.statusText}` }
    }

    const contentText = await response.text()
    const contentWrapper: StoredContent = JSON.parse(contentText)

    return { success: true, blocks: contentWrapper.blocks }
  } catch (error) {
    console.error('[Storage] Error loading notebook content:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete notebook content from storage
 */
export async function deleteNotebookContent(
  teamId: string,
  seasonId: string,
  pageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const path = getContentPath(teamId, seasonId, pageId)

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Error deleting content from storage:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting notebook content:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Extract plain text from BlockNote blocks for search indexing
 */
export function extractPlainText(blocks: Block[]): string {
  if (!blocks || blocks.length === 0) return ''

  return blocks
    .map(block => {
      // Extract text content from block
      const content = block.content as unknown
      if (content) {
        if (Array.isArray(content)) {
          return content
            .map((item: { text?: string }) => item.text || '')
            .join(' ')
        } else if (typeof content === 'string') {
          return content
        }
      }
      return ''
    })
    .filter(text => text.trim().length > 0)
    .join('\n')
}

/**
 * Check if content exists in storage
 */
export async function contentExistsInStorage(
  teamId: string,
  seasonId: string,
  pageId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`${teamId}/${seasonId}`, {
        search: `${pageId}.json`
      })

    if (error) {
      console.error('Error checking content existence:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error checking content existence:', error)
    return false
  }
}

