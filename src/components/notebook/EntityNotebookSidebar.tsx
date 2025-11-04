'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BlockNoteEditor } from './BlockNoteEditor'
import { NotebookPage, LinkedEntityType } from '@/types/notebook'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { getOrCreateNotebookPageForEntity, getNotebookTitleForEntity } from '@/lib/notebookHelpers'
import { Loader2, FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'

interface EntityNotebookSidebarProps {
  isOpen: boolean
  onClose: () => void
  entityType: LinkedEntityType
  entityId: string
  entityTitle: string
  onUpdatePage?: (pageId: string, data: {
    title?: string
    content?: unknown
    content_text?: string
    content_path?: string
    content_size?: number
    linked_entity_type?: LinkedEntityType
    linked_entity_id?: string
  }) => Promise<void>
}

/**
 * EntityNotebookSidebar - Reusable sidebar component for entity-linked notebook pages
 *
 * Opens in a Sheet (sidebar) and displays a BlockNote editor for the linked notebook page.
 * If no page exists for the entity, it will create one automatically in the appropriate folder.
 *
 * Usage:
 * ```tsx
 * <EntityNotebookSidebar
 *   isOpen={isNotebookOpen}
 *   onClose={() => setIsNotebookOpen(false)}
 *   entityType="event"
 *   entityId={eventId}
 *   entityTitle={eventTitle}
 * />
 * ```
 */
export function EntityNotebookSidebar({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityTitle,
  onUpdatePage
}: EntityNotebookSidebarProps) {
  const { user } = useAuth()
  const { team, currentSeason } = useAppData()
  const [notebookPage, setNotebookPage] = useState<NotebookPage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load or create notebook page when sidebar opens
  useEffect(() => {
    if (!isOpen || !entityId || !team || !currentSeason || !user) {
      return
    }

    const loadNotebookPage = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const title = getNotebookTitleForEntity(entityType, entityTitle)

        const page = await getOrCreateNotebookPageForEntity(
          team.id,
          currentSeason.id,
          entityType,
          entityId,
          title,
          user.id
        )

        if (!page) {
          throw new Error('Failed to load or create notebook page')
        }

        setNotebookPage(page)
      } catch (err) {
        console.error('Error loading notebook page:', err)
        setError('Failed to load notebook. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadNotebookPage()
  // Only reload when the entity ID changes, NOT when the title changes
  // entityTitle is only used for initial creation, not for reloading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entityType, entityId, team?.id, currentSeason?.id, user?.id])

  // Reset state when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setNotebookPage(null)
      setError(null)
    }
  }, [isOpen])

  const handleUpdatePage = async (
    pageId: string,
    data: {
      title?: string
      content?: unknown
      content_text?: string
      content_path?: string
      content_size?: number
      linked_entity_type?: LinkedEntityType
      linked_entity_id?: string
    }
  ) => {
    try {
      // If parent component provided an update handler, use it
      if (onUpdatePage) {
        await onUpdatePage(pageId, data)
      } else {
        // Default implementation: update the database directly
        // Only update the fields that were provided
        const updateData: Record<string, unknown> = {}
        if (data.title !== undefined) updateData.title = data.title
        if (data.content !== undefined) updateData.content = data.content
        if (data.content_text !== undefined) updateData.content_text = data.content_text
        if (data.content_path !== undefined) updateData.content_path = data.content_path
        if (data.content_size !== undefined) updateData.content_size = data.content_size
        if (data.linked_entity_type !== undefined) updateData.linked_entity_type = data.linked_entity_type
        if (data.linked_entity_id !== undefined) updateData.linked_entity_id = data.linked_entity_id

        // Always update the updated_at timestamp
        updateData.updated_at = new Date().toISOString()

        const { error } = await supabase
          .from('notebook_pages')
          .update(updateData)
          .eq('id', pageId)

        if (error) {
          console.error('[EntityNotebookSidebar] Error updating page:', error)
          throw error
        }
      }

      // DO NOT update local state - it causes the editor to re-render and can trigger onChange loops
      // The editor maintains its own state and doesn't need the parent to update it
    } catch (error) {
      console.error('[EntityNotebookSidebar] Error in handleUpdatePage:', error)
      // Don't rethrow - we don't want to break the editor
    }
  }

  const getEntityTypeLabel = (type: LinkedEntityType): string => {
    switch (type) {
      case 'event':
        return 'Event'
      case 'mentoring_session':
        return 'Mentoring Session'
      case 'task':
        return 'Task'
      case 'scouting_team':
        return 'Scouting Team'
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {getEntityTypeLabel(entityType)} Notes
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Documentation for: {entityTitle}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading notebook...</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {notebookPage && !isLoading && !error && (
            <div className="h-full">
              <BlockNoteEditor
                key={notebookPage.id}
                page={notebookPage}
                onUpdatePage={handleUpdatePage}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
