'use client'

import { useState, useEffect } from 'react'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import type { NotebookPage } from '@/types/notebook'
import { BlockNoteEditor } from '@/components/notebook/BlockNoteEditor'
import { getOrCreateNotebookPageForEntity } from '@/lib/notebookHelpers'
import { supabase } from '@/lib/supabase'

interface ScoutingTeamNotesProps {
  teamNumber: number
  teamName: string
  onClose: () => void
}

export function ScoutingTeamNotes({ teamNumber, teamName, onClose }: ScoutingTeamNotesProps) {
  const { team, currentSeason } = useAppData()
  const { user } = useAuth()
  const [notePage, setNotePage] = useState<NotebookPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState({ isSaving: false, hasPendingSave: false })
  const [pendingClose, setPendingClose] = useState(false)

  useEffect(() => {
    fetchOrCreateNote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamNumber, team, currentSeason])

  // Watch for saves to complete after close is clicked
  useEffect(() => {
    if (pendingClose && !saveState.isSaving && !saveState.hasPendingSave) {
      onClose()
    }
  }, [pendingClose, saveState, onClose])

  const fetchOrCreateNote = async () => {
    if (!team || !currentSeason || !user) return

    setLoading(true)
    try {
      // Use the helper function which automatically assigns to Scouting folder
      const page = await getOrCreateNotebookPageForEntity(
        team.id,
        currentSeason.id,
        'scouting_team',
        teamNumber.toString(),
        `Team ${teamNumber} - ${teamName}`,
        user.id
      )

      if (page) {
        setNotePage(page)
      }
    } catch (error) {
      console.error('[ScoutingTeamNotes] Error fetching/creating note:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePage = async (id: string, data: {
    title?: string
    content?: unknown
    content_text?: string
    content_path?: string
    content_size?: number
    linked_entity_type?: string
    linked_entity_id?: string
  }) => {
    try {
      // Update the database
      const { error } = await supabase
        .from('notebook_pages')
        .update({
          ...(data.title !== undefined && { title: data.title }),
          ...(data.content_text !== undefined && { content_text: data.content_text }),
          ...(data.content_path !== undefined && { content_path: data.content_path }),
          ...(data.content_size !== undefined && { content_size: data.content_size }),
          ...(data.linked_entity_type !== undefined && { linked_entity_type: data.linked_entity_type }),
          ...(data.linked_entity_id !== undefined && { linked_entity_id: data.linked_entity_id }),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id)

      if (error) {
        console.error('[ScoutingTeamNotes] Error updating page:', error)
        throw error
      }

      // Update local state (only update fields that were provided)
      if (notePage) {
        setNotePage({
          ...notePage,
          ...(data.title !== undefined && { title: data.title }),
          ...(data.content_text !== undefined && { content_text: data.content_text }),
          ...(data.content_path !== undefined && { content_path: data.content_path }),
          ...(data.content_size !== undefined && { content_size: data.content_size })
        })
      }
    } catch (error) {
      console.error('[ScoutingTeamNotes] Error in handleUpdatePage:', error)
    }
  }

  const handleClose = () => {
    if (saveState.isSaving || saveState.hasPendingSave) {
      setPendingClose(true)
    } else {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-background z-50 shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Scouting Notes</h2>
            <p className="text-sm text-muted-foreground">
              Team #{teamNumber} - {teamName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={pendingClose}
          >
            {pendingClose ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading notes...</span>
            </div>
          ) : notePage ? (
            <BlockNoteEditor
              page={notePage}
              onUpdatePage={handleUpdatePage}
              onSaveStateChange={setSaveState}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <p className="text-muted-foreground">Failed to load notes</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
