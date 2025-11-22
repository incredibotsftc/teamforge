/**
 * Minimal Yjs provider using Supabase Realtime
 *
 * This provider syncs Yjs updates via Supabase Realtime Broadcast channels.
 * It's designed to work with BlockNote's collaboration feature.
 */

import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeYjsProviderConfig {
  teamId: string
  seasonId: string
  pageId: string
  userId: string
  userName: string
  userColor: string
}

export class RealtimeYjsProvider {
  public doc: Y.Doc
  public awareness: awarenessProtocol.Awareness
  private channel: RealtimeChannel | null = null
  private channelName: string
  private config: RealtimeYjsProviderConfig
  private saveTimeout: NodeJS.Timeout | null = null
  private saveInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isDestroyed: boolean = false

  constructor(doc: Y.Doc, config: RealtimeYjsProviderConfig) {
    this.doc = doc
    this.config = config
    this.channelName = `notebook:${config.teamId}:${config.pageId}`

    // Initialize awareness for user presence
    this.awareness = new awarenessProtocol.Awareness(doc)
    this.awareness.setLocalStateField('user', {
      name: config.userName,
      color: config.userColor,
      id: config.userId
    })

    // Set up document update listener
    this.doc.on('update', this.handleDocUpdate)

    // Set up awareness update listener
    this.awareness.on('update', this.handleAwarenessUpdate)

    // Connect to Realtime channel
    this.connect()

    // Set up periodic save every 5 seconds
    this.saveInterval = setInterval(() => {
      this.saveToDatabase()
    }, 5000)

    // Don't manually load - let BlockNote handle initialContent
  }

  /**
   * Handle local document updates
   */
  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    // Don't broadcast updates that came from remote
    if (origin === this) return

    // Broadcast update to other clients
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(update) }
      })
    }
  }

  /**
   * Handle awareness updates (user presence)
   */
  private handleAwarenessUpdate = ({
    added,
    updated,
    removed
  }: {
    added: number[]
    updated: number[]
    removed: number[]
  }) => {
    const changedClients = added.concat(updated).concat(removed)
    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'awareness-update',
        payload: { update: Array.from(update) }
      })
    }
  }

  /**
   * Connect to Supabase Realtime channel
   */
  private connect() {
    console.log('[RealtimeYjsProvider] Connecting to channel:', this.channelName)

    this.channel = supabase.channel(this.channelName, {
      config: {
        broadcast: {
          ack: false,
          self: false // Don't receive our own broadcasts
        }
      }
    })

    // Listen for Yjs updates from other clients
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      try {
        const update = new Uint8Array(payload.update)
        console.log('[RealtimeYjsProvider] Received update, size:', update.length)
        // Apply with 'this' as origin to prevent echo
        Y.applyUpdate(this.doc, update, this)
        console.log('[RealtimeYjsProvider] Update applied successfully')
      } catch (error) {
        console.error('[RealtimeYjsProvider] Error applying update:', error)
        // Don't crash - just log and continue
      }
    })

    // Listen for awareness updates
    this.channel.on('broadcast', { event: 'awareness-update' }, ({ payload }) => {
      try {
        const update = new Uint8Array(payload.update)
        awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this)
      } catch (error) {
        console.error('[RealtimeYjsProvider] Error applying awareness update:', error)
      }
    })

    // Subscribe to channel
    this.channel.subscribe((status) => {
      console.log('[RealtimeYjsProvider] Channel status:', status)

      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeYjsProvider] Connected! Ready for real-time sync')

        // Clear any reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }

        // Send initial awareness state only (not document state)
        // Each client loads its own state from database
        const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          [this.doc.clientID]
        )
        this.channel?.send({
          type: 'broadcast',
          event: 'awareness-update',
          payload: { update: Array.from(awarenessUpdate) }
        })
      } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('[RealtimeYjsProvider] Channel disconnected, attempting reconnect...')

        // Don't reconnect if we're destroyed
        if (!this.isDestroyed) {
          // Wait 2 seconds then reconnect
          this.reconnectTimeout = setTimeout(() => {
            console.log('[RealtimeYjsProvider] Reconnecting...')
            this.reconnect()
          }, 2000)
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeYjsProvider] Channel error, will retry connection')

        if (!this.isDestroyed) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnect()
          }, 5000) // Wait longer for errors
        }
      }
    })
  }

  /**
   * Reconnect to the Realtime channel
   */
  private reconnect() {
    // Clean up old channel
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }

    // Reconnect
    this.connect()
  }

  /**
   * Get active editors from awareness
   * Deduplicates by user ID (same user can have multiple clients)
   */
  public getActiveEditors() {
    const states = this.awareness.getStates()
    const editorMap = new Map<string, { id: string; name: string; color: string }>()

    states.forEach((state, clientId) => {
      if (state.user && clientId !== this.doc.clientID) {
        // Only add if we haven't seen this user ID yet
        if (!editorMap.has(state.user.id)) {
          editorMap.set(state.user.id, {
            id: state.user.id,
            name: state.user.name,
            color: state.user.color
          })
        }
      }
    })

    return Array.from(editorMap.values())
  }

  /**
   * Load content from Supabase Storage and populate Yjs document
   */
  public async loadFromDatabase() {
    try {
      const { loadNotebookContent } = await import('@/lib/notebookStorage')
      const result = await loadNotebookContent(
        this.config.teamId,
        this.config.seasonId,
        this.config.pageId
      )

      if (result.success && result.blocks && result.blocks.length > 0) {
        console.log('[RealtimeYjsProvider] Loaded', result.blocks.length, 'blocks from storage')

        // Get the BlockNote fragment
        const fragment = this.doc.getXmlFragment('blocknote')

        // Only populate if the fragment is empty (first load)
        if (fragment.length === 0) {
          // Insert the blocks as a JSON array into the Yjs document
          // BlockNote will handle converting this to its internal structure
          this.doc.transact(() => {
            const blockArray = this.doc.getArray('blocks')
            blockArray.delete(0, blockArray.length) // Clear any existing
            result.blocks!.forEach(block => {
              blockArray.push([block])
            })
          }, 'local')

          console.log('[RealtimeYjsProvider] Populated Yjs document with loaded blocks')
        }

        return result.blocks
      }

      return []
    } catch (error) {
      console.error('[RealtimeYjsProvider] Error loading from database:', error)
      return []
    }
  }

  /**
   * Save content to Supabase Storage
   */
  private async saveToDatabase() {
    try {
      // Get blocks from editor (this will be called from BlockNoteEditor)
      // For now, just log that we would save
      console.log('[RealtimeYjsProvider] Auto-save triggered')

      // We'll implement actual saving via a callback from BlockNoteEditor
      // since we need access to editor.document to get the blocks
    } catch (error) {
      console.error('[RealtimeYjsProvider] Error saving to database:', error)
    }
  }

  /**
   * Trigger a debounced save
   */
  public triggerSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      this.saveToDatabase()
    }, 2000) // 2 second debounce
  }

  /**
   * Clean up and disconnect
   */
  public destroy() {
    // Mark as destroyed to prevent reconnection
    this.isDestroyed = true

    // Clear all timers
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Remove document listeners
    this.doc.off('update', this.handleDocUpdate)

    // Remove awareness listeners
    this.awareness.off('update', this.handleAwarenessUpdate)

    // Destroy awareness (removes local state)
    this.awareness.destroy()

    // Unsubscribe from channel
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }

    console.log('[RealtimeYjsProvider] Disconnected')
  }
}
