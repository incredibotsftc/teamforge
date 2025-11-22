'use client'

import React, { useState, useEffect } from 'react'
import { NotebookSidebar } from './NotebookSidebar'
import { NotebookFolder, NotebookPage } from '@/types/notebook'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

interface ResizableNotebookLayoutProps {
  folders: NotebookFolder[]
  pages: NotebookPage[]
  currentPage?: NotebookPage
  currentFolder?: NotebookFolder
  onCreatePage: (data: { title: string; folder_id?: string }) => Promise<void>
  onSelectPage: (page: NotebookPage) => void
  onSelectFolder: (folder?: NotebookFolder) => void
  onDeletePage: (id: string) => Promise<void>
  onDeleteFolder: (id: string) => Promise<void>
  onUpdatePage: (id: string, data: { title?: string; is_pinned?: boolean }) => Promise<void>
  onUpdateFolder: (id: string, data: { name?: string; parent_folder_id?: string | null; color?: string }) => Promise<void>
  onMovePageToFolder: (pageId: string, folderId?: string) => Promise<void>
  onReorderPage: (pageId: string, newPosition: number, folderId?: string) => Promise<void>
  children: React.ReactNode
}

const STORAGE_KEY = 'notebook-sidebar-size'
const DEFAULT_SIZE = 25

export function ResizableNotebookLayout({
  folders,
  pages,
  currentPage,
  currentFolder,
  onCreatePage,
  onSelectPage,
  onSelectFolder,
  onDeletePage,
  onDeleteFolder,
  onUpdatePage,
  onUpdateFolder,
  onMovePageToFolder,
  onReorderPage,
  children,
}: ResizableNotebookLayoutProps) {
  const [sidebarSize, setSidebarSize] = useState<number>(DEFAULT_SIZE)

  // Load saved size from localStorage on mount
  useEffect(() => {
    const savedSize = localStorage.getItem(STORAGE_KEY)
    if (savedSize) {
      const parsedSize = parseFloat(savedSize)
      if (!isNaN(parsedSize) && parsedSize >= 15 && parsedSize <= 40) {
        setSidebarSize(parsedSize)
      }
    }
  }, [])

  // Save size to localStorage when it changes
  const handleSizeChange = (sizes: number[]) => {
    const newSize = sizes[0]
    if (newSize) {
      setSidebarSize(newSize)
      localStorage.setItem(STORAGE_KEY, newSize.toString())
    }
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full"
      onLayout={handleSizeChange}
    >
      <ResizablePanel defaultSize={sidebarSize} minSize={15} maxSize={40}>
        <NotebookSidebar
          folders={folders}
          pages={pages}
          currentPage={currentPage}
          currentFolder={currentFolder}
          onCreatePage={onCreatePage}
          onSelectPage={onSelectPage}
          onSelectFolder={onSelectFolder}
          onDeletePage={onDeletePage}
          onDeleteFolder={onDeleteFolder}
          onUpdatePage={onUpdatePage}
          onUpdateFolder={onUpdateFolder}
          onMovePageToFolder={onMovePageToFolder}
          onReorderPage={onReorderPage}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={100 - sidebarSize}>
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
