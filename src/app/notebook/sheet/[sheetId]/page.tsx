'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UniverSheetEditor } from '@/components/notebook/UniverSheetEditor'
import { NotebookSidebar } from '@/components/notebook/NotebookSidebar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useNotebookContext } from '@/components/NotebookProvider'
import { BookOpen, Table, FolderOpen, X, MoreVertical, Folder, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FolderDialog } from '@/components/notebook/FolderDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

export default function SheetPage() {
  const params = useParams()
  const router = useRouter()
  const sheetId = params.sheetId as string
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [sidebarSize, setSidebarSize] = useState<number | null>(null)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)

  // Load sidebar size from localStorage on mount
  useEffect(() => {
    const savedSize = localStorage.getItem('notebook-sidebar-size')
    if (savedSize) {
      const size = parseInt(savedSize, 10)
      if (size >= 15 && size <= 40) {
        setSidebarSize(size)
      } else {
        setSidebarSize(25)
      }
    } else {
      setSidebarSize(25)
    }
  }, [])

  const {
    folders,
    pages,
    sheets,
    currentSheet,
    currentFolder,
    isLoading,
    error,
    createFolder,
    createSheet,
    updateSheet,
    updateFolder,
    deleteSheet,
    deleteFolder,
    moveSheetToFolder,
    setCurrentSheet,
    setCurrentFolder
  } = useNotebookContext()

  // Track if we're loading a specific sheet
  const [isLoadingSheet, setIsLoadingSheet] = useState(true)

  // Set current sheet based on URL parameter
  useEffect(() => {
    // When sheetId changes, start loading
    setIsLoadingSheet(true)

    if (sheetId && sheets.length > 0) {
      const sheet = sheets.find(s => s.id === sheetId)
      if (sheet) {
        if (sheet.id !== currentSheet?.id) {
          setCurrentSheet(sheet)
          setCurrentFolder(undefined)
        }
        // Page found, loading complete
        setIsLoadingSheet(false)
      } else {
        // Page not found
        setIsLoadingSheet(false)
      }
    } else if (!isLoading) {
      setIsLoadingSheet(false)
    }
  }, [sheetId, sheets, currentSheet, setCurrentSheet, setCurrentFolder, isLoading])

  const handleCreateSheet = async (data: { title: string; folder_id?: string }) => {
    const newSheet = await createSheet(data)
    if (newSheet) {
      setCurrentSheet(newSheet)
      router.push(`/notebook/sheet/${newSheet.id}`)
    }
  }

  const handleCreateFolder = async (data: { name: string; parent_folder_id?: string; color?: string }) => {
    await createFolder(data)
  }

  const handleSidebarResize = (sizes: number[]) => {
    if (sizes[0] >= 15 && sizes[0] <= 40) {
      setSidebarSize(sizes[0])
      localStorage.setItem('notebook-sidebar-size', sizes[0].toString())
    }
  }

  // Action buttons for the top navigation
  const actionButtons = (
    <>
      {/* Mobile/Medium notebook sidebar toggle */}
      <Button
        variant="outline"
        size="sm"
        className="xl:hidden"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      >
        {isMobileSidebarOpen ? (
          <>
            <X className="w-4 h-4 mr-2" />
            Close
          </>
        ) : (
          <>
            <FolderOpen className="w-4 h-4 mr-2" />
            View
          </>
        )}
      </Button>

      {/* Mobile/Medium dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="xl:hidden">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsFolderDialogOpen(true)}>
            <Folder className="w-4 h-4 mr-2" />
            Add Folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreateSheet({ title: 'Untitled Sheet' })}>
            <Table className="w-4 h-4 mr-2" />
            New Sheet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Desktop action buttons - hidden on mobile and medium screens */}
      <div className="hidden xl:flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          className="btn-accent"
          onClick={() => setIsFolderDialogOpen(true)}
        >
          <Folder className="w-4 h-4 mr-2" />
          New Folder
        </Button>
        <Button
          variant="default"
          size="sm"
          className="btn-accent"
          onClick={() => handleCreateSheet({ title: 'Untitled Sheet' })}
        >
          <Table className="w-4 h-4 mr-2" />
          New Sheet
        </Button>
      </div>

      {/* Shared folder dialog for both mobile and desktop */}
      <FolderDialog
        folders={folders}
        onCreateFolder={handleCreateFolder}
        open={isFolderDialogOpen}
        onOpenChange={setIsFolderDialogOpen}
        trigger={<span className="hidden" />}
      />
    </>
  )

  if (isLoading || isLoadingSheet) {
    return (
      <ProtectedRoute>
        <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} actions={actionButtons} disableContentScroll={true}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading sheet...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} actions={actionButtons} disableContentScroll={true}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive mb-2">Error loading sheet</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!currentSheet) {
    return (
      <ProtectedRoute>
        <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} actions={actionButtons} disableContentScroll={true}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Table className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Sheet not found</p>
              <Button
                variant="outline"
                onClick={() => router.push('/notebook')}
                className="mt-4"
              >
                Back to Notebooks
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} actions={actionButtons} disableContentScroll={true}>
        {sidebarSize !== null && (
          <div className="h-full">
            {/* Mobile overlay sidebar */}
            {isMobileSidebarOpen && (
              <div className="xl:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
                <div className="fixed inset-y-0 left-0 w-80 bg-background border-r shadow-lg overflow-y-auto">
                  <NotebookSidebar
                    folders={folders}
                    pages={pages}
                    sheets={sheets}
                    currentPage={undefined}
                    currentSheet={currentSheet}
                    currentFolder={currentFolder}
                    onSelectPage={(page) => {
                      router.push(`/notebook/${page.id}`)
                      setIsMobileSidebarOpen(false)
                    }}
                    onSelectSheet={(sheet) => {
                      router.push(`/notebook/sheet/${sheet.id}`)
                      setIsMobileSidebarOpen(false)
                    }}
                    onSelectFolder={(folder) => {
                      router.push(`/notebook?folder=${folder?.id || ''}`)
                      setIsMobileSidebarOpen(false)
                    }}
                    onCreatePage={async () => {}}
                    onCreateSheet={async () => {}}
                    onUpdatePage={async (id, data) => { await updateSheet(id, data); }}
                    onUpdateSheet={async (id, data) => { await updateSheet(id, data); }}
                    onDeletePage={async (id) => { await deleteSheet(id); }}
                    onDeleteSheet={async (id) => { await deleteSheet(id); }}
                    onDeleteFolder={async (id) => { await deleteFolder(id); }}
                    onMovePageToFolder={async (id, folderId) => { await moveSheetToFolder(id, folderId); }}
                    onMoveSheetToFolder={async (id, folderId) => { await moveSheetToFolder(id, folderId); }}
                    onUpdateFolder={async (id, data) => { await updateFolder(id, data); }}
                  />
                </div>
              </div>
            )}

            {/* Desktop resizable layout */}
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full hidden xl:flex"
              onLayout={handleSidebarResize}
            >
              <ResizablePanel
                defaultSize={sidebarSize}
                minSize={15}
                maxSize={40}
                className="flex flex-col"
              >
                <NotebookSidebar
                  folders={folders}
                  pages={pages}
                  sheets={sheets}
                  currentPage={undefined}
                  currentSheet={currentSheet}
                  currentFolder={currentFolder}
                  onSelectPage={(page) => router.push(`/notebook/${page.id}`)}
                  onSelectSheet={(sheet) => router.push(`/notebook/sheet/${sheet.id}`)}
                  onSelectFolder={(folder) => router.push(`/notebook?folder=${folder?.id || ''}`)}
                  onCreatePage={async () => {}}
                  onCreateSheet={async () => {}}
                  onUpdatePage={async (id, data) => { await updateSheet(id, data); }}
                  onUpdateSheet={async (id, data) => { await updateSheet(id, data); }}
                  onDeletePage={async (id) => { await deleteSheet(id); }}
                  onDeleteSheet={async (id) => { await deleteSheet(id); }}
                  onDeleteFolder={async (id) => { await deleteFolder(id); }}
                  onMovePageToFolder={async (id, folderId) => { await moveSheetToFolder(id, folderId); }}
                  onMoveSheetToFolder={async (id, folderId) => { await moveSheetToFolder(id, folderId); }}
                  onUpdateFolder={async (id, data) => { await updateFolder(id, data); }}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={100 - sidebarSize} className="flex flex-col">
                <div className="flex-1 overflow-hidden h-full">
                  <UniverSheetEditor
                    sheet={currentSheet}
                    onUpdate={updateSheet}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile sheet editor (full screen) */}
            <div className="xl:hidden h-full">
              <UniverSheetEditor
                sheet={currentSheet}
                onUpdate={updateSheet}
              />
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
