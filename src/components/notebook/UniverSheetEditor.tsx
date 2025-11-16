'use client'

import React, { useEffect, useRef, useState } from 'react'
import { NotebookSheet } from '@/types/notebook'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { useSheetSave } from '@/hooks/useSheetSave'
import { loadSheetData } from '@/lib/notebookSheetStorage'
import { createUniver, defaultTheme } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import enUS from '@univerjs/preset-sheets-core/lib/locales/en-US'

interface UniverSheetEditorProps {
  sheet: NotebookSheet
  onUpdate: (id: string, data: Partial<NotebookSheet>) => Promise<boolean>
}

export function UniverSheetEditor({ sheet, onUpdate }: UniverSheetEditorProps) {
  const { user } = useAuth()
  const { team, currentSeason } = useAppData()
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<ReturnType<typeof createUniver> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [needsRefresh, setNeedsRefresh] = useState(false)

  const { mutate: saveSheet, isPending: isSaving } = useSheetSave(
    async (id, data) => {
      await onUpdate(id, data)
    },
    sheet
  )

  // Refresh sheet data if needed (after first save sets sheet_data_path)
  useEffect(() => {
    if (needsRefresh) {
      console.log('[UniverSheetEditor] 🔄 Refreshing sheet data to get updated sheet_data_path')
      // Trigger a re-fetch by calling onUpdate with empty data
      // This will cause the parent to refresh the sheet from the database
      onUpdate(sheet.id, {}).then(() => {
        setNeedsRefresh(false)
      })
    }
  }, [needsRefresh, sheet.id, onUpdate])

  // Initialize Univer and load sheet data
  useEffect(() => {
    console.log('[UniverSheetEditor] useEffect triggered', {
      hasContainer: !!containerRef.current,
      hasTeam: !!team,
      hasSeason: !!currentSeason,
      sheetId: sheet.id,
      sheetDataPath: sheet.sheet_data_path,
      teamId: team?.id,
      seasonId: currentSeason?.id
    })

    if (!containerRef.current || !team || !currentSeason) {
      console.log('[UniverSheetEditor] Missing dependencies, skipping init')
      return
    }

    // Check if container has valid dimensions
    const rect = containerRef.current.getBoundingClientRect()
    console.log('[UniverSheetEditor] Container dimensions:', { width: rect.width, height: rect.height })

    if (rect.width === 0 || rect.height === 0) {
      console.log('[UniverSheetEditor] Container has no dimensions, skipping init')
      return
    }

    // Variables that need to be accessible in cleanup
    let univerInstance: any = null
    let autosaveInterval: NodeJS.Timeout | null = null
    let isActive = true // Flag to prevent using disposed instance

    const initUniver = async () => {
      try {
        console.log('[UniverSheetEditor] Starting initialization...')
        setIsLoading(true)
        setError(null)

        // Check if still active after any await
        if (!isActive) {
          console.log('[UniverSheetEditor] Aborted - component unmounted during init')
          return
        }

        // Create Univer instance
        console.log('[UniverSheetEditor] Creating Univer instance...')
        let univer: any
        let univerAPI: any

        try {
          const result = createUniver({
            locale: enUS,
            locales: {
              'en-US': enUS
            },
            theme: defaultTheme,
            presets: [
              UniverSheetsCorePreset({
                container: containerRef.current!
              })
            ],
          })
          univer = result.univer
          univerAPI = result.univerAPI
          console.log('[UniverSheetEditor] Univer instance created')
        } catch (err) {
          console.error('[UniverSheetEditor] Failed to create Univer instance:', err)
          throw err
        }

        univerInstance = univer // Store for cleanup
        univerRef.current = { univer, univerAPI }

        // Load existing sheet data or create new workbook
        if (sheet.sheet_data_path) {
          console.log('[UniverSheetEditor] 📂 Loading existing sheet data from:', sheet.sheet_data_path)
          const loadResult = await loadSheetData(team.id, currentSeason.id, sheet.id)

          // Check if component unmounted during async load
          if (!isActive) {
            console.log('[UniverSheetEditor] Aborted after loadSheetData - component unmounted')
            return
          }

          console.log('[UniverSheetEditor] Load result:', {
            success: loadResult.success,
            hasWorkbook: !!loadResult.workbook,
            error: loadResult.error
          })

          if (loadResult.success && loadResult.workbook) {
            // Create workbook with loaded data
            console.log('[UniverSheetEditor] ✅ Creating workbook with loaded data')
            univerAPI.createWorkbook(loadResult.workbook)
          } else {
            // Failed to load, create empty workbook
            console.error('[UniverSheetEditor] ❌ Failed to load sheet data:', loadResult.error)
            console.log('[UniverSheetEditor] Creating empty workbook instead')
            univerAPI.createWorkbook({})
          }
        } else {
          // New sheet, let Univer create default workbook
          console.log('[UniverSheetEditor] 📄 New sheet - creating default workbook')
          // Don't pass any structure, let Univer create defaults
          univerAPI.createWorkbook()
        }

        console.log('[UniverSheetEditor] Workbook created, initialization complete')

        // Set up autosave - check for changes every 3 seconds
        console.log('[UniverSheetEditor] Setting up autosave...')
        let lastSnapshot: string | null = null
        let isSaving = false

        autosaveInterval = setInterval(async () => {
          if (isSaving || !isActive) return // Don't save if already saving or component unmounted

          try {
            // Extra safety: check if univerAPI and workbook are still accessible
            if (!univerAPI || !univerAPI.getActiveWorkbook) {
              console.warn('[UniverSheetEditor] univerAPI is no longer available, skipping autosave')
              return
            }

            const activeWorkbook = univerAPI.getActiveWorkbook()
            if (!activeWorkbook) {
              console.warn('[UniverSheetEditor] No active workbook, skipping autosave')
              return
            }

            const currentSnapshot = JSON.stringify(activeWorkbook.save())

            // Only save if the workbook has changed
            if (lastSnapshot !== null && currentSnapshot !== lastSnapshot) {
              console.log('[UniverSheetEditor] 📝 Changes detected, autosaving...', {
                sheetId: sheet.id,
                snapshotLength: currentSnapshot.length
              })
              isSaving = true

              const snapshot = univerAPI.getActiveWorkbook()?.save()
              if (snapshot) {
                console.log('[UniverSheetEditor] 💾 Calling saveSheet with data:', {
                  sheetId: sheet.id,
                  teamId: team.id,
                  seasonId: currentSeason.id,
                  hasData: !!snapshot
                })

                saveSheet({
                  sheetId: sheet.id,
                  teamId: team.id,
                  seasonId: currentSeason.id,
                  workbookData: snapshot
                }, {
                  onSuccess: () => {
                    console.log('[UniverSheetEditor] ✅ Save successful')
                    // If this was the first save (no path before), trigger a refresh
                    if (!sheet.sheet_data_path) {
                      console.log('[UniverSheetEditor] 🔄 First save - will refresh to get sheet_data_path')
                      setNeedsRefresh(true)
                    }
                    isSaving = false
                  },
                  onError: (error) => {
                    console.error('[UniverSheetEditor] ❌ Save failed:', error)
                    isSaving = false
                  }
                })
              } else {
                console.warn('[UniverSheetEditor] ⚠️ No snapshot to save')
                isSaving = false
              }
            }

            lastSnapshot = currentSnapshot
          } catch (err) {
            console.error('[UniverSheetEditor] Autosave error:', err)
            isSaving = false
          }
        }, 3000) // Check every 3 seconds

        console.log('[UniverSheetEditor] Setting isLoading to false')
        setIsLoading(false)
      } catch (err) {
        console.error('[UniverSheetEditor] Initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize spreadsheet')
        setIsLoading(false)
      }
    }

    console.log('[UniverSheetEditor] Calling initUniver()')
    initUniver()

    // Cleanup function - called when component unmounts or dependencies change
    return () => {
      console.log('[UniverSheetEditor] 🧹 Cleaning up...')
      isActive = false // Prevent async operations from using disposed instance
      if (autosaveInterval) {
        clearInterval(autosaveInterval)
      }
      if (univerInstance) {
        univerInstance.dispose()
      }
    }
  }, [sheet.id, sheet.sheet_data_path, team?.id, currentSeason?.id])

  return (
    <div className="relative w-full h-full">
      {/* Univer container - always rendered so ref can attach */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ minWidth: '100px', minHeight: '500px' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading spreadsheet...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center text-destructive">
            <p className="font-semibold mb-2">Error loading spreadsheet</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {isSaving && !isLoading && !error && (
        <div className="absolute top-2 right-2 bg-background/90 border rounded px-3 py-1 text-sm text-muted-foreground">
          Saving...
        </div>
      )}
    </div>
  )
}
