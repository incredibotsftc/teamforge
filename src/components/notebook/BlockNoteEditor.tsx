'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Loader2, Link2, Calendar, Users, FolderKanban, AlertCircle, Save, Clock } from 'lucide-react'
import { NotebookPage, LinkedEntityType } from '@/types/notebook'
import { EntityLinkSelector } from './EntityLinkSelector'
import { supabase } from '@/lib/supabase'
import { loadNotebookContent, saveNotebookContent, extractPlainText } from '@/lib/notebookStorage'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/components/ThemeProvider'
import type { Block } from '@blocknote/core'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasPendingSave, setHasPendingSave] = useState(false)
  const [isEditorReady, setIsEditorReady] = useState(false)

  // Concurrent edit detection
  const [activeEditors, setActiveEditors] = useState<Array<{ user_id: string; user_name: string }>>([])
  const [showConflictWarning, setShowConflictWarning] = useState(false)

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isEditingTitleRef = useRef(false)
  const editorRef = useRef<ReturnType<typeof useCreateBlockNote> | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const lastRemoteUpdateRef = useRef<Date | null>(null)
  const lastLoadedPageIdRef = useRef<string | null>(null)

  // Image upload handler
  const handleUploadFile = useCallback(async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${page?.team_id || 'temp'}/${fileName}`

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

      const { data: urlData } = supabase.storage
        .from('notebook-images')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error in handleUploadFile:', error)
      throw error
    }
  }, [page?.team_id])

  // Create BlockNote editor instance
  const editor = useCreateBlockNote({
    uploadFile: handleUploadFile,
    initialContent: initialContent
  }, [initialContent])

  // Store editor ref and track when editor view is ready
  useEffect(() => {
    editorRef.current = editor

    if (editor) {
      // Give the editor a moment to fully initialize its view
      // This prevents "editor view is not available" errors with complex content (e.g., images)
      const timer = setTimeout(() => {
        setIsEditorReady(true)
      }, 100)

      return () => {
        clearTimeout(timer)
        setIsEditorReady(false)
      }
    } else {
      setIsEditorReady(false)
    }
  }, [editor])

  // Load initial content - ONLY when page ID changes (not on every page object update)
  useEffect(() => {
    if (!page || !team || !currentSeason) {
      setInitialContent(undefined)
      lastLoadedPageIdRef.current = null
      return
    }

    // Only reload if we're navigating to a different page
    if (lastLoadedPageIdRef.current === page.id) {
      return
    }

    let isMounted = true

    const loadContent = async () => {
      try {
        console.log('[Editor] Loading content for page:', page.id)
        const result = await loadNotebookContent(team.id, currentSeason.id, page.id)

        if (!isMounted) return

        if (result.success && result.blocks && result.blocks.length > 0) {
          console.log('[Editor] Loaded', result.blocks.length, 'blocks')
          setInitialContent(result.blocks)
        } else {
          // New page or empty content - let BlockNote create default content
          console.log('[Editor] No saved content, using default empty content')
          setInitialContent(undefined)
        }

        lastLoadedPageIdRef.current = page.id
      } catch {
        // Gracefully handle errors (e.g., file not found for new pages)
        console.log('[Editor] Could not load content (likely new page), using default empty content')
        setInitialContent(undefined)
        lastLoadedPageIdRef.current = page.id
      }
    }

    loadContent()

    return () => {
      isMounted = false
    }
  }, [page?.id, team?.id, currentSeason?.id])

  // Auto-save function
  const saveContent = useCallback(async () => {
    if (!page || !editor || !team || !currentSeason || !onUpdatePage) return

    try {
      setIsSaving(true)
      const blocks = editor.document

      console.log('[Editor] Saving', blocks.length, 'blocks')

      // Save to storage
      const result = await saveNotebookContent(
        team.id,
        currentSeason.id,
        page.id,
        blocks
      )

      if (result.success) {
        // Extract plain text for search
        const contentText = extractPlainText(blocks)

        // Update metadata in database
        await onUpdatePage(page.id, {
          content: blocks,
          content_text: contentText,
          content_path: result.path,
          content_size: result.size
        })

        setLastSaved(new Date())
        setHasPendingSave(false)
        console.log('[Editor] Saved successfully')
      } else {
        console.error('[Editor] Save failed:', result.error)
      }
    } catch (error) {
      console.error('[Editor] Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }, [page, editor, team, currentSeason, onUpdatePage])

  // Debounced auto-save on content change
  useEffect(() => {
    if (!editor) return

    const handleChange = () => {
      setHasPendingSave(true)

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Save after 5 seconds of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        saveContent()
      }, 5000)
    }

    // Listen to editor changes
    editor.onChange(handleChange)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor, saveContent])

  // Realtime subscription for concurrent edit detection
  useEffect(() => {
    if (!page || !team || !user) return

    const channelName = `notebook:${page.id}`
    const channel = supabase.channel(channelName)

    // Broadcast presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const editors = Object.values(state)
          .flat()
          .filter((editor) => {
            const e = editor as unknown as { user_id: string; user_name: string }
            return e.user_id !== user.id
          })
          .map((editor) => {
            const e = editor as unknown as { user_id: string; user_name: string }
            return {
              user_id: e.user_id,
              user_name: e.user_name
            }
          })

        setActiveEditors(editors)
      })
      .on('broadcast', { event: 'page_updated' }, () => {
        // Detect remote updates
        lastRemoteUpdateRef.current = new Date()

        // Show conflict warning if user is editing
        if (hasPendingSave) {
          setShowConflictWarning(true)
          // Auto-hide warning after 10 seconds
          setTimeout(() => setShowConflictWarning(false), 10000)
        }
      })

    // Track our presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          user_name: user.user_metadata?.display_name || user.email || 'Anonymous',
          online_at: new Date().toISOString()
        })
      }
    })

    realtimeChannelRef.current = channel

    return () => {
      channel.unsubscribe()
      realtimeChannelRef.current = null
    }
  }, [page, team, user, hasPendingSave])

  // Broadcast updates when we save
  useEffect(() => {
    if (!lastSaved || !realtimeChannelRef.current) return

    realtimeChannelRef.current.send({
      type: 'broadcast',
      event: 'page_updated',
      payload: {
        user_id: user?.id,
        updated_at: lastSaved.toISOString()
      }
    })
  }, [lastSaved, user?.id])

  // Sync local state with page prop changes
  useEffect(() => {
    if (page) {
      setTitle(page.title || 'Untitled')
      setLinkedEntityType(page.linked_entity_type)
      setLinkedEntityId(page.linked_entity_id)
      setShowLinkSelector(!!page.linked_entity_type)
    }
  }, [page])

  // Save title changes
  useEffect(() => {
    if (!page || !onUpdatePage) return
    if (title === page.title) return

    const timeout = setTimeout(() => {
      onUpdatePage(page.id, { title })
    }, 1000)

    return () => clearTimeout(timeout)
  }, [title, page, onUpdatePage])

  // Save entity link changes
  useEffect(() => {
    if (!page || !onUpdatePage) return
    if (linkedEntityType === page.linked_entity_type && linkedEntityId === page.linked_entity_id) return

    onUpdatePage(page.id, {
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId
    })
  }, [linkedEntityType, linkedEntityId, page, onUpdatePage])

  // Notify parent of save state
  useEffect(() => {
    if (onSaveStateChange) {
      onSaveStateChange({ isSaving, hasPendingSave })
    }
  }, [isSaving, hasPendingSave, onSaveStateChange])

  // Show loading if editor not ready or view not mounted
  // Note: initialContent can be undefined for new pages, that's valid
  if (!editor || !isEditorReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Conflict Warning */}
      {showConflictWarning && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Another user just updated this page. Your changes may conflict. Consider refreshing to see their changes.
          </AlertDescription>
        </Alert>
      )}

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

              {/* Status Bar */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                {/* Save Status */}
                <div className="flex items-center gap-1">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : hasPendingSave ? (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>Unsaved changes</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <Save className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">Saved {lastSaved.toLocaleTimeString()}</span>
                    </>
                  ) : null}
                </div>

                {/* Active Editors */}
                {activeEditors.length > 0 && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Users className="w-3 h-3" />
                    <span>{activeEditors.length} {activeEditors.length === 1 ? 'other' : 'others'} viewing</span>
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
