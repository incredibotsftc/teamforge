'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { NotebookFolder, NotebookPage } from '@/types/notebook'
import { FolderDialog } from './FolderDialog'
import {
  Search,
  Plus,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NotebookSidebarProps {
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
}

export function NotebookSidebar({
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
}: NotebookSidebarProps) {
  // Helper function to get all folder IDs recursively
  const getAllFolderIds = useCallback((folders: NotebookFolder[]): string[] => {
    const ids: string[] = []
    folders.forEach(folder => {
      ids.push(folder.id)
      if (folder.children && folder.children.length > 0) {
        ids.push(...getAllFolderIds(folder.children))
      }
    })
    return ids
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'page' | 'folder'; id: string; name: string } | null>(null)
  const [draggedPage, setDraggedPage] = useState<NotebookPage | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<{ pageId: string; position: 'before' | 'after' } | null>(null)
  const [editingFolder, setEditingFolder] = useState<NotebookFolder | null>(null)
  const [showFolderDialog, setShowFolderDialog] = useState(false)

  // Auto-expand all folders when folders data changes
  useEffect(() => {
    const allFolderIds = getAllFolderIds(folders)
    setExpandedFolders(new Set(allFolderIds))
  }, [folders, getAllFolderIds])

  // Filter pages based on search and sort by sort_order
  const filteredPages = pages
    .filter(page =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page.content_text && page.content_text.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  // Get pages without folders (root level) sorted by sort_order
  const rootPages = pages
    .filter(page => !page.folder_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  // Start editing page title
  const startEditingPage = (page: NotebookPage) => {
    setEditingPageId(page.id)
    setEditingTitle(page.title)
  }

  // Save page title edit
  const savePageTitle = async () => {
    if (editingPageId && editingTitle.trim()) {
      await onUpdatePage(editingPageId, { title: editingTitle.trim() })
    }
    setEditingPageId(null)
    setEditingTitle('')
  }

  // Cancel page title edit
  const cancelEditingPage = () => {
    setEditingPageId(null)
    setEditingTitle('')
  }

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!deleteConfirm) return

    if (deleteConfirm.type === 'page') {
      await onDeletePage(deleteConfirm.id)
    } else {
      await onDeleteFolder(deleteConfirm.id)
    }
    setDeleteConfirm(null)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, page: NotebookPage) => {
    setDraggedPage(page)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', page.id)
  }

  const handleDragEnd = () => {
    setDraggedPage(null)
    setDragOverFolder(null)
    setDropPosition(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // Handle drag over a page item for reordering
  const handlePageDragOver = (e: React.DragEvent, page: NotebookPage) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedPage || draggedPage.id === page.id) return

    // Calculate if we should drop before or after based on mouse position
    const rect = e.currentTarget.getBoundingClientRect()
    const midPoint = rect.top + rect.height / 2
    const position = e.clientY < midPoint ? 'before' : 'after'

    setDropPosition({ pageId: page.id, position })
    setDragOverFolder(null)
  }

  // Handle drop on a page item for reordering
  const handlePageDrop = async (e: React.DragEvent, targetPage: NotebookPage, position: 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedPage || draggedPage.id === targetPage.id) return

    try {
      // Get all pages in the same folder
      const pagesInSameFolder = pages
        .filter(p => (p.folder_id || null) === (targetPage.folder_id || null))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

      // Find target index
      const targetIndex = pagesInSameFolder.findIndex(p => p.id === targetPage.id)
      if (targetIndex === -1) return

      // Calculate new position
      let newPosition = targetIndex
      if (position === 'after') {
        newPosition = targetIndex + 1
      }

      // If dragging from same folder, adjust for removal
      const draggedIndex = pagesInSameFolder.findIndex(p => p.id === draggedPage.id)
      if (draggedIndex !== -1 && draggedIndex < newPosition) {
        newPosition--
      }

      await onReorderPage(draggedPage.id, newPosition, targetPage.folder_id || undefined)
    } catch (error) {
      console.error('Error reordering page:', error)
    } finally {
      setDraggedPage(null)
      setDropPosition(null)
    }
  }

  const handleDragEnter = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    setDragOverFolder(folderId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the component entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, folderId?: string) => {
    e.preventDefault()
    if (!draggedPage) return

    try {
      await onMovePageToFolder(draggedPage.id, folderId)
    } catch (error) {
      console.error('Error moving page:', error)
    } finally {
      setDraggedPage(null)
      setDragOverFolder(null)
    }
  }

  // Render folder tree recursively
  const renderFolder = (folder: NotebookFolder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = currentFolder?.id === folder.id
    const isDraggedOver = dragOverFolder === folder.id

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center gap-1 md:gap-2 pr-2 py-2 md:py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent group min-h-[44px] md:min-h-auto ${
            isSelected ? 'bg-accent' : ''
          } ${isDraggedOver ? 'bg-blue-100 border-2 border-blue-400 border-dashed' : ''}`}
          style={{ paddingLeft: `${level * 8 + 4}px`, paddingRight: '8px' }}
          onClick={() => onSelectFolder(folder)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFolder(folder.id)
            }}
            className="p-0.5 hover:bg-accent-foreground/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>

          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: folder.color }}
          />

          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Folder className="w-4 h-4 text-muted-foreground" />
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1 truncate">{folder.name}</span>
            </TooltipTrigger>
            <TooltipContent>
              {folder.name}
            </TooltipContent>
          </Tooltip>

          {folder.page_count !== undefined && folder.page_count > 0 && (
            <Badge variant="secondary" className="text-xs h-5">
              {folder.page_count}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onCreatePage({ title: 'Untitled', folder_id: folder.id })
              }}>
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                setEditingFolder(folder)
                setShowFolderDialog(true)
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirm({ type: 'folder', id: folder.id, name: folder.name })
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Folder pages */}
        {isExpanded && folder.pages && [...folder.pages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(page => (
          <div key={page.id} className="relative">
            {/* Drop indicator */}
            {dropPosition?.pageId === page.id && dropPosition.position === 'before' && (
              <div className="h-0.5 bg-blue-500 mx-2 mb-1" style={{ marginLeft: `${level * 8 + 28}px` }} />
            )}

            <div
              className={`flex items-center gap-1 md:gap-2 pr-2 py-2 md:py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent group min-h-[44px] md:min-h-auto ${
                currentPage?.id === page.id ? 'bg-accent' : ''
              } ${draggedPage?.id === page.id ? 'opacity-50' : ''}`}
              style={{ paddingLeft: `${level * 8 + 28}px`, paddingRight: '8px' }}
              onClick={() => onSelectPage(page)}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, page)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handlePageDragOver(e, page)}
              onDrop={(e) => handlePageDrop(e, page, dropPosition?.position || 'after')}
            >
            <GripVertical className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab" />
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            {editingPageId === page.id ? (
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={savePageTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePageTitle()
                  if (e.key === 'Escape') cancelEditingPage()
                }}
                className="h-6 text-sm flex-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1 truncate">{page.title}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {page.title}
                </TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEditingPage(page)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteConfirm({ type: 'page', id: page.id, name: page.title })}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Drop indicator after */}
          {dropPosition?.pageId === page.id && dropPosition.position === 'after' && (
            <div className="h-0.5 bg-blue-500 mx-2 mt-1" style={{ marginLeft: `${level * 8 + 28}px` }} />
          )}
        </div>
        ))}

        {/* Subfolders */}
        {isExpanded && folder.children && folder.children.map(subfolder => (
          renderFolder(subfolder, level + 1)
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Notebook</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {searchQuery ? (
          /* Search Results */
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Search Results ({filteredPages.length})
            </div>
            {filteredPages.map(page => (
              <div key={page.id} className="relative">
                {/* Drop indicator */}
                {dropPosition?.pageId === page.id && dropPosition.position === 'before' && (
                  <div className="h-0.5 bg-blue-500 mx-2 mb-1" />
                )}

                <div
                  className={`flex items-center gap-1 md:gap-2 pr-2 py-2 md:py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent min-h-[44px] md:min-h-auto ${
                    currentPage?.id === page.id ? 'bg-accent' : ''
                  } ${draggedPage?.id === page.id ? 'opacity-50' : ''}`}
                  style={{ paddingLeft: '4px', paddingRight: '8px' }}
                  onClick={() => onSelectPage(page)}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, page)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handlePageDragOver(e, page)}
                  onDrop={(e) => handlePageDrop(e, page, dropPosition?.position || 'after')}
                >
                <GripVertical className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab" />
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1 truncate">{page.title}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {page.title}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Drop indicator after */}
              {dropPosition?.pageId === page.id && dropPosition.position === 'after' && (
                <div className="h-0.5 bg-blue-500 mx-2 mt-1" />
              )}
            </div>
            ))}
          </div>
        ) : (
          /* Folder Tree */
          <div className="space-y-1">
            {/* Root folders */}
            {folders.map(folder => renderFolder(folder))}

            {/* Root pages and drop zone */}
            {(rootPages.length > 0 || draggedPage) && (
              <>
                <div
                  className={`px-2 py-1 text-xs font-medium text-muted-foreground mt-4 ${
                    dragOverFolder === null && draggedPage ? 'bg-blue-100 border-2 border-blue-400 border-dashed rounded' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, undefined)}
                >
                  {rootPages.length > 0 ? 'Uncategorized' : 'Drop here to remove from folder'}
                </div>
                {rootPages.map(page => (
                  <div key={page.id} className="relative">
                    {/* Drop indicator */}
                    {dropPosition?.pageId === page.id && dropPosition.position === 'before' && (
                      <div className="h-0.5 bg-blue-500 mx-2 mb-1" />
                    )}

                    <div
                      className={`flex items-center gap-1 md:gap-2 pr-2 py-2 md:py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent group min-h-[44px] md:min-h-auto ${
                        currentPage?.id === page.id ? 'bg-accent' : ''
                      } ${draggedPage?.id === page.id ? 'opacity-50' : ''}`}
                      style={{ paddingLeft: '4px', paddingRight: '8px' }}
                      onClick={() => onSelectPage(page)}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, page)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handlePageDragOver(e, page)}
                      onDrop={(e) => handlePageDrop(e, page, dropPosition?.position || 'after')}
                    >
                    <GripVertical className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab" />
                    <FileText className="w-4 h-4 text-muted-foreground" />

                    {editingPageId === page.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={savePageTitle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') savePageTitle()
                          if (e.key === 'Escape') cancelEditingPage()
                        }}
                        className="h-6 text-sm flex-1"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1 truncate">{page.title}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {page.title}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditingPage(page)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm({ type: 'page', id: page.id, name: page.title })}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Drop indicator after */}
                  {dropPosition?.pageId === page.id && dropPosition.position === 'after' && (
                    <div className="h-0.5 bg-blue-500 mx-2 mt-1" />
                  )}
                </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirm?.type === 'page' ? 'Note' : 'Folder'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;?
              {deleteConfirm?.type === 'folder' && ' This will also delete all notes and subfolders inside it.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Folder Dialog */}
      <FolderDialog
        folders={folders}
        onCreateFolder={async () => {}} // Not used in edit mode
        onUpdateFolder={onUpdateFolder}
        editFolder={editingFolder || undefined}
        open={showFolderDialog}
        onOpenChange={(open) => {
          setShowFolderDialog(open)
          if (!open) {
            setEditingFolder(null)
          }
        }}
        trigger={<span className="hidden" />}
      />
    </div>
  )
}