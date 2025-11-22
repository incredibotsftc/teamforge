/**
 * TypeScript types and interfaces for Yjs integration with notebook system
 */

import type { Block } from '@blocknote/core'

/**
 * User information for collaborative editing
 */
export interface YjsUser {
  id: string
  name: string
  email?: string
  color: string
}

/**
 * Active editor information (user presence)
 */
export interface ActiveEditor {
  user_id: string
  user_name: string
  user_email?: string
  user_color: string
  cursor_position?: {
    block_id?: string
    position?: number
  }
  last_seen: string
}

/**
 * Connection state for Realtime sync
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'

/**
 * Yjs update message sent via Realtime Broadcast
 */
export interface YjsUpdateMessage {
  update: number[] // Uint8Array converted to number array for JSON serialization
  origin?: string
}

/**
 * Awareness update message for user presence
 */
export interface AwarenessUpdateMessage {
  update: number[] // Uint8Array converted to number array
  origin?: string
}

/**
 * Snapshot data stored in Supabase Storage
 */
export interface NotebookSnapshot {
  version: number
  blocks: Block[]
  yjs_state_vector?: number[] // Yjs state vector for incremental sync
  updated_at: string
  created_by?: string
}

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  version: number
  timestamp: string
  created_by: string
  snapshot_path: string
  content_size: number
}

/**
 * Realtime channel configuration
 */
export interface RealtimeChannelConfig {
  teamId: string
  pageId: string
  userId: string
  userName: string
  userColor: string
}

/**
 * Sync status information
 */
export interface SyncStatus {
  state: ConnectionState
  isSynced: boolean
  lastSyncedAt?: Date
  pendingUpdates: number
  error?: Error
}

/**
 * Collaborative notebook configuration
 */
export interface CollaborativeNotebookConfig {
  pageId: string
  teamId: string
  seasonId: string
  user: YjsUser
  enablePresence?: boolean
  enableVersionHistory?: boolean
  snapshotInterval?: number // milliseconds, default 30000 (30s)
}

/**
 * Yjs provider events
 */
export type YjsProviderEvent =
  | 'status'
  | 'sync'
  | 'update'
  | 'awareness-update'
  | 'connection-close'
  | 'connection-error'

/**
 * Event handler for Yjs provider
 */
export type YjsProviderEventHandler = (event: {
  type: YjsProviderEvent
  data?: unknown
}) => void
