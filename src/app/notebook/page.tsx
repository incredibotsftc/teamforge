'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { NotebookSidebar } from '@/components/notebook/NotebookSidebar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useNotebookContext } from '@/components/NotebookProvider'
import type { NotebookPage, NotebookFolder } from '@/types/notebook'
import { BookOpen, Plus, X, FolderOpen, MoreVertical, Folder, FileText } from 'lucide-react'
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

function NotebookPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true)
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
    currentPage,
    currentFolder,
    isLoading,
    error,
    createFolder,
    createPage,
    updatePage,
    updateFolder,
    deletePage,
    deleteFolder,
    movePageToFolder,
    setCurrentPage,
    setCurrentFolder
  } = useNotebookContext()

  // Handle folder selection from query parameter
  useEffect(() => {
    const folderId = searchParams.get('folder')
    if (folderId && folders.length > 0) {
      // Find the folder recursively
      const findFolder = (folders: NotebookFolder[]): NotebookFolder | undefined => {
        for (const folder of folders) {
          if (folder.id === folderId) return folder
          if (folder.children) {
            const found = findFolder(folder.children)
            if (found) return found
          }
        }
        return undefined
      }

      const folder = findFolder(folders)
      if (folder && folder.id !== currentFolder?.id) {
        setCurrentFolder(folder)
        setCurrentPage(undefined)
      }
    } else if (!folderId && currentFolder) {
      // Clear folder selection if no query param
      setCurrentFolder(undefined)
    }
  }, [searchParams, folders, currentFolder, setCurrentFolder, setCurrentPage])


  const handleCreatePage = async (data: { title: string; folder_id?: string }) => {
    const newPage = await createPage(data)
    if (newPage) {
      // Set the current page immediately to avoid flickering
      setCurrentPage(newPage)
      // Then navigate to the new page URL
      router.push(`/notebook/${newPage.id}`)
    }
  }

  const handleCreateFolder = async (data: { name: string; parent_folder_id?: string; color?: string }) => {
    await createFolder(data)
  }

  const handleUpdateFolder = async (id: string, data: { name?: string; parent_folder_id?: string | null; color?: string }) => {
    await updateFolder(id, data)
  }

  const handleDeletePage = async (id: string) => {
    await deletePage(id)
  }

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id)
  }

  const handleMovePageToFolder = async (pageId: string, folderId?: string) => {
    await movePageToFolder(pageId, folderId)
  }

  const handleUpdatePageMetadata = async (id: string, data: { title?: string; is_pinned?: boolean }) => {
    await updatePage(id, data, true)
  }

  const handleSelectPage = (page: NotebookPage) => {
    // Navigate to the selected page
    router.push(`/notebook/${page.id}`)
  }

  const handleSelectFolder = (folder?: NotebookFolder) => {
    setCurrentFolder(folder)
    setCurrentPage(undefined)
    // Navigate to update the URL with the folder parameter
    if (folder) {
      router.push(`/notebook?folder=${folder.id}`)
    } else {
      router.push('/notebook')
    }
  }

  const handlePanelResize = (sizes: number[]) => {
    const newSize = sizes[0]
    if (newSize !== undefined) {
      setSidebarSize(newSize)
      localStorage.setItem('notebook-sidebar-size', newSize.toString())
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
          <Plus className="w-4 h-4 mr-2" />
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
  )

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
                currentPage={currentPage}
                currentFolder={currentFolder}
                onCreatePage={handleCreatePage}
                onSelectPage={(page) => {
                  handleSelectPage(page)
                  setIsMobileSidebarOpen(false) // Close sidebar when page is selected
                }}
                onSelectFolder={handleSelectFolder}
                onDeletePage={handleDeletePage}
                onDeleteFolder={handleDeleteFolder}
                onUpdatePage={handleUpdatePageMetadata}
                onUpdateFolder={handleUpdateFolder}
                onMovePageToFolder={handleMovePageToFolder}
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
                currentPage={currentPage}
                currentFolder={currentFolder}
                onCreatePage={handleCreatePage}
                onSelectPage={handleSelectPage}
                onSelectFolder={handleSelectFolder}
                onDeletePage={handleDeletePage}
                onDeleteFolder={handleDeleteFolder}
                onUpdatePage={handleUpdatePageMetadata}
                onUpdateFolder={handleUpdateFolder}
                onMovePageToFolder={handleMovePageToFolder}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={100 - sidebarSize} className="overflow-hidden">
              {currentFolder ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <div className="text-center max-w-md">
                      <div
                        className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center"
                        style={{ backgroundColor: currentFolder.color || '#6366f1' }}
                      >
                        <FolderOpen className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">{currentFolder.name}</h3>
                      <p className="text-muted-foreground text-sm md:text-base mb-4">
                        Select a note from this folder or create a new one.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          onClick={() => handleCreatePage({
                            title: 'Untitled',
                            folder_id: currentFolder.id
                          })}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          New Note in Folder
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-4">
                    <div className="text-center max-w-md">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Welcome to Team Notebook</h3>
                      <p className="text-muted-foreground text-sm md:text-base mb-4">
                        Organize your team&apos;s knowledge with notes and folders. Select a note from the sidebar or create a new one to get started.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button className="btn-accent" onClick={() => handleCreatePage({ title: 'Untitled' })}>
                          <Plus className="w-4 h-4 mr-2" />
                          {pages.length === 0 ? 'Create First Note' : 'Create New Note'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </ResizablePanel>
          </ResizablePanelGroup>
          )}
        </div>

        {/* Mobile/Medium fallback - show content without resizable */}
        <div className="h-full xl:hidden">
          {currentFolder ? (
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="text-center max-w-md">
                <div
                  className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: currentFolder.color || '#6366f1' }}
                >
                  <FolderOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-medium mb-2">{currentFolder.name}</h3>
                <p className="text-muted-foreground text-sm md:text-base mb-4">
                  Select a note from this folder or create a new one.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => handleCreatePage({
                      title: 'Untitled',
                      folder_id: currentFolder.id
                    })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Note in Folder
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="text-center max-w-md">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Welcome to Team Notebook</h3>
                <p className="text-muted-foreground text-sm md:text-base mb-4">
                  Organize your team&apos;s knowledge with notes and folders. Select a note from the sidebar or create a new one to get started.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button className="btn-accent" onClick={() => handleCreatePage({ title: 'Untitled' })}>
                    <Plus className="w-4 h-4 mr-2" />
                    {pages.length === 0 ? 'Create First Note' : 'Create New Note'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export default function NotebookPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout pageTitle="Notebooks" pageIcon={BookOpen} disableContentScroll={true}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading notebook...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <NotebookPageContent />
    </Suspense>
  )
}