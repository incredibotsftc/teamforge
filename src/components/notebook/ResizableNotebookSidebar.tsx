'use client'

import React, { useState, useRef, useEffect } from 'react'
import { NotebookSidebar } from './NotebookSidebar'
import { NotebookFolder, NotebookPage } from '@/types/notebook'

interface ResizableNotebookSidebarProps {
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

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 320 // 80 * 4 (w-80 in Tailwind)

export function ResizableNotebookSidebar(props: ResizableNotebookSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('notebook-sidebar-width')
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10)
      if (parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
        setWidth(parsedWidth)
      }
    }
  }, [])

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('notebook-sidebar-width', width.toString())
  }, [width])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startXRef.current = e.clientX
    startWidthRef.current = width
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const deltaX = e.clientX - startXRef.current
      const newWidth = startWidthRef.current + deltaX

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        // Update DOM directly for smooth live updates (no React re-render)
        containerRef.current.style.width = `${newWidth}px`
      }
    }

    const handleMouseUp = () => {
      if (!containerRef.current) return

      // Get the final width from the DOM and update React state
      const finalWidth = parseInt(containerRef.current.style.width, 10)
      if (finalWidth >= MIN_WIDTH && finalWidth <= MAX_WIDTH) {
        setWidth(finalWidth)
      }

      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  return (
    <div
      ref={containerRef}
      className="relative flex-shrink-0 h-full"
      style={{ width: `${width}px` }}
    >
      {/* Sidebar content */}
      <div ref={sidebarRef} className="h-full">
        <NotebookSidebar {...props} />
      </div>

      {/* Resize Handle - absolutely positioned to span full height */}
      <div
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize transition-colors ${
          isResizing ? 'bg-primary' : isHovering ? 'bg-primary/40' : 'bg-border'
        }`}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{ touchAction: 'none' }}
        title="Drag to resize"
      />
    </div>
  )
}
