import { supabase } from '@/lib/supabase'
import { LinkedEntityType, NotebookFolder, NotebookPage } from '@/types/notebook'

// In-memory lock to prevent concurrent page creation for the same entity
const pageCreationLocks = new Map<string, Promise<NotebookPage | null>>()

/**
 * Get or create a default folder for entity types (Events, Mentoring, Tasks)
 * These folders are used to organize entity-linked notebook pages
 */
export async function getOrCreateDefaultFolder(
  teamId: string,
  seasonId: string,
  folderName: string,
  userId: string
): Promise<NotebookFolder | null> {
  try {
    // First, try to find existing folder(s)
    // Get ALL matching folders to detect duplicates
    const { data: existingFolders, error: findError } = await supabase
      .from('notebook_folders')
      .select('*')
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .eq('name', folderName)
      .is('parent_folder_id', null) // Only root-level folders
      .order('created_at', { ascending: true }) // Get oldest folder first

    if (findError) throw findError

    // If folder exists, clean up duplicates and return the first one
    if (existingFolders && existingFolders.length > 0) {
      const primaryFolder = existingFolders[0] as NotebookFolder

      // If there are duplicates, merge them into the primary folder
      if (existingFolders.length > 1) {
        // Move all pages from duplicate folders to the primary folder
        const duplicateFolderIds = existingFolders.slice(1).map(f => f.id)

        try {
          // Update all pages in duplicate folders to use the primary folder
          const { error: moveError } = await supabase
            .from('notebook_pages')
            .update({ folder_id: primaryFolder.id })
            .in('folder_id', duplicateFolderIds)
            .select()

          if (moveError) {
            console.error('[getOrCreateDefaultFolder] Error moving pages from duplicate folders:', moveError)
          }

          // Delete the duplicate folders
          const { error: deleteError } = await supabase
            .from('notebook_folders')
            .delete()
            .in('id', duplicateFolderIds)
            .select()

          if (deleteError) {
            console.error('[getOrCreateDefaultFolder] Error deleting duplicate folders:', deleteError)
          }
        } catch (cleanupError) {
          console.error('[getOrCreateDefaultFolder] Error during duplicate cleanup:', cleanupError)
          // Continue anyway - we still have the primary folder
        }
      }

      return primaryFolder
    }

    // Create new folder if it doesn't exist
    const { data: newFolder, error: createError } = await supabase
      .from('notebook_folders')
      .insert({
        team_id: teamId,
        season_id: seasonId,
        name: folderName,
        color: getDefaultColorForFolder(folderName),
        created_by: userId,
        updated_by: userId,
        sort_order: getDefaultSortOrderForFolder(folderName)
      })
      .select()
      .single()

    if (createError) throw createError

    return newFolder as NotebookFolder
  } catch (error) {
    console.error('Error in getOrCreateDefaultFolder:', error)
    return null
  }
}

/**
 * Get default color for entity folders
 */
function getDefaultColorForFolder(folderName: string): string {
  switch (folderName) {
    case 'Events':
      return '#3b82f6' // Blue
    case 'Mentoring':
      return '#8b5cf6' // Purple
    case 'Tasks':
      return '#10b981' // Green
    case 'Scouting':
      return '#f59e0b' // Orange
    default:
      return '#6366f1' // Default indigo
  }
}

/**
 * Get default sort order for entity folders (these should appear first)
 */
function getDefaultSortOrderForFolder(folderName: string): number {
  switch (folderName) {
    case 'Events':
      return 0
    case 'Mentoring':
      return 1
    case 'Tasks':
      return 2
    case 'Scouting':
      return 3
    default:
      return 100
  }
}

/**
 * Get the folder name for a given entity type
 */
export function getFolderNameForEntityType(entityType: LinkedEntityType): string {
  switch (entityType) {
    case 'event':
      return 'Events'
    case 'mentoring_session':
      return 'Mentoring'
    case 'task':
      return 'Tasks'
    case 'scouting_team':
      return 'Scouting'
  }
}

/**
 * Reverse lookup: Find notebook page linked to a specific entity
 */
export async function getNotebookPageForEntity(
  teamId: string,
  seasonId: string,
  entityType: LinkedEntityType,
  entityId: string
): Promise<NotebookPage | null> {
  try {
    const { data, error } = await supabase
      .from('notebook_pages')
      .select('*')
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .eq('linked_entity_type', entityType)
      .eq('linked_entity_id', entityId)
      .maybeSingle()

    if (error) {
      console.error('[getNotebookPageForEntity] Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    return data as NotebookPage | null
  } catch (error) {
    console.error('[getNotebookPageForEntity] Caught error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error // Re-throw instead of returning null so caller knows there was an error
  }
}

/**
 * Get existing notebook page for entity, or create a new one if it doesn't exist
 * This ensures each entity has exactly one notebook page (1:1 relationship)
 */
export async function getOrCreateNotebookPageForEntity(
  teamId: string,
  seasonId: string,
  entityType: LinkedEntityType,
  entityId: string,
  entityTitle: string,
  userId: string
): Promise<NotebookPage | null> {
  // Create a unique lock key for this entity
  const lockKey = `${teamId}:${seasonId}:${entityType}:${entityId}`

  // If there's already a creation in progress for this entity, wait for it
  if (pageCreationLocks.has(lockKey)) {
    return await pageCreationLocks.get(lockKey)!
  }

  // Create a promise for this creation and store it in the lock map
  const creationPromise = (async (): Promise<NotebookPage | null> => {
    try {
      // First, check if page already exists (check for ALL matching pages to detect duplicates)
      const { data: existingPages, error: findError } = await supabase
      .from('notebook_pages')
      .select('*')
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .eq('linked_entity_type', entityType)
      .eq('linked_entity_id', entityId)
      .order('created_at', { ascending: true })

    if (findError) {
      console.error('[getOrCreateNotebookPageForEntity] Error finding existing pages:', findError)
      throw findError
    }

    // If page(s) exist, clean up duplicates and return the first one
    if (existingPages && existingPages.length > 0) {
      const primaryPage = existingPages[0] as NotebookPage

      // If there are duplicates, delete them
      if (existingPages.length > 1) {
        console.warn(`[getOrCreateNotebookPageForEntity] Found ${existingPages.length} duplicate pages for entity ${entityId}, keeping only the oldest one`)

        const duplicatePageIds = existingPages.slice(1).map(p => p.id)

        try {
          const { error: deleteError } = await supabase
            .from('notebook_pages')
            .delete()
            .in('id', duplicatePageIds)

          if (deleteError) {
            console.error('[getOrCreateNotebookPageForEntity] Error deleting duplicate pages:', deleteError)
          }
        } catch (cleanupError) {
          console.error('[getOrCreateNotebookPageForEntity] Error during duplicate page cleanup:', cleanupError)
        }
      }

      return primaryPage
    }

    // Get or create the appropriate folder
    const folderName = getFolderNameForEntityType(entityType)

    const folder = await getOrCreateDefaultFolder(teamId, seasonId, folderName, userId)

    if (!folder) {
      throw new Error(`Failed to get or create folder: ${folderName}`)
    }

    // Create new notebook page linked to the entity
    const { data: newPage, error: createError } = await supabase
      .from('notebook_pages')
      .insert({
        team_id: teamId,
        season_id: seasonId,
        folder_id: folder.id,
        title: entityTitle,
        content_text: '',
        linked_entity_type: entityType,
        linked_entity_id: entityId,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single()

    if (createError) {
      console.error('[getOrCreateNotebookPageForEntity] Error creating page:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      })
      throw createError
    }

      return newPage as NotebookPage
    } catch (error) {
      console.error('[getOrCreateNotebookPageForEntity] Final catch error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return null
    }
  })()

  // Store the promise in the lock map
  pageCreationLocks.set(lockKey, creationPromise)

  try {
    // Wait for the creation to complete
    const result = await creationPromise
    return result
  } finally {
    // Always remove the lock when done (success or failure)
    pageCreationLocks.delete(lockKey)
  }
}

/**
 * Get a user-friendly title for the notebook page based on entity type
 */
export function getNotebookTitleForEntity(entityType: LinkedEntityType, entityTitle: string): string {
  switch (entityType) {
    case 'event':
      return `Event: ${entityTitle}`
    case 'mentoring_session':
      return `Session: ${entityTitle}`
    case 'task':
      return `Task: ${entityTitle}`
    case 'scouting_team':
      return `Team: ${entityTitle}`
  }
}
