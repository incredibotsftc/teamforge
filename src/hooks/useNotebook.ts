import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { deleteNotebookContent } from '@/lib/notebookStorage'
import {
  NotebookFolder,
  NotebookPage,
  CreateFolderData,
  CreatePageData,
  UpdatePageData,
  UpdateFolderData,
  NotebookState
} from '@/types/notebook'

export function useNotebook() {
  const { user } = useAuth()
  const { team, currentSeason } = useAppData()
  const [state, setState] = useState<NotebookState>({
    folders: [],
    pages: [],
    isLoading: true,
    error: undefined
  })

  // Debouncing for autosave
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedRef = useRef(false)
  const lastLoadKeyRef = useRef<string>('')

  // Fetch all notebook data
  const fetchNotebookData = useCallback(async () => {
    if (!user || !team) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    // If no season, still load but show empty state
    if (!currentSeason) {
      setState(prev => ({
        ...prev,
        folders: [],
        pages: [],
        isLoading: false,
        error: 'No season available. Please create a season to use the notebook.'
      }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }))

      // Fetch folders
      const { data: folders, error: foldersError } = await supabase
        .from('notebook_folders')
        .select('*')
        .eq('team_id', team.id)
        .eq('season_id', currentSeason.id)
        .order('sort_order', { ascending: true })

      if (foldersError) throw foldersError

      // Fetch pages
      const { data: pages, error: pagesError } = await supabase
        .from('notebook_pages')
        .select('*')
        .eq('team_id', team.id)
        .eq('season_id', currentSeason.id)
        .order('sort_order', { ascending: true })

      if (pagesError) throw pagesError


      // Build folder tree with children and page counts
      const folderMap = new Map<string, NotebookFolder>()
      const rootFolders: NotebookFolder[] = []

      // Initialize folders
      folders?.forEach(folder => {
        const folderWithChildren = {
          ...folder,
          children: [],
          pages: [],
          page_count: 0
        }
        folderMap.set(folder.id, folderWithChildren)
      })

      // Build folder hierarchy
      folderMap.forEach(folder => {
        if (folder.parent_folder_id) {
          const parent = folderMap.get(folder.parent_folder_id)
          if (parent) {
            parent.children = parent.children || []
            parent.children.push(folder)
          }
        } else {
          rootFolders.push(folder)
        }
      })

      // Assign pages to folders and count
      pages?.forEach(page => {
        if (page.folder_id) {
          const folder = folderMap.get(page.folder_id)
          if (folder) {
            folder.pages = folder.pages || []
            folder.pages.push(page)
            folder.page_count = (folder.page_count || 0) + 1
          }
        }
      })

      setState(prev => ({
        ...prev,
        folders: rootFolders,
        pages: pages || [],
        isLoading: false
      }))

    } catch (error) {
      console.error('Error fetching notebook data:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load notebook data'
      }))
    }
  }, [user, team, currentSeason])

  // Create a new folder
  const createFolder = useCallback(async (data: CreateFolderData): Promise<NotebookFolder | null> => {
    if (!user || !team || !currentSeason) return null

    try {
      const { data: folder, error } = await supabase
        .from('notebook_folders')
        .insert({
          team_id: team.id,
          season_id: currentSeason.id,
          name: data.name,
          parent_folder_id: data.parent_folder_id,
          color: data.color || '#6366f1',
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      await fetchNotebookData() // Refresh data
      return folder
    } catch (error) {
      console.error('Error creating folder:', error)
      setState(prev => ({ ...prev, error: 'Failed to create folder' }))
      return null
    }
  }, [user, team, currentSeason, fetchNotebookData])

  // Create a new page
  const createPage = useCallback(async (data: CreatePageData): Promise<NotebookPage | null> => {
    if (!user || !team || !currentSeason) return null

    try {
      const { data: page, error } = await supabase
        .from('notebook_pages')
        .insert({
          team_id: team.id,
          season_id: currentSeason.id,
          title: data.title || 'Untitled',
          folder_id: data.folder_id,
          content: data.content || '',
          linked_entity_type: data.linked_entity_type,
          linked_entity_id: data.linked_entity_id,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Update local state optimistically without refetching
      setState(prev => {
        const newPages = [...prev.pages, page]

        // If page has a folder, update the folder structure
        if (page.folder_id) {
          const updateFolderPages = (folders: NotebookFolder[]): NotebookFolder[] => {
            return folders.map(folder => {
              if (folder.id === page.folder_id) {
                return {
                  ...folder,
                  pages: [...(folder.pages || []), page],
                  page_count: (folder.page_count || 0) + 1
                }
              }
              return {
                ...folder,
                children: folder.children ? updateFolderPages(folder.children) : []
              }
            })
          }

          return {
            ...prev,
            pages: newPages,
            folders: updateFolderPages(prev.folders)
          }
        }

        return {
          ...prev,
          pages: newPages
        }
      })

      return page
    } catch (error) {
      console.error('Error creating page:', error)
      setState(prev => ({ ...prev, error: 'Failed to create page' }))
      return null
    }
  }, [user, team, currentSeason])

  // Update a page with debounced autosave
  // Note: Content is now saved to storage by BlockNoteEditor, not through this hook
  // This function only updates metadata fields like title, folder_id, links, etc.
  const updatePage = useCallback(async (id: string, data: UpdatePageData, immediate = false) => {
    if (!user || !team || !currentSeason) return false

    const performUpdate = async () => {
      try {
        // Prepare update data (content is handled separately via storage)
        const updateData: Record<string, unknown> = {
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }

        // Only include fields that are actually being updated
        if (data.title !== undefined) updateData.title = data.title
        if (data.folder_id !== undefined) updateData.folder_id = data.folder_id
        if (data.is_pinned !== undefined) updateData.is_pinned = data.is_pinned
        if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
        if (data.linked_entity_type !== undefined) updateData.linked_entity_type = data.linked_entity_type
        if (data.linked_entity_id !== undefined) updateData.linked_entity_id = data.linked_entity_id

        // Storage-related fields updated when content is saved
        if (data.content_text !== undefined) updateData.content_text = data.content_text
        if (data.content_path !== undefined) updateData.content_path = data.content_path
        if (data.content_size !== undefined) updateData.content_size = data.content_size

        const { error } = await supabase
          .from('notebook_pages')
          .update(updateData)
          .eq('id', id)

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }

        // Update local state immediately for better UX
        setState(prev => {
          // Helper function to update pages in nested folder structure
          const updateFolderPages = (folders: NotebookFolder[]): NotebookFolder[] => {
            return folders.map(folder => ({
              ...folder,
              pages: folder.pages?.map(page =>
                page.id === id ? { ...page, ...data } : page
              ) || [],
              children: folder.children ? updateFolderPages(folder.children) : []
            }))
          }

          return {
            ...prev,
            pages: prev.pages.map(page =>
              page.id === id ? { ...page, ...data } : page
            ),
            folders: updateFolderPages(prev.folders),
            currentPage: prev.currentPage?.id === id
              ? { ...prev.currentPage, ...data }
              : prev.currentPage
          }
        })

        return true
      } catch (error) {
        console.error('Error updating page:', error)
        setState(prev => ({ ...prev, error: 'Failed to save page' }))
        return false
      }
    }

    if (immediate) {
      return await performUpdate()
    } else {
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        await performUpdate()
      }, 1000) // 1 second debounce

      return true
    }
  }, [user, team, currentSeason])

  // Update a folder
  const updateFolder = useCallback(async (id: string, data: UpdateFolderData): Promise<boolean> => {
    if (!user || !team || !currentSeason) return false

    try {
      const { error } = await supabase
        .from('notebook_folders')
        .update({
          ...data,
          updated_by: user.id
        })
        .eq('id', id)

      if (error) throw error

      await fetchNotebookData() // Refresh data
      return true
    } catch (error) {
      console.error('Error updating folder:', error)
      setState(prev => ({ ...prev, error: 'Failed to update folder' }))
      return false
    }
  }, [user, team, currentSeason, fetchNotebookData])

  // Delete a page
  const deletePage = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !team || !currentSeason) return false

    try {
      // First, delete content from storage if it exists
      const storageResult = await deleteNotebookContent(team.id, currentSeason.id, id)

      if (!storageResult.success) {
        console.warn('Failed to delete content from storage:', storageResult.error)
        // Continue with page deletion even if storage deletion fails
      }

      // Delete the page record from database
      const { error } = await supabase
        .from('notebook_pages')
        .delete()
        .eq('id', id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        pages: prev.pages.filter(page => page.id !== id),
        currentPage: prev.currentPage?.id === id ? undefined : prev.currentPage
      }))

      return true
    } catch (error) {
      console.error('Error deleting page:', error)
      setState(prev => ({ ...prev, error: 'Failed to delete page' }))
      return false
    }
  }, [user, team, currentSeason])

  // Delete a folder
  const deleteFolder = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !team || !currentSeason) return false

    try {
      const { error } = await supabase
        .from('notebook_folders')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchNotebookData() // Refresh data
      return true
    } catch (error) {
      console.error('Error deleting folder:', error)
      setState(prev => ({ ...prev, error: 'Failed to delete folder' }))
      return false
    }
  }, [user, team, currentSeason, fetchNotebookData])

  // Move page to different folder
  const movePageToFolder = useCallback(async (pageId: string, folderId?: string): Promise<boolean> => {
    const success = await updatePage(pageId, { folder_id: folderId }, true)
    if (success) {
      // Refresh the entire folder structure since pages moved between folders
      await fetchNotebookData()
    }
    return success
  }, [updatePage, fetchNotebookData])

  // Reorder pages with optimistic update
  const reorderPages = useCallback(async (pageId: string, newPosition: number, folderId?: string): Promise<boolean> => {
    if (!user || !team || !currentSeason) return false

    try {
      // Get the session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session')
        return false
      }

      // Optimistically update local state immediately
      setState(prev => {
        // Find the page being moved
        const pageToMove = prev.pages.find(p => p.id === pageId)
        if (!pageToMove) return prev

        // Get pages in the TARGET folder
        const pagesInTargetFolder = prev.pages
          .filter(p => (p.folder_id || null) === (folderId || null))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        // Calculate new ordering
        const otherPages = pagesInTargetFolder.filter(p => p.id !== pageId)
        const reorderedPages = [
          ...otherPages.slice(0, newPosition),
          pageToMove,
          ...otherPages.slice(newPosition)
        ]

        // Update sort_order for all pages in target folder
        const updatedPagesMap = new Map(
          reorderedPages.map((p, index) => [
            p.id,
            {
              ...p,
              sort_order: index,
              folder_id: p.id === pageId ? (folderId || null) : p.folder_id
            }
          ])
        )

        // Apply updates to all pages in main array
        const newPages = prev.pages.map(page => {
          const updated = updatedPagesMap.get(page.id)
          return updated || page
        })

        // Update folder structure - rebuild pages arrays for affected folders
        const updateFolderPages = (folders: NotebookFolder[]): NotebookFolder[] => {
          return folders.map(folder => {
            // Rebuild pages array from the newPages array
            const folderPages = newPages
              .filter(page => page.folder_id === folder.id)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

            return {
              ...folder,
              pages: folderPages,
              page_count: folderPages.length,
              children: folder.children ? updateFolderPages(folder.children) : []
            }
          })
        }

        return {
          ...prev,
          pages: newPages,
          folders: updateFolderPages(prev.folders)
        }
      })

      // Make API call in background
      const response = await fetch('/api/notebook/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ pageId, newPosition, folderId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to reorder page: ${errorData.error || response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Error reordering pages:', error)
      // On error, refresh data to revert optimistic update
      await fetchNotebookData()
      setState(prev => ({ ...prev, error: 'Failed to reorder pages' }))
      return false
    }
  }, [user, team, currentSeason, fetchNotebookData])

  // Set current page
  const setCurrentPage = useCallback((page?: NotebookPage) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }, [])

  // Set current folder
  const setCurrentFolder = useCallback((folder?: NotebookFolder) => {
    setState(prev => ({ ...prev, currentFolder: folder }))
  }, [])

  // Get notebook page linked to a specific entity (reverse lookup)
  const getPageByEntity = useCallback(async (
    entityType: import('@/types/notebook').LinkedEntityType,
    entityId: string
  ): Promise<NotebookPage | null> => {
    if (!team || !currentSeason) return null

    const { getNotebookPageForEntity } = await import('@/lib/notebookHelpers')
    return await getNotebookPageForEntity(team.id, currentSeason.id, entityType, entityId)
  }, [team, currentSeason])

  // Get or create notebook page for entity (ensures 1:1 relationship)
  const getOrCreatePageForEntity = useCallback(async (
    entityType: import('@/types/notebook').LinkedEntityType,
    entityId: string,
    entityTitle: string
  ): Promise<NotebookPage | null> => {
    if (!user || !team || !currentSeason) return null

    const { getOrCreateNotebookPageForEntity } = await import('@/lib/notebookHelpers')
    const page = await getOrCreateNotebookPageForEntity(
      team.id,
      currentSeason.id,
      entityType,
      entityId,
      entityTitle,
      user.id
    )

    if (page) {
      // Refresh data to show new page in folder structure
      await fetchNotebookData()
    }

    return page
  }, [user, team, currentSeason, fetchNotebookData])

  // Load notebook data on mount and when team/season changes
  useEffect(() => {
    if (!user || !team || !currentSeason) {
      return
    }

    // Create a unique key for the current user/team/season combination
    const loadKey = `${user.id}-${team.id}-${currentSeason.id}`

    // Only fetch if this is a new combination or if we haven't loaded yet
    if (!hasLoadedRef.current || lastLoadKeyRef.current !== loadKey) {
      lastLoadKeyRef.current = loadKey
      hasLoadedRef.current = true
      fetchNotebookData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, team?.id, currentSeason?.id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    // Actions
    createFolder,
    createPage,
    updatePage,
    updateFolder,
    deletePage,
    deleteFolder,
    movePageToFolder,
    reorderPages,
    setCurrentPage,
    setCurrentFolder,
    refreshData: fetchNotebookData,
    // Entity linking
    getPageByEntity,
    getOrCreatePageForEntity
  }
}