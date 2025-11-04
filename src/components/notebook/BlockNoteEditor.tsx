'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, Check, Link2, Calendar, Users, FolderKanban, AlertCircle } from 'lucide-react'
import { NotebookPage, LinkedEntityType } from '@/types/notebook'
import { EntityLinkSelector } from './EntityLinkSelector'
import { supabase } from '@/lib/supabase'
import { loadNotebookContent } from '@/lib/notebookStorage'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/components/ThemeProvider'
import { useNotebookSave } from '@/hooks/useNotebookSave'
import type { Block } from '@blocknote/core'
import { useDebouncedCallback } from 'use-debounce'

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

  const [initialContent, setInitialContent] = useState<{ pageId: string; blocks: Block[]; sequence: number } | "loading">("loading")
  const [linkedEntityType, setLinkedEntityType] = useState<LinkedEntityType | undefined>(page?.linked_entity_type)
  const [linkedEntityId, setLinkedEntityId] = useState<string | undefined>(page?.linked_entity_id)
  const [showLinkSelector, setShowLinkSelector] = useState(false)

  // TanStack Query mutation for saving
  const { mutate: saveNotebook, isPending: isSaving, isSuccess, isError } = useNotebookSave(onUpdatePage, page)

  // Track refs
  const currentPageIdRef = useRef<string | undefined>(undefined)
  const editorPageIdRef = useRef<string | undefined>(undefined)
  const loadingSequenceRef = useRef<number>(0)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isEditingTitleRef = useRef(false)
  const lastSavedTitleRef = useRef<string>('')
  const lastSavedEntityTypeRef = useRef<LinkedEntityType | undefined>(undefined)
  const lastSavedEntityIdRef = useRef<string | undefined>(undefined)

  // Track if there's a pending debounced save
  const [hasPendingSave, setHasPendingSave] = useState(false)

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
    if (!page || !team || !currentSeason) {
      setInitialContent("loading")
      editorPageIdRef.current = undefined // Invalidate old editor
      return
    }

    // CRITICAL: Only reload if the page ID actually changed
    // Don't reload if just title/metadata changed
    if (editorPageIdRef.current === page.id) {
      return
    }

    const loadPageContent = async () => {
      // CRITICAL: Increment sequence number for this load
      loadingSequenceRef.current += 1
      const thisLoadSequence = loadingSequenceRef.current

      // CRITICAL: Clear the editor page ID immediately to invalidate any old editor instances
      // This ensures old onChange handlers will be blocked
      editorPageIdRef.current = undefined

      setInitialContent("loading")

      let loadedBlocks: Block[] | undefined

      try {
        // ALWAYS load from Supabase Storage on mount to ensure we have the latest data
        // Try to load from Supabase Storage first
        if (page.content_path) {
          const result = await loadNotebookContent(team.id, currentSeason.id, page.id)
          if (result.success && result.blocks) {
            loadedBlocks = result.blocks
          }
        }
        // FALLBACK: If content exists in DB (legacy), use it
        else if (page.content) {
          // If content is already an array (BlockNote format), use it
          if (Array.isArray(page.content)) {
            loadedBlocks = page.content as Block[]
          }
          // If content is a stringified array, parse it
          else if (typeof page.content === 'string') {
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

      // Set the initial content for editor creation
      const blocksToLoad = loadedBlocks && loadedBlocks.length > 0
        ? loadedBlocks
        : [{ type: 'paragraph', content: [] }] as unknown as Block[]

      // CRITICAL: Only set content if this is still the latest load
      if (thisLoadSequence !== loadingSequenceRef.current) {
        return
      }

      // CRITICAL: Mark which page this editor instance will be for
      editorPageIdRef.current = page.id

      // Set initial content with page ID and sequence to prevent race conditions
      setInitialContent({ pageId: page.id, blocks: blocksToLoad, sequence: thisLoadSequence })
    }

    loadPageContent()
  }, [page, team, currentSeason])

  // Create BlockNote editor instance - recreated when initialContent changes
  const editorInitialContent = useMemo(() => {
    if (initialContent === "loading") {
      return undefined
    }

    return initialContent.blocks
  }, [initialContent])

  const editor = useCreateBlockNote({
    initialContent: editorInitialContent,
    uploadFile: handleUploadFile,
  }, [editorInitialContent])

  // Debounced save function using TanStack Query mutation
  const debouncedSave = useDebouncedCallback(
    (pageId: string, blocks: Block[], metadata?: { title?: string; linked_entity_type?: LinkedEntityType; linked_entity_id?: string }) => {
      if (!team || !currentSeason) {
        setHasPendingSave(false)
        return
      }

      setHasPendingSave(false) // Clear pending flag when save actually fires

      saveNotebook({
        pageId,
        teamId: team.id,
        seasonId: currentSeason.id,
        blocks,
        userId: user?.id,
        metadata
      })
    },
    // 2 second debounce - TanStack Query will handle queuing and retry
    2000,
    { leading: false, trailing: true }
  )

  // Sync local state with page prop changes (ONLY when page ID changes)
  useEffect(() => {
    // Page has changed - flush any pending debounced saves
    if (editor && currentPageIdRef.current && currentPageIdRef.current !== page?.id) {
      debouncedSave.flush() // Force immediate execution of pending debounced saves
    }

    // Update the current page ref immediately
    currentPageIdRef.current = page?.id

    // Update state for the new page
    if (page) {
      const newTitle = page.title || 'Untitled'
      setTitle(newTitle)
      setLinkedEntityType(page.linked_entity_type)
      setLinkedEntityId(page.linked_entity_id)
      setShowLinkSelector(!!page.linked_entity_type)

      // Initialize the "last saved" refs to prevent immediate save on page load
      lastSavedTitleRef.current = newTitle
      lastSavedEntityTypeRef.current = page.linked_entity_type
      lastSavedEntityIdRef.current = page.linked_entity_id
    }
    // IMPORTANT: Only depend on page.id, not title/metadata
    // This prevents circular updates when save updates the page prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id, editor, debouncedSave])

  // Auto-save content changes with debouncing
  useEffect(() => {
    // Only save if we have a valid page, editor is ready, and initialContent is loaded
    if (!page || !page.id || !editor || initialContent === "loading") {
      return
    }

    // Capture the page ID this editor instance belongs to
    const editorPageId = editorPageIdRef.current

    // Set up onChange listener
    const unsubscribeOnChange = editor.onChange(() => {
      // Verify this editor instance belongs to the current page
      if (editorPageId !== editorPageIdRef.current || editorPageId !== currentPageIdRef.current) {
        return
      }

      // Mark that we have a pending save
      setHasPendingSave(true)

      // Capture current blocks and trigger debounced save
      const blocksToSave = editor.document
      debouncedSave(page.id, blocksToSave, {
        title,
        linked_entity_type: linkedEntityType,
        linked_entity_id: linkedEntityId
      })
    })

    return () => {
      unsubscribeOnChange()
    }
  }, [page, initialContent, editor, debouncedSave, title, linkedEntityType, linkedEntityId])

  // Save when title changes (only if it's different from what was last saved)
  useEffect(() => {
    if (!page || !page.id || !editor || initialContent === "loading") return
    if (title === lastSavedTitleRef.current) return

    lastSavedTitleRef.current = title
    setHasPendingSave(true)
    debouncedSave(page.id, editor.document, {
      title,
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, page?.id, editor, initialContent, debouncedSave, linkedEntityType, linkedEntityId])

  // Save when entity links change (only if different from what was last saved)
  useEffect(() => {
    if (!page || !page.id || !editor || initialContent === "loading") return
    if (linkedEntityType === lastSavedEntityTypeRef.current && linkedEntityId === lastSavedEntityIdRef.current) return

    lastSavedEntityTypeRef.current = linkedEntityType
    lastSavedEntityIdRef.current = linkedEntityId
    setHasPendingSave(true)
    debouncedSave(page.id, editor.document, {
      title,
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedEntityType, linkedEntityId, page?.id, editor, initialContent, debouncedSave, title])

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      debouncedSave.flush()
    }
  }, [debouncedSave])

  // Notify parent of save state changes
  useEffect(() => {
    if (onSaveStateChange) {
      onSaveStateChange({ isSaving, hasPendingSave })
    }
  }, [isSaving, hasPendingSave, onSaveStateChange])

  // Show loading if editor isn't ready OR if we don't have valid content for the current page
  const isContentReady = initialContent !== "loading" &&
                         page?.id !== undefined &&
                         initialContent.pageId === page.id

  if (!editor || !isContentReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isContentReady ? 'Loading content...' : 'Preparing editor...'}
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
                {(isSaving || hasPendingSave) && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {isSuccess && !isSaving && !hasPendingSave && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </div>
                )}
                {isError && !isSaving && !hasPendingSave && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Save failed - will retry</span>
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
