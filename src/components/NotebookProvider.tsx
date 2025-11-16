'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useNotebook } from '@/hooks/useNotebook'
import type {
  NotebookFolder,
  NotebookPage,
  NotebookSheet,
  CreateFolderData,
  CreatePageData,
  CreateSheetData,
  UpdatePageData,
  UpdateSheetData,
  UpdateFolderData
} from '@/types/notebook'

interface NotebookContextType {
  folders: NotebookFolder[]
  pages: NotebookPage[]
  sheets: NotebookSheet[]
  currentPage?: NotebookPage
  currentSheet?: NotebookSheet
  currentFolder?: NotebookFolder
  isLoading: boolean
  error?: string
  createFolder: (data: CreateFolderData) => Promise<NotebookFolder | null>
  createPage: (data: CreatePageData) => Promise<NotebookPage | null>
  createSheet: (data: CreateSheetData) => Promise<NotebookSheet | null>
  updatePage: (id: string, data: UpdatePageData, immediate?: boolean) => Promise<boolean>
  updateSheet: (id: string, data: UpdateSheetData, immediate?: boolean) => Promise<boolean>
  updateFolder: (id: string, data: UpdateFolderData) => Promise<boolean>
  deletePage: (id: string) => Promise<boolean>
  deleteSheet: (id: string) => Promise<boolean>
  deleteFolder: (id: string) => Promise<boolean>
  movePageToFolder: (pageId: string, folderId?: string) => Promise<boolean>
  moveSheetToFolder: (sheetId: string, folderId?: string) => Promise<boolean>
  setCurrentPage: (page?: NotebookPage) => void
  setCurrentSheet: (sheet?: NotebookSheet) => void
  setCurrentFolder: (folder?: NotebookFolder) => void
  refreshData: () => Promise<void>
  // Entity linking helpers
  getPageByEntity: (entityType: import('@/types/notebook').LinkedEntityType, entityId: string) => Promise<NotebookPage | null>
  getOrCreatePageForEntity: (entityType: import('@/types/notebook').LinkedEntityType, entityId: string, entityTitle: string) => Promise<NotebookPage | null>
}

const NotebookContext = createContext<NotebookContextType | undefined>(undefined)

export function NotebookProvider({ children }: { children: ReactNode }) {
  const notebook = useNotebook()

  return (
    <NotebookContext.Provider value={notebook}>
      {children}
    </NotebookContext.Provider>
  )
}

export function useNotebookContext() {
  const context = useContext(NotebookContext)
  if (context === undefined) {
    throw new Error('useNotebookContext must be used within a NotebookProvider')
  }
  return context
}
