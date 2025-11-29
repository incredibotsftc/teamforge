'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Table, Plus, FileSpreadsheet, Trash2, MoreVertical, Save } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLuckysheetList, type LuckysheetPage } from '@/hooks/useLuckysheetList'
import { useLuckysheetSave } from '@/hooks/useLuckysheetSave'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { supabase } from '@/lib/supabase'
import { useDebouncedCallback } from 'use-debounce'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Dynamically import Luckysheet component (client-side only)
const LuckysheetComponent = dynamic(() => import('@/components/LuckysheetComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Loading spreadsheet...</p>
    </div>
  ),
})

export default function SheetPage() {
  const { user } = useAuth()
  const { team, currentSeason } = useAppData()
  const { data: sheets = [], isLoading: sheetsLoading, refetch: refetchSheets } = useLuckysheetList()
  const { mutate: saveLuckysheet } = useLuckysheetSave()

  const [selectedSheet, setSelectedSheet] = useState<LuckysheetPage | null>(null)
  const [sheetTitle, setSheetTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Select first sheet by default when sheets load
  useEffect(() => {
    if (sheets.length > 0 && !selectedSheet) {
      setSelectedSheet(sheets[0])
      setSheetTitle(sheets[0].title)
    }
  }, [sheets, selectedSheet])

  // Manual save function
  const handleManualSave = useCallback(() => {
    if (!selectedSheet || !team || !currentSeason || !user) {
      console.error('Cannot save: missing required data', { selectedSheet, team, currentSeason, user })
      return
    }

    // Get current workbook data from Luckysheet
    const workbookData = (window as any).luckysheet?.getAllSheets?.()

    if (!workbookData) {
      console.error('Cannot get workbook data from Luckysheet')
      return
    }

    console.log('Manual save triggered', {
      pageId: selectedSheet.id,
      title: sheetTitle,
      workbookSheetCount: workbookData.length
    })

    setIsSaving(true)
    saveLuckysheet(
      {
        pageId: selectedSheet.id,
        teamId: team.id,
        seasonId: currentSeason.id,
        workbookData,
        userId: user.id,
        metadata: { title: sheetTitle },
      },
      {
        onSuccess: () => {
          console.log('✅ Save successful!')
          setIsSaving(false)
          setLastSaved(new Date())
          refetchSheets()
        },
        onError: (error) => {
          console.error('❌ Save failed:', error)
          setIsSaving(false)
          alert(`Failed to save sheet: ${error.message}`)
        },
      }
    )
  }, [selectedSheet, team, currentSeason, user, sheetTitle, saveLuckysheet, refetchSheets])

  // Debounced save function (for auto-save)
  const debouncedSave = useDebouncedCallback(
    useCallback((workbookData: any, title: string) => {
      if (!selectedSheet || !team || !currentSeason || !user) return

      console.log('Auto-save triggered')
      setIsSaving(true)
      saveLuckysheet(
        {
          pageId: selectedSheet.id,
          teamId: team.id,
          seasonId: currentSeason.id,
          workbookData,
          userId: user.id,
          metadata: { title },
        },
        {
          onSuccess: () => {
            console.log('✅ Auto-save successful!')
            setIsSaving(false)
            setLastSaved(new Date())
            refetchSheets()
          },
          onError: (error) => {
            console.error('❌ Auto-save failed:', error)
            setIsSaving(false)
          },
        }
      )
    }, [selectedSheet, team, currentSeason, user, saveLuckysheet, refetchSheets]),
    3000 // 3 second debounce for auto-save
  )

  // Handle data changes from Luckysheet
  const handleSheetChange = (workbookData: any) => {
    debouncedSave(workbookData, sheetTitle)
  }

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setSheetTitle(newTitle)
    if (selectedSheet) {
      debouncedSave(selectedSheet.content?.data, newTitle)
    }
  }

  // Create new sheet
  const handleCreateSheet = async () => {
    if (!team || !currentSeason || !user) return

    try {
      const { data: newPage, error } = await supabase
        .from('notebook_pages')
        .insert({
          team_id: team.id,
          season_id: currentSeason.id,
          title: 'New Sheet',
          page_type: 'luckysheet',
          content: {
            type: 'luckysheet',
            data: null,
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Refetch sheets and select the new one
      await refetchSheets()
      setSelectedSheet(newPage as LuckysheetPage)
      setSheetTitle(newPage.title)
    } catch (error) {
      console.error('Failed to create sheet:', error)
    }
  }

  // Delete sheet
  const handleDeleteSheet = async (sheetId: string) => {
    if (!confirm('Are you sure you want to delete this sheet?')) return

    try {
      const { error } = await supabase
        .from('notebook_pages')
        .delete()
        .eq('id', sheetId)

      if (error) throw error

      // If this was the selected sheet, clear selection
      if (selectedSheet?.id === sheetId) {
        setSelectedSheet(null)
        setSheetTitle('')
      }

      await refetchSheets()
    } catch (error) {
      console.error('Failed to delete sheet:', error)
    }
  }

  // Action buttons for the top navigation
  const actionButtons = (
    <div className="flex items-center gap-2">
      {selectedSheet && (
        <Button
          variant="default"
          size="sm"
          onClick={handleManualSave}
          disabled={isSaving}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      )}
      <Button variant="default" size="sm" className="btn-accent" onClick={handleCreateSheet}>
        <Plus className="w-4 h-4 mr-2" />
        New Sheet
      </Button>
    </div>
  )

  return (
    <ProtectedRoute>
      <DashboardLayout pageTitle="Sheets" pageIcon={Table} actions={actionButtons} disableContentScroll={true}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm text-muted-foreground">Saved Sheets</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sheetsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading sheets...</div>
              ) : sheets.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-4">No sheets yet</p>
                  <Button variant="outline" size="sm" onClick={handleCreateSheet} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Sheet
                  </Button>
                </div>
              ) : (
                <div className="p-2">
                  {sheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className={cn(
                        'group flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent mb-1',
                        selectedSheet?.id === sheet.id && 'bg-accent'
                      )}
                      onClick={() => {
                        setSelectedSheet(sheet)
                        setSheetTitle(sheet.title)
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{sheet.title}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSheet(sheet.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {selectedSheet ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-4">
                  <Input
                    value={sheetTitle}
                    onChange={handleTitleChange}
                    className="max-w-md"
                    placeholder="Sheet title"
                  />
                  <div className="text-sm text-muted-foreground">
                    {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Ready'}
                  </div>
                </div>

                {/* Spreadsheet */}
                <div className="flex-1 relative">
                  <LuckysheetComponent
                    containerId={`luckysheet-${selectedSheet.id}`}
                    height="100%"
                    data={selectedSheet.content?.data}
                    onChange={handleSheetChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sheet selected</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {sheets.length === 0
                      ? 'Create your first sheet to get started with spreadsheets.'
                      : 'Select a sheet from the sidebar or create a new one.'}
                  </p>
                  <Button onClick={handleCreateSheet} className="btn-accent">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Sheet
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
