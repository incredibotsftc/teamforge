'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Download, Table } from 'lucide-react'
import { useSheetSave } from '@/hooks/useSheetSave'
import dynamic from 'next/dynamic'
// load AG Grid wrapper dynamically (client-only)
const AGGridWrapper = dynamic(() => import('./AGGridWrapper'), { ssr: false })
import type { NotebookPage } from '@/types/notebook'

interface SheetEditorProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  embedded?: boolean
  page?: NotebookPage
  onUpdatePage?: (id: string, data: { title?: string; content?: unknown; content_text?: string }) => Promise<void>
}

function makeEmptyGrid(rows: number, cols: number) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
}

export function SheetEditor({ open, onOpenChange, embedded = false, page, onUpdatePage }: SheetEditorProps) {
  const { mutate: saveSheet } = useSheetSave()
  const [title, setTitle] = useState<string>(page?.title ?? '')
  // Legacy grid removed. Only AG Grid is supported.
  const [fileData, setFileData] = useState<any>(() => {
    if (page?.content && typeof page.content === 'object' && (page.content as any).type === 'aggrid') {
      return (page.content as any).data
    }
    return null
  })
  const [hasPendingSave, setHasPendingSave] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Debounced save function for AG Grid file data (and title)
  const debouncedSaveFile = useDebouncedCallback(
    useCallback((fileToSave: any, titleToSave: string) => {
      if (!page) return

      setIsSaving(true)
      if (onUpdatePage) {
        onUpdatePage(page.id, {
          title: titleToSave,
          content: { type: 'aggrid', data: fileToSave },
          content_text: `Sheet (aggrid) updated`
        }).finally(() => {
          setIsSaving(false)
          setHasPendingSave(false)
        })
      } else {
        setIsSaving(false)
        setHasPendingSave(false)
      }
    }, [page, onUpdatePage]),
    1000
  )

  // Auto-save when univer file data changes
  useEffect(() => {
    if (!page) return
    if (fileData) {
      setHasPendingSave(true)
      debouncedSaveFile(fileData, title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData, title])

  // Flush saves on unmount
  useEffect(() => {
    return () => {
      debouncedSaveFile.flush()
    }
  }, [debouncedSaveFile])



  // Keep title synced when page changes
  useEffect(() => {
    setTitle(page?.title ?? '')
  }, [page?.id])








  // Render embedded version (AG Grid only)
  if (embedded) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              // Flush an immediate save on title blur
              if (page && onUpdatePage) {
                setIsSaving(true)
                onUpdatePage(page.id, {
                  title,
                  content: { type: 'aggrid', data: fileData },
                  content_text: `Sheet (aggrid) updated`
                }).finally(() => setIsSaving(false))
              }
            }}
            placeholder="Untitled Sheet"
            className="flex-1"
          />
          <div className="text-sm text-muted-foreground">{isSaving ? 'Saving…' : hasPendingSave ? 'Unsaved' : 'Saved'}</div>
        </div>
        <div className="flex-1 overflow-hidden">
          <AGGridWrapper
            data={fileData}
            height="calc(100% - 48px)"
            onChange={(d: any) => {
              setFileData(d)
            }}
          />
        </div>
      </div>
    )
  }

  // Render modal version (AG Grid only)
  return (
    <>
      {open !== undefined && (
        <Dialog open={open} onOpenChange={onOpenChange || (() => {})}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Sheet Editor</DialogTitle>
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    if (page && onUpdatePage) {
                      setIsSaving(true)
                      onUpdatePage(page.id, {
                        title,
                        content: { type: 'aggrid', data: fileData },
                        content_text: `Sheet (aggrid) updated`
                      }).finally(() => setIsSaving(false))
                    }
                  }}
                  placeholder="Untitled Sheet"
                  className="flex-1"
                />
                <div className="text-sm text-muted-foreground">{isSaving ? 'Saving…' : hasPendingSave ? 'Unsaved' : 'Saved'}</div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <AGGridWrapper
                  data={fileData}
                  height="calc(100% - 48px)"
                  onChange={(d: any) => setFileData(d)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
