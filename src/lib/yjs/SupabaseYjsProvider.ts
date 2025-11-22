/**
 * Supabase Realtime provider for Yjs
 *
 * This provider uses Supabase Realtime Broadcast channels to sync Yjs updates
 * between clients, enabling real-time collaborative editing.
 *
 * Implements the standard Yjs provider interface for BlockNote compatibility.
 */

import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type {
  RealtimeChannelConfig,
  YjsProviderEvent,
  YjsProviderEventHandler,
  ConnectionState,
  YjsUpdateMessage,
  AwarenessUpdateMessage
} from './types'

export class SupabaseYjsProvider extends EventTarget {
  private channel: RealtimeChannel | null = null
  public awareness: awarenessProtocol.Awareness
  private doc: Y.Doc
  private roomName: string
  private config: RealtimeChannelConfig
  private connectionState: ConnectionState = 'disconnected'
  private eventHandlers: Map<YjsProviderEvent, Set<YjsProviderEventHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private updatesSinceLastSnapshot = 0

  // Debounce for sending updates (reduce message frequency)
  private pendingUpdate: Uint8Array | null = null
  private updateDebounceTimeout: NodeJS.Timeout | null = null
  private readonly updateDebounceMs = 50 // 50ms debounce

  constructor(
    doc: Y.Doc,
    config: RealtimeChannelConfig
  ) {
    super() // Required for EventTarget
    this.doc = doc
    this.config = config
    this.roomName = `notebook:team:${config.teamId}:page:${config.pageId}`

    // Initialize awareness for user presence
    this.awareness = new awarenessProtocol.Awareness(doc)
    this.awareness.setLocalStateField('user', {
      name: config.userName,
      color: config.userColor,
      id: config.userId
    })

    // Set up Yjs document listeners
    this.setupDocumentListeners()

    // Set up awareness listeners
    this.setupAwarenessListeners()

    // Connect to Realtime channel
    this.connect()
  }

  /**
   * Set up listeners for Yjs document updates
   */
  private setupDocumentListeners() {
    this.doc.on('update', this.handleDocUpdate)
  }

  /**
   * Handle Yjs document update
   */
  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    // Don't broadcast updates that came from remote
    if (origin === 'remote') return

    // Increment counter for snapshot triggering
    this.updatesSinceLastSnapshot++

    // Debounce sending updates to reduce message frequency
    this.pendingUpdate = Y.mergeUpdates([this.pendingUpdate || new Uint8Array(), update])

    if (this.updateDebounceTimeout) {
      clearTimeout(this.updateDebounceTimeout)
    }

    this.updateDebounceTimeout = setTimeout(() => {
      if (this.pendingUpdate && this.connectionState === 'connected') {
        this.sendUpdate(this.pendingUpdate)
        this.pendingUpdate = null
      }
    }, this.updateDebounceMs)

    // Emit update event
    this.emit('update', { update })
  }

  /**
   * Set up listeners for awareness updates (user presence)
   */
  private setupAwarenessListeners() {
    this.awareness.on('update', this.handleAwarenessUpdate)
  }

  /**
   * Handle awareness update (user presence changes)
   */
  private handleAwarenessUpdate = ({ added, updated, removed }: {
    added: number[]
    updated: number[]
    removed: number[]
  }) => {
    const changedClients = added.concat(updated).concat(removed)
    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)

    if (this.connectionState === 'connected') {
      this.sendAwarenessUpdate(update)
    }

    // Emit awareness event
    this.emit('awareness-update', { added, updated, removed })
  }

  /**
   * Connect to Supabase Realtime channel
   */
  private async connect() {
    try {
      this.setConnectionState('connecting')

      // Create Realtime channel
      this.channel = supabase.channel(this.roomName, {
        config: {
          broadcast: {
            ack: true,
            self: false // Don't receive our own broadcasts
          }
        }
      })

      // Listen for Yjs updates from other clients
      this.channel.on('broadcast', { event: 'yjs-update' }, (payload) => {
        this.receiveUpdate(payload.payload as YjsUpdateMessage)
      })

      // Listen for awareness updates
      this.channel.on('broadcast', { event: 'awareness-update' }, (payload) => {
        this.receiveAwarenessUpdate(payload.payload as AwarenessUpdateMessage)
      })

      // Subscribe to channel
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.setConnectionState('connected')
          this.reconnectAttempts = 0

          // Send initial state sync
          await this.sendInitialSync()

          // Send initial awareness state
          const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
            this.awareness,
            [this.doc.clientID]
          )
          this.sendAwarenessUpdate(awarenessUpdate)

          this.emit('sync', { synced: true })
        } else if (status === 'CHANNEL_ERROR') {
          this.handleConnectionError(new Error('Channel subscription error'))
        } else if (status === 'TIMED_OUT') {
          this.handleConnectionError(new Error('Channel subscription timed out'))
        }
      })

    } catch (error) {
      this.handleConnectionError(error as Error)
    }
  }

  /**
   * Send initial state sync to other clients
   */
  private async sendInitialSync() {
    const stateVector = Y.encodeStateAsUpdate(this.doc)
    await this.sendUpdate(stateVector)
  }

  /**
   * Send Yjs update via Realtime Broadcast
   */
  private async sendUpdate(update: Uint8Array) {
    if (!this.channel || this.connectionState !== 'connected') {
      console.warn('[SupabaseYjsProvider] Cannot send update - not connected')
      return
    }

    const message: YjsUpdateMessage = {
      update: Array.from(update)
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: message
      })
    } catch (error) {
      console.error('[SupabaseYjsProvider] Error sending update:', error)
    }
  }

  /**
   * Receive Yjs update from Realtime Broadcast
   */
  private receiveUpdate(message: YjsUpdateMessage) {
    try {
      const update = new Uint8Array(message.update)
      // Apply update with 'remote' origin to prevent echo
      Y.applyUpdate(this.doc, update, 'remote')
      this.updatesSinceLastSnapshot++
    } catch (error) {
      console.error('[SupabaseYjsProvider] Error applying update:', error)
    }
  }

  /**
   * Send awareness update via Realtime Broadcast
   */
  private async sendAwarenessUpdate(update: Uint8Array) {
    if (!this.channel || this.connectionState !== 'connected') return

    const message: AwarenessUpdateMessage = {
      update: Array.from(update)
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'awareness-update',
        payload: message
      })
    } catch (error) {
      console.error('[SupabaseYjsProvider] Error sending awareness update:', error)
    }
  }

  /**
   * Receive awareness update from Realtime Broadcast
   */
  private receiveAwarenessUpdate(message: AwarenessUpdateMessage) {
    try {
      const update = new Uint8Array(message.update)
      awarenessProtocol.applyAwarenessUpdate(this.awareness, update, 'remote')
    } catch (error) {
      console.error('[SupabaseYjsProvider] Error applying awareness update:', error)
    }
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.emit('status', { state })
    }
  }

  /**
   * Handle connection error and attempt reconnect
   */
  private handleConnectionError(error: Error) {
    console.error('[SupabaseYjsProvider] Connection error:', error)
    this.setConnectionState('error')
    this.emit('connection-error', { error })

    // Attempt reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setConnectionState('reconnecting')
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      this.reconnectAttempts++

      this.reconnectTimeout = setTimeout(() => {
        this.reconnect()
      }, delay)
    } else {
      console.error('[SupabaseYjsProvider] Max reconnect attempts reached')
    }
  }

  /**
   * Attempt to reconnect
   */
  private async reconnect() {
    console.log('[SupabaseYjsProvider] Attempting reconnect...')

    // Clean up old channel
    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    // Attempt new connection
    await this.connect()
  }

  /**
   * Get number of updates since last snapshot
   */
  public getUpdatesSinceSnapshot(): number {
    return this.updatesSinceLastSnapshot
  }

  /**
   * Reset snapshot counter
   */
  public resetSnapshotCounter() {
    this.updatesSinceLastSnapshot = 0
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Get active editors (from awareness)
   */
  public getActiveEditors() {
    const states = this.awareness.getStates()
    const editors: Array<{ id: string; name: string; color: string }> = []

    states.forEach((state, clientId) => {
      if (state.user && clientId !== this.doc.clientID) {
        editors.push({
          id: state.user.id,
          name: state.user.name,
          color: state.user.color
        })
      }
    })

    return editors
  }

  /**
   * Register event handler
   */
  public on(event: YjsProviderEvent, handler: YjsProviderEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Unregister event handler
   */
  public off(event: YjsProviderEvent, handler: YjsProviderEventHandler) {
    this.eventHandlers.get(event)?.delete(handler)
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: YjsProviderEvent, data?: unknown) {
    this.eventHandlers.get(event)?.forEach(handler => {
      handler({ type: event, data })
    })
  }

  /**
   * Clean up and disconnect
   */
  public async destroy() {
    // Clear timers
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.updateDebounceTimeout) {
      clearTimeout(this.updateDebounceTimeout)
    }

    // Remove document listeners
    this.doc.off('update', this.handleDocUpdate)

    // Remove awareness listeners
    this.awareness.off('update', this.handleAwarenessUpdate)

    // Destroy awareness (removes local state)
    this.awareness.destroy()

    // Unsubscribe from channel
    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    this.setConnectionState('disconnected')
    this.emit('connection-close', {})

    // Clear event handlers
    this.eventHandlers.clear()
  }
}
