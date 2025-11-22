'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, Check, Link2, Calendar, Users, FolderKanban, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { NotebookPage, LinkedEntityType } from '@/types/notebook'
import { EntityLinkSelector } from './EntityLinkSelector'
import { supabase } from '@/lib/supabase'
import { loadNotebookContent } from '@/lib/notebookStorage'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/components/ThemeProvider'
import { useCollaborativeNotebook } from '@/hooks/useCollaborativeNotebook'
import type { Block } from '@blocknote/core'
import type { CollaborativeNotebookConfig } from '@/lib/yjs/types'

interface BlockNoteEditorProps {
  page?: NotebookPage
  onUpdatePage?: (id: string, data: { title?: string; content?: unknown; content_text?: string; content_path?: string; content_size?: number; linked_entity_type?: LinkedEntityType; linked_entity_id?: string }) => Promise<void>
  onSaveStateChange?: (state: { isSaving: boolean; hasPendingSave: boolean }) => void
}

export function BlockNoteEditor({ page, onUpdatePage, onSaveStateChange }: BlockNoteEditorProps) {
  const { team, currentSeason } = useAppData()
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const [title, setTitle] = useState('Untitled')

  const [initialContent, setInitialContent] = useState<Block[] | undefined>(undefined)
  const [linkedEntityType, setLinkedEntityType] = useState<LinkedEntityType | undefined>(page?.linked_entity_type)
  const [linkedEntityId, setLinkedEntityId] = useState<string | undefined>(page?.linked_entity_id)
  const [showLinkSelector, setShowLinkSelector] = useState(false)

  // Track refs
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isEditingTitleRef = useRef(false)

  // Yjs collaborative editing configuration
  const yjsConfig = useMemo<CollaborativeNotebookConfig | null>(() => {
    if (!page || !team || !currentSeason || !user) {
      return null
    }

    // Generate a consistent color for this user
    const userColor = user.user_metadata?.accent_color || '#6366f1'

    return {
      pageId: page.id,
      teamId: team.id,
      seasonId: currentSeason.id,
      user: {
        id: user.id,
        name: user.user_metadata?.display_name || user.email || 'Anonymous',
        email: user.email,
        color: userColor
      },
      enablePresence: true,
      enableVersionHistory: false, // TODO: Implement later
      snapshotInterval: 30000 // 30 seconds
    }
  }, [page?.id, team?.id, currentSeason?.id, user?.id])

  // Ref to store editor instance for callbacks
  const editorRef = useRef<ReturnType<typeof useCreateBlockNote> | null>(null)

  // Get current blocks function for snapshots
  const getCurrentBlocks = useCallback((): Block[] => {
    if (!editorRef.current) return []
    return editorRef.current.document
  }, [])

  // Use collaborative notebook hook
  const { doc, provider, isLoaded, syncStatus, activeEditors, saveSnapshot } = useCollaborativeNotebook(
    yjsConfig,
    getCurrentBlocks
  )

  // Image upload handler
  const handleUploadFile = useCallback(async (file: File): Promise<string> => {
    try {
      // Generate unique filename with timestamp
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${page?.team_id || 'temp'}/${fileName}`

      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('notebook-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading image:', error)
        throw new Error('Failed to upload image')
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('notebook-images')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error in handleUploadFile:', error)
      throw error
    }
  }, [page?.team_id])

  // Load content when page changes
  useEffect(() => {
    if (!page || !team || !currentSeason || !isLoaded) {
      setInitialContent(undefined)
      return
    }

    const loadPageContent = async () => {
      let loadedBlocks: Block[] | undefined

      try {
        // Load from Supabase Storage
        if (page.content_path) {
          const result = await loadNotebookContent(team.id, currentSeason.id, page.id)
          if (result.success && result.blocks) {
            loadedBlocks = result.blocks
          }
        }
        // FALLBACK: Legacy content from DB
        else if (page.content) {
          if (Array.isArray(page.content)) {
            loadedBlocks = page.content as Block[]
          } else if (typeof page.content === 'string') {
            try {
              const parsed = JSON.parse(page.content)
              if (Array.isArray(parsed)) {
                loadedBlocks = parsed as Block[]
              }
            } catch (e) {
              console.warn('Failed to parse content as JSON:', e)
            }
          }
        }
      } catch (error) {
        console.error('[Editor] Error loading content:', error)
      }

      const blocksToLoad = loadedBlocks && loadedBlocks.length > 0
        ? loadedBlocks
        : [{ type: 'paragraph', content: [] }] as unknown as Block[]

      setInitialContent(blocksToLoad)
    }

    loadPageContent()
  }, [page?.id, team?.id, currentSeason?.id, isLoaded])

  // Create BlockNote editor instance
  // Note: Full Yjs collaboration will be added in Phase 2
  // For now, we use reliable snapshot-based autosave
  const editor = useCreateBlockNote({
    initialContent: initialContent,
    uploadFile: handleUploadFile
  }, [initialContent])

  // Store editor ref for callbacks
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Sync local state with page prop changes
  useEffect(() => {
    if (page) {
      setTitle(page.title || 'Untitled')
      setLinkedEntityType(page.linked_entity_type)
      setLinkedEntityId(page.linked_entity_id)
      setShowLinkSelector(!!page.linked_entity_type)
    }
  }, [page?.id, page?.title, page?.linked_entity_type, page?.linked_entity_id])

  // Save title changes to database (metadata only, content synced via Yjs)
  useEffect(() => {
    if (!page || !onUpdatePage) return
    if (title === page.title) return // No change

    // Debounce title updates
    const timeout = setTimeout(() => {
      onUpdatePage(page.id, { title })
    }, 1000)

    return () => clearTimeout(timeout)
  }, [title, page?.id, page?.title, onUpdatePage])

  // Save entity link changes to database (metadata only)
  useEffect(() => {
    if (!page || !onUpdatePage) return
    if (linkedEntityType === page.linked_entity_type && linkedEntityId === page.linked_entity_id) return // No change

    // Save immediately for entity links
    onUpdatePage(page.id, {
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId
    })
  }, [linkedEntityType, linkedEntityId, page?.id, page?.linked_entity_type, page?.linked_entity_id, onUpdatePage])

  // Notify parent of sync state changes
  useEffect(() => {
    if (onSaveStateChange) {
      onSaveStateChange({
        isSaving: syncStatus.state === 'connecting' || syncStatus.state === 'reconnecting',
        hasPendingSave: !syncStatus.isSynced
      })
    }
  }, [syncStatus, onSaveStateChange])

  // Show loading if not ready
  if (!editor || !isLoaded || !initialContent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isLoaded ? 'Connecting...' : 'Loading content...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Title Header */}
      <div className="border-b bg-background sticky top-0 z-20">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => { isEditingTitleRef.current = true }}
                  onBlur={() => { isEditingTitleRef.current = false }}
                  className="text-2xl md:text-4xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 transition-all"
                  placeholder="Untitled note"
                />
                {linkedEntityType && linkedEntityId && (
                  <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                    {linkedEntityType === 'event' && <Calendar className="w-3 h-3" />}
                    {linkedEntityType === 'mentoring_session' && <Users className="w-3 h-3" />}
                    {linkedEntityType === 'task' && <FolderKanban className="w-3 h-3" />}
                    <span className="text-xs">
                      {linkedEntityType === 'event' && 'Event'}
                      {linkedEntityType === 'mentoring_session' && 'Session'}
                      {linkedEntityType === 'task' && 'Task'}
                    </span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                {/* Autosave Status */}
                {syncStatus.isSynced && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Auto-saved</span>
                  </div>
                )}
                {!syncStatus.isSynced && syncStatus.state !== 'error' && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {syncStatus.state === 'error' && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Save error - will retry</span>
                  </div>
                )}
              </div>

              {/* Entity Link Selector */}
              {(showLinkSelector || linkedEntityType) && (
                <div className="mt-2">
                  <EntityLinkSelector
                    linkedEntityType={linkedEntityType}
                    linkedEntityId={linkedEntityId}
                    onLinkChange={(type, id) => {
                      setLinkedEntityType(type)
                      setLinkedEntityId(id)
                      // Save will be triggered by the useEffect watching these values
                    }}
                  />
                </div>
              )}
            </div>
            {!showLinkSelector && !linkedEntityType && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => setShowLinkSelector(true)}
                  variant="outline"
                  size="sm"
                >
                  <Link2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Add Link</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <BlockNoteView
            editor={editor}
            theme={resolvedTheme}
          />
        </div>
      </div>
    </div>
  )
}
