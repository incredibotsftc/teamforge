import { supabase } from './supabase'

const BUCKET_NAME = 'notebook-sheets'

/**
 * Sheet data wrapper format for storage
 * Stores Univer workbook JSON
 */
interface StoredSheetData {
  version: string
  workbook: unknown // Univer workbook JSON
  updated_at: string
}

/**
 * Generate storage path for notebook sheet data
 */
export function getSheetDataPath(teamId: string, seasonId: string, sheetId: string): string {
  return `${teamId}/${seasonId}/${sheetId}.json`
}

/**
 * Save notebook sheet data to Supabase storage
 */
export async function saveSheetData(
  teamId: string,
  seasonId: string,
  sheetId: string,
  workbookData: unknown
): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
  try {
    const path = getSheetDataPath(teamId, seasonId, sheetId)

    // Wrap the workbook data with metadata
    const storedData: StoredSheetData = {
      version: '1.0',
      workbook: workbookData,
      updated_at: new Date().toISOString()
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(storedData)
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Upload to storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        contentType: 'application/json',
        upsert: true // Overwrite if exists
      })

    if (error) {
      console.error('[SheetStorage] ❌ Upload error:', error)
      return { success: false, error: error.message }
    }

    console.log(`[SheetStorage] ✅ Saved sheet ${sheetId} to storage:`, path)

    return {
      success: true,
      path: data.path,
      size: blob.size
    }
  } catch (error) {
    console.error('[SheetStorage] ❌ Save failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Load notebook sheet data from Supabase storage
 */
export async function loadSheetData(
  teamId: string,
  seasonId: string,
  sheetId: string
): Promise<{ success: boolean; workbook?: unknown; error?: string }> {
  try {
    const path = getSheetDataPath(teamId, seasonId, sheetId)

    // Download from storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path)

    if (error) {
      console.error('[SheetStorage] ❌ Download error:', error)
      return { success: false, error: error.message }
    }

    // Parse JSON
    const text = await data.text()
    const storedData = JSON.parse(text) as StoredSheetData

    console.log(`[SheetStorage] ✅ Loaded sheet ${sheetId} from storage:`, path)

    return {
      success: true,
      workbook: storedData.workbook
    }
  } catch (error) {
    console.error('[SheetStorage] ❌ Load failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete notebook sheet data from Supabase storage
 */
export async function deleteSheetData(
  teamId: string,
  seasonId: string,
  sheetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const path = getSheetDataPath(teamId, seasonId, sheetId)

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('[SheetStorage] ❌ Delete error:', error)
      return { success: false, error: error.message }
    }

    console.log(`[SheetStorage] ✅ Deleted sheet ${sheetId} from storage:`, path)

    return { success: true }
  } catch (error) {
    console.error('[SheetStorage] ❌ Delete failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get the public URL for a sheet (if needed for sharing)
 * Note: notebook-sheets bucket is private by default
 */
export function getSheetDataUrl(teamId: string, seasonId: string, sheetId: string): string {
  const path = getSheetDataPath(teamId, seasonId, sheetId)
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return data.publicUrl
}
