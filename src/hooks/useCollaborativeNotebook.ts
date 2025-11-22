/**
 * React hook for collaborative notebook editing with Yjs + Supabase Realtime
 *
 * Features:
 * - Manages Yjs document lifecycle
 * - Sets up Supabase Realtime provider for sync
 * - Handles periodic snapshots to Storage
 * - Provides connection status and active editors
 * - Automatic reconnection on network issues
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import type { Block } from '@blocknote/core'
import { SupabaseYjsProvider } from '@/lib/yjs/SupabaseYjsProvider'
import { loadYjsDocumentFromStorage, saveYjsSnapshot } from '@/lib/yjs/notebookSync'
import type { ConnectionState, SyncStatus, CollaborativeNotebookConfig } from '@/lib/yjs/types'

export interface UseCollaborativeNotebookReturn {
  doc: Y.Doc | null
  provider: SupabaseYjsProvider | null
  isLoaded: boolean
  syncStatus: SyncStatus
  activeEditors: Array<{ id: string; name: string; color: string }>
  saveSnapshot: () => Promise<void>
}

/**
 * Hook for managing collaborative notebook with Yjs + Supabase Realtime
 *
 * @param config - Configuration for collaborative editing
 * @param getCurrentBlocks - Function to get current blocks from editor (for snapshots)
 * @returns Yjs document, provider, and sync status
 */
export function useCollaborativeNotebook(
  config: CollaborativeNotebookConfig | null,
  getCurrentBlocks: () => Block[]
): UseCollaborativeNotebookReturn {
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<SupabaseYjsProvider | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'disconnected',
    isSynced: false,
    pendingUpdates: 0
  })
  const [activeEditors, setActiveEditors] = useState<Array<{ id: string; name: string; color: string }>>([])

  // Refs for cleanup and intervals
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSnapshotTimeRef = useRef<number>(Date.now())

  /**
   * Initialize Yjs document and provider
   */
  useEffect(() => {
    if (!config) {
      setIsLoaded(false)
      return
    }

    let mounted = true
    let yjsDoc: Y.Doc | null = null
    let yjsProvider: SupabaseYjsProvider | null = null

    const initialize = async () => {
      try {
        console.log('[useCollaborativeNotebook] Initializing for page:', config.pageId)

        // Create new Yjs document
        yjsDoc = new Y.Doc()

        // Load existing content from Storage
        const loadResult = await loadYjsDocumentFromStorage(
          yjsDoc,
          config.teamId,
          config.seasonId,
          config.pageId
        )

        if (!loadResult.success) {
          console.error('[useCollaborativeNotebook] Failed to load content:', loadResult.error)
          setSyncStatus(prev => ({
            ...prev,
            state: 'error',
            error: new Error(loadResult.error || 'Failed to load content')
          }))
          return
        }

        // Set up Realtime provider for sync
        yjsProvider = new SupabaseYjsProvider(yjsDoc, {
          teamId: config.teamId,
          pageId: config.pageId,
          userId: config.user.id,
          userName: config.user.name,
          userColor: config.user.color
        })

        // Listen for connection status changes
        yjsProvider.on('status', ({ data }) => {
          if (mounted) {
            const state = (data as { state: ConnectionState }).state
            setSyncStatus(prev => ({
              ...prev,
              state,
              isSynced: state === 'connected'
            }))
          }
        })

        // Listen for sync events
        yjsProvider.on('sync', ({ data }) => {
          if (mounted && (data as { synced: boolean }).synced) {
            setSyncStatus(prev => ({
              ...prev,
              isSynced: true,
              lastSyncedAt: new Date()
            }))
          }
        })

        // Listen for awareness updates (active editors)
        yjsProvider.on('awareness-update', () => {
          if (mounted && yjsProvider) {
            setActiveEditors(yjsProvider.getActiveEditors())
          }
        })

        // Listen for connection errors
        yjsProvider.on('connection-error', ({ data }) => {
          if (mounted) {
            const error = (data as { error: Error }).error
            setSyncStatus(prev => ({
              ...prev,
              state: 'error',
              error
            }))
          }
        })

        if (mounted) {
          setDoc(yjsDoc)
          setProvider(yjsProvider)
          setIsLoaded(true)
          setSyncStatus(prev => ({
            ...prev,
            state: yjsProvider.getConnectionState()
          }))
        }

      } catch (error) {
        console.error('[useCollaborativeNotebook] Initialization error:', error)
        if (mounted) {
          setSyncStatus(prev => ({
            ...prev,
            state: 'error',
            error: error as Error
          }))
        }
      }
    }

    initialize()

    // Cleanup on unmount or config change
    return () => {
      mounted = false
      yjsProvider?.destroy()
      yjsDoc?.destroy()
    }
  }, [config?.pageId, config?.teamId, config?.seasonId, config?.user.id])

  /**
   * Save snapshot to Storage
   */
  const saveSnapshot = useCallback(async () => {
    if (!doc || !provider || !config) {
      console.warn('[useCollaborativeNotebook] Cannot save snapshot - not initialized')
      return
    }

    try {
      // Get current blocks from editor
      const blocks = getCurrentBlocks()

      // Save snapshot
      const result = await saveYjsSnapshot(
        doc,
        config.teamId,
        config.seasonId,
        config.pageId,
        blocks,
        config.user.id
      )

      if (result.success) {
        console.log('[useCollaborativeNotebook] Snapshot saved successfully')
        lastSnapshotTimeRef.current = Date.now()
        // Reset the update counter in provider
        provider.resetSnapshotCounter()
      } else {
        console.error('[useCollaborativeNotebook] Snapshot save failed:', result.error)
      }
    } catch (error) {
      console.error('[useCollaborativeNotebook] Error saving snapshot:', error)
    }
  }, [doc, provider, config, getCurrentBlocks])

  /**
   * Set up periodic snapshot saving
   */
  useEffect(() => {
    if (!isLoaded || !provider || !config) {
      return
    }

    const snapshotInterval = config.snapshotInterval || 30000 // Default 30 seconds

    // Set up interval for periodic snapshots
    snapshotIntervalRef.current = setInterval(() => {
      // Only save if there have been updates since last snapshot
      const updatesSinceSnapshot = provider.getUpdatesSinceSnapshot()

      if (updatesSinceSnapshot > 0) {
        console.log('[useCollaborativeNotebook] Auto-saving snapshot:', {
          updatesSinceSnapshot,
          timeSinceLastSnapshot: Date.now() - lastSnapshotTimeRef.current
        })
        saveSnapshot()
      }
    }, snapshotInterval)

    // Cleanup interval on unmount
    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current)
      }
    }
  }, [isLoaded, provider, config, saveSnapshot])

  /**
   * Save snapshot before page unload
   */
  useEffect(() => {
    if (!isLoaded || !provider) {
      return
    }

    const handleBeforeUnload = () => {
      // Try to save snapshot synchronously before unload
      // Note: This may not complete in time, periodic snapshots are the primary backup
      const updatesSinceSnapshot = provider.getUpdatesSinceSnapshot()
      if (updatesSinceSnapshot > 0) {
        saveSnapshot()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isLoaded, provider, saveSnapshot])

  return {
    doc,
    provider,
    isLoaded,
    syncStatus,
    activeEditors,
    saveSnapshot
  }
}
