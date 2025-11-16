'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BlockNoteEditor } from '@/components/notebook/BlockNoteEditor'
import { NotebookSidebar } from '@/components/notebook/NotebookSidebar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useNotebookContext } from '@/components/NotebookProvider'
import type { NotebookPage, NotebookFolder } from '@/types/notebook'
import { BookOpen, FileText, FolderOpen, X, MoreVertical, Folder, Loader2 } from 'lucide-react'
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

export default function NotePage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.noteId as string
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
    currentPage,
    currentSheet,
    currentFolder,
    isLoading,
    error,
    createFolder,
    createPage,
    createSheet,
    updatePage,
    updateSheet,
    updateFolder,
    deletePage,
    deleteSheet,
    deleteFolder,
    movePageToFolder,
    moveSheetToFolder,
    setCurrentPage,
    setCurrentSheet,
    setCurrentFolder
  } = useNotebookContext()

  // Track if we're loading a specific page
  const [isLoadingPage, setIsLoadingPage] = useState(true)

  // Set current page based on URL parameter
  useEffect(() => {
    // When noteId changes, start loading
    setIsLoadingPage(true)

    if (noteId && pages.length > 0) {
      const page = pages.find(p => p.id === noteId)
      if (page) {
        if (page.id !== currentPage?.id) {
          setCurrentPage(page)
          setCurrentFolder(undefined)
        }
        // Page found, stop loading
        setIsLoadingPage(false)
      } else if (!isLoading) {
        // Note not found, redirect to notebook home
        router.push('/notebook')
        setIsLoadingPage(false)
      }
    } else if (noteId && !isLoading && pages.length === 0) {
      // No pages exist, redirect
      router.push('/notebook')
      setIsLoadingPage(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, isLoading, pages])

  // Update current page when pages array changes (e.g., after title update)
  // NOTE: Only update if title changes - avoid triggering reload on every autosave
  useEffect(() => {
    if (currentPage && pages.length > 0) {
      const updatedPage = pages.find(p => p.id === currentPage.id)
      if (updatedPage && updatedPage.title !== currentPage.title) {
        setCurrentPage(updatedPage)
      }
    }
  }, [pages, currentPage, setCurrentPage])

  const handleUpdatePage = useCallback(async (id: string, data: { title?: string; content?: unknown }) => {
    await updatePage(id, data, true) // immediate save for manual updates
  }, [updatePage])

  const handleCreatePage = useCallback(async (data: { title: string; folder_id?: string }) => {
    const newPage = await createPage(data)
    if (newPage) {
      // Set the current page immediately to avoid flickering
      setCurrentPage(newPage)
      // Then navigate to the new page URL
      router.push(`/notebook/${newPage.id}`)
    }
  }, [createPage, setCurrentPage, router])

  const handleCreateFolder = useCallback(async (data: { name: string; parent_folder_id?: string; color?: string }) => {
    await createFolder(data)
  }, [createFolder])

  const handleUpdateFolder = useCallback(async (id: string, data: { name?: string; parent_folder_id?: string | null; color?: string }) => {
    await updateFolder(id, data)
  }, [updateFolder])

  const handleDeletePage = useCallback(async (id: string) => {
    if (id === noteId) {
      // If deleting current page, navigate back to notebook home
      router.push('/notebook')
    }
    await deletePage(id)
  }, [noteId, router, deletePage])

  const handleDeleteFolder = useCallback(async (id: string) => {
    await deleteFolder(id)
  }, [deleteFolder])

  const handleMovePageToFolder = useCallback(async (pageId: string, folderId?: string) => {
    await movePageToFolder(pageId, folderId)
  }, [movePageToFolder])

  const handleUpdatePageMetadata = useCallback(async (id: string, data: { title?: string; is_pinned?: boolean }) => {
    await updatePage(id, data, true)
  }, [updatePage])

  const handleSelectPage = useCallback((page: NotebookPage) => {
    // Navigate to the selected page
    router.push(`/notebook/${page.id}`)
  }, [router])

  const handleSelectFolder = useCallback((folder?: NotebookFolder) => {
    setCurrentFolder(folder)
    setCurrentPage(undefined)
    setCurrentSheet(undefined)
    // Navigate to notebook home when selecting a folder
    if (folder) {
      router.push(`/notebook?folder=${folder.id}`)
    } else {
      router.push('/notebook')
    }
  }, [setCurrentFolder, setCurrentPage, setCurrentSheet, router])

  // Sheet handlers
  const handleCreateSheet = useCallback(async (data: { title: string; folder_id?: string }) => {
    const newSheet = await createSheet(data)
    if (newSheet) {
      setCurrentSheet(newSheet)
      router.push(`/notebook/sheet/${newSheet.id}`)
    }
  }, [createSheet, setCurrentSheet, router])

  const handleSelectSheet = useCallback((sheet: import('@/types/notebook').NotebookSheet) => {
    router.push(`/notebook/sheet/${sheet.id}`)
  }, [router])

  const handleDeleteSheet = useCallback(async (id: string) => {
    await deleteSheet(id)
  }, [deleteSheet])

  const handleMoveSheetToFolder = useCallback(async (sheetId: string, folderId?: string) => {
    await moveSheetToFolder(sheetId, folderId)
  }, [moveSheetToFolder])

  const handleUpdateSheetMetadata = useCallback(async (id: string, data: { title?: string; is_pinned?: boolean }) => {
    await updateSheet(id, data, true)
  }, [updateSheet])

  const handleMobileSelectPage = useCallback((page: NotebookPage) => {
    handleSelectPage(page)
    setIsMobileSidebarOpen(false)
  }, [handleSelectPage])

  const handleMobileSelectSheet = useCallback((sheet: import('@/types/notebook').NotebookSheet) => {
    handleSelectSheet(sheet)
    setIsMobileSidebarOpen(false)
  }, [handleSelectSheet])

  const handlePanelResize = useCallback((sizes: number[]) => {
    const newSize = sizes[0]
    if (newSize !== undefined) {
      setSidebarSize(newSize)
      localStorage.setItem('notebook-sidebar-size', newSize.toString())
    }
  }, [])

  // Action buttons for the top navigation
  const actionButtons = useMemo(() => (
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
            View pages
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
          <DropdownMenuItem onClick={() => handleCreatePage({ title: 'Untitled' })}>
            <FileText className="w-4 h-4 mr-2" />
            New Note
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
          onClick={() => handleCreatePage({ title: 'Untitled' })}
        >
          <FileText className="w-4 h-4 mr-2" />
          New Note
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
  ), [isMobileSidebarOpen, folders, handleCreateFolder, handleCreatePage, isFolderDialogOpen])

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} actions={actionButtons} disableContentScroll={true}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading notebook...</p>
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
              <p className="text-destructive mb-2">Error loading notebook</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} actions={actionButtons} disableContentScroll={true}>
        {/* Mobile/Medium Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 xl:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background z-50 xl:hidden">
              <NotebookSidebar
                folders={folders}
                pages={pages}
                sheets={sheets}
                currentPage={currentPage}
                currentSheet={currentSheet}
                currentFolder={currentFolder}
                onCreatePage={handleCreatePage}
                onCreateSheet={handleCreateSheet}
                onSelectPage={handleMobileSelectPage}
                onSelectSheet={handleMobileSelectSheet}
                onSelectFolder={handleSelectFolder}
                onDeletePage={handleDeletePage}
                onDeleteSheet={handleDeleteSheet}
                onDeleteFolder={handleDeleteFolder}
                onUpdatePage={handleUpdatePageMetadata}
                onUpdateSheet={handleUpdateSheetMetadata}
                onUpdateFolder={handleUpdateFolder}
                onMovePageToFolder={handleMovePageToFolder}
                onMoveSheetToFolder={handleMoveSheetToFolder}
              />
            </div>
          </>
        )}

        {/* Desktop Layout with Resizable Panels - Only show on large screens when size is loaded */}
        <div className="h-full hidden xl:flex">
          {sidebarSize !== null && (
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full w-full"
              onLayout={handlePanelResize}
            >
            <ResizablePanel defaultSize={sidebarSize} minSize={15} maxSize={40}>
              <NotebookSidebar
                folders={folders}
                pages={pages}
                sheets={sheets}
                currentPage={currentPage}
                currentSheet={currentSheet}
                currentFolder={currentFolder}
                onCreatePage={handleCreatePage}
                onCreateSheet={handleCreateSheet}
                onSelectPage={handleSelectPage}
                onSelectSheet={handleSelectSheet}
                onSelectFolder={handleSelectFolder}
                onDeletePage={handleDeletePage}
                onDeleteSheet={handleDeleteSheet}
                onDeleteFolder={handleDeleteFolder}
                onUpdatePage={handleUpdatePageMetadata}
                onUpdateSheet={handleUpdateSheetMetadata}
                onUpdateFolder={handleUpdateFolder}
                onMovePageToFolder={handleMovePageToFolder}
                onMoveSheetToFolder={handleMoveSheetToFolder}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={100 - sidebarSize} className="overflow-hidden">
              {isLoadingPage ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading note...</p>
                  </div>
                </div>
              ) : currentPage ? (
                <BlockNoteEditor
                  page={currentPage}
                  onUpdatePage={handleUpdatePage}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <div className="text-center max-w-md">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Note not found</h3>
                    <p className="text-muted-foreground text-sm md:text-base mb-4">
                      The note you&apos;re looking for doesn&apos;t exist or may have been deleted.
                    </p>
                    <Button onClick={() => router.push('/notebook')}>
                      Back to Notebook
                    </Button>
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
          )}
        </div>

        {/* Mobile/Medium fallback */}
        <div className="h-full xl:hidden flex flex-col">
          {isLoadingPage ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading note...</p>
              </div>
            </div>
          ) : currentPage ? (
            <BlockNoteEditor
              page={currentPage}
              onUpdatePage={handleUpdatePage}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 p-4">
              <div className="text-center max-w-md">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Note not found</h3>
                <p className="text-muted-foreground text-sm md:text-base mb-4">
                  The note you&apos;re looking for doesn&apos;t exist or may have been deleted.
                </p>
                <Button onClick={() => router.push('/notebook')}>
                  Back to Notebook
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}