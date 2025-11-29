
import { Bold, Italic, Highlighter, ChevronDown, Link as LinkIcon } from 'lucide-react'
"use client"
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { AgGridReact } from 'ag-grid-react'
// Register AG Grid modules (fixes error #272)
if (typeof window !== 'undefined' && !(window as any).__agGridRegistered) {
  ModuleRegistry.registerModules([AllCommunityModule])
  ;(window as any).__agGridRegistered = true
}
import 'ag-grid-community/styles/ag-theme-quartz.css'
import './ag-grid-dark.css'
import './ag-grid-toolbar.css'

interface AGGridWrapperProps {
  data?: any
  onChange?: (data: any) => void
  height?: string | number
}

export default function AGGridWrapper({ data, onChange, height = 400 }: AGGridWrapperProps) {
  // Columns: A-Z (26 columns)
  const defaultCols = Array(26).fill(0).map((_, i) => ({
    field: `col${i+1}`,
    headerName: String.fromCharCode(65 + i),
    editable: true,
    minWidth: 160,
    cellClass: (params: any) => params.data && params.data[`col${i+1}_bold`] ? 'ag-bold' : '',
  }))
  const [colDefs, setColDefs] = useState<any[]>(data?.cols || defaultCols)
  // Infinite vertical scroll: start with 100 rows, add more as needed
  const [rowData, setRowData] = useState<any[]>(data?.rows || Array(100).fill(null).map(() => ({ })))
  // Infinite scroll: add more rows when user scrolls to the bottom
  const onBodyScroll = useCallback((params: any) => {
    const api = params.api || (gridRef.current && gridRef.current.api)
    if (!api) return
    const lastRowIndex = rowData.length - 1
    // Use getLastDisplayedRowIndex if available, else fallback
    let lastVisibleRow = 0
    if (typeof api.getLastDisplayedRowIndex === 'function') {
      lastVisibleRow = api.getLastDisplayedRowIndex() || 0
    } else if (typeof api.getDisplayedRowCount === 'function') {
      lastVisibleRow = api.getDisplayedRowCount() - 1
    }
    // If user scrolls to last row, add 50 more rows
    if (lastVisibleRow >= lastRowIndex - 2) {
      setRowData(prev => ([...prev, ...Array(50).fill(null).map(() => ({ }))]))
    }
  }, [rowData])


  // AG Grid API ref
  const gridRef = useRef<any>(null)

  // Track selected cell
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colId: string } | null>(null)

  // Emit changes upward
  const handleCellValueChanged = useCallback(() => {
    onChange && onChange({ rows: rowData, cols: colDefs })
  }, [rowData, colDefs, onChange])

  // AG Grid event: update rowData on cell edit
  const onCellValueChanged = useCallback((params: any) => {
    // Safely update rowData from grid
    if (params.api && typeof params.api.getDisplayedRowCount === 'function') {
      const count = params.api.getDisplayedRowCount()
      const newRows = []
      for (let i = 0; i < count; i++) {
        const rowNode = params.api.getDisplayedRowAtIndex(i)
        newRows.push(rowNode && rowNode.data ? rowNode.data : {})
      }
      setRowData(newRows)
    } else if (params.data) {
      // fallback: update only the changed row
      setRowData(prev => prev.map((row, i) => i === params.rowIndex ? params.data : row))
    }
    handleCellValueChanged()
  }, [handleCellValueChanged])

  // Keyboard shortcuts for bold/italic, and track selection
  const onCellKeyDown = useCallback((params: any) => {
    const col = params.column.getColId()
    const rowIdx = params.node.rowIndex
    setSelectedCell({ rowIdx, colId: col })
  // Excel-like: Arrow keys should exit editing and move selection
  const isEditing = params.api.getEditingCells().length > 0
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    if (arrowKeys.includes(params.event.key) && isEditing) {
      params.api.stopEditing()
      // Let AG Grid handle navigation after editing stops
      // No preventDefault here
      return
    }
    // Enter key: stop editing and move down (Excel behavior)
    if (params.event.key === 'Enter' && isEditing) {
      params.api.stopEditing()
      // AG Grid will move selection down automatically
      return
    }
    if ((params.event.ctrlKey || params.event.metaKey) && params.event.key === 'b') {
      // Toggle bold for current cell
      setRowData(prev => {
        const next = prev.map((row, i) => i === rowIdx ? { ...row, [`${col}_bold`]: !row[`${col}_bold`] } : row)
        return next
      })
      params.event.preventDefault()
    }
    if ((params.event.ctrlKey || params.event.metaKey) && params.event.key === 'i') {
      // Toggle italic for current cell
      setRowData(prev => {
        const next = prev.map((row, i) => i === rowIdx ? { ...row, [`${col}_italic`]: !row[`${col}_italic`] } : row)
        return next
      })
      params.event.preventDefault()
    }
  }, [])

  // Track cell selection
  const onCellClicked = useCallback((params: any) => {
    setSelectedCell({ rowIdx: params.node.rowIndex, colId: params.column.getColId() })
  }, [])

  // Toolbar actions
  const handleBold = () => {
    if (!selectedCell) return
    setRowData(prev => prev.map((row, i) => i === selectedCell.rowIdx ? { ...row, [`${selectedCell.colId}_bold`]: !row[`${selectedCell.colId}_bold`] } : row))
  }

  // Add link to selected cell (custom modal for URL and display text)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const handleAddLink = () => {
    if (!selectedCell) return
    setLinkUrl('')
    setLinkText('')
    setShowLinkModal(true)
  }
  const handleLinkModalSave = () => {
    if (!linkUrl || !selectedCell) return
    setRowData(prev => prev.map((row, i) =>
      i === selectedCell.rowIdx
        ? { ...row, [`${selectedCell.colId}_link`]: linkUrl, [selectedCell.colId]: linkText || linkUrl }
        : row
    ))
    setShowLinkModal(false)
  }
  const handleLinkModalCancel = () => {
    setShowLinkModal(false)
  }
  const handleItalic = () => {
    if (!selectedCell) return
    setRowData(prev => prev.map((row, i) => i === selectedCell.rowIdx ? { ...row, [`${selectedCell.colId}_italic`]: !row[`${selectedCell.colId}_italic`] } : row))
  }
  // Highlight color state for toolbar dropdown
  const [highlightColor, setHighlightColor] = useState<string>('#fff9c0')
  const [highlightDropdownOpen, setHighlightDropdownOpen] = useState(false)
  // Multi-color highlight handler
  const handleHighlight = (color: string) => {
    setHighlightColor(color)
    setHighlightDropdownOpen(false)
    if (!selectedCell) return
    setRowData(prev => prev.map((row, i) => i === selectedCell.rowIdx ? { ...row, [`${selectedCell.colId}_highlight`]: row[`${selectedCell.colId}_highlight`] === color ? undefined : color } : row))
  }

  // Custom cell style for bold/italic/highlight
  const cellStyle = useCallback((params: any) => {
    const col = params.colDef.field
    const isBold = params.data && params.data[`${col}_bold`]
    const isItalic = params.data && params.data[`${col}_italic`]
    const highlight = params.data && params.data[`${col}_highlight`]
    let textColor
    if (highlight) {
      // Use dark text for light highlights, white for dark highlights
      const lightColors = ['#fff9c0', '#a7f3d0', '#fbcfe8', '#bae6fd']
      textColor = lightColors.includes(highlight) ? '#111' : '#fff'
    }
    return {
      fontWeight: isBold ? 'bold' : undefined,
      fontStyle: isItalic ? 'italic' : undefined,
      backgroundColor: highlight || undefined,
      color: textColor,
    }
  }, [])

  // Choose theme class based on dark/light mode
  const themeClass = 'ag-theme-quartz'
  return (
    <div className={themeClass} style={{ height, width: '100%' }}>
      {/* Link Modal */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px #0002', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ fontWeight: 500, marginBottom: 4 }}>Link name (URL):</label>
            <input
              autoFocus
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              style={{
                border: '1px solid #2563eb',
                borderRadius: 4,
                padding: '8px 12px',
                outline: 'none',
                color: '#2563eb',
                fontWeight: 500,
                fontSize: 16,
                marginBottom: 8,
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleLinkModalSave() }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontWeight: 500, marginBottom: 4 }}>Text to display (optional):</label>
              <button
                type="button"
                onClick={() => setLinkText(linkUrl)}
                style={{
                  marginLeft: 8,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid #2563eb',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                title="Use link name as display text"
              >Text</button>
            </div>
            <input
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              placeholder="Display text"
              style={{
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '8px 12px',
                outline: 'none',
                fontSize: 16,
                marginBottom: 8,
                color: '#2563eb',
                background: '#fff',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleLinkModalSave() }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={handleLinkModalCancel} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#eee', color: '#333', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLinkModalSave} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
      <div className="ag-toolbar flex gap-2 items-center p-2 border-b bg-gray-50 dark:bg-black dark:text-white" style={{ position: 'relative' }}>
      <Button size="sm" variant="outline" onClick={handleBold} disabled={!selectedCell} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></Button>
      <Button size="sm" variant="outline" onClick={handleItalic} disabled={!selectedCell} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></Button>
      {/* Add link button */}
      <Button size="sm" variant="outline" onClick={handleAddLink} disabled={!selectedCell} title="Add Link">
        <LinkIcon className="w-4 h-4" />
      </Button>
      {/* Highlight color dropdown */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          size="sm"
          variant="outline"
          style={{ backgroundColor: highlightColor, color: highlightColor === '#fff9c0' ? '#111' : '#111', borderColor: '#ccc', minWidth: 36 }}
          onClick={() => setHighlightDropdownOpen((open) => !open)}
          disabled={!selectedCell}
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
        {highlightDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            background: '#222',
            border: '1px solid #444',
            borderRadius: 4,
            zIndex: 10,
            minWidth: 100,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {[
              { color: '#fff9c0', label: 'Yellow' },
              { color: '#a7f3d0', label: 'Green' },
              { color: '#fbcfe8', label: 'Pink' },
              { color: '#bae6fd', label: 'Blue' },
            ].map(({ color, label }) => (
              <button
                key={color}
                style={{
                  background: color,
                  color: color === '#fff9c0' ? '#111' : '#111',
                  border: 'none',
                  borderRadius: 3,
                  padding: '4px 8px',
                  margin: 1,
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={() => handleHighlight(color)}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, background: color, display: 'inline-block', border: '1px solid #bbb', marginRight: 6 }} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={colDefs.map(col => ({
          ...col,
          cellRendererFramework: (params: any) => {
            const value = params.value
            const link = params.data && params.data[`${params.colDef.field}_link`]
            if (link && value) {
              return (
                <a
                  href={link.startsWith('http') ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                  tabIndex={0}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                >
                  {value}
                </a>
              )
            }
            return value ?? ''
          },
          cellStyle,
        }))}
        onCellValueChanged={onCellValueChanged}
        onCellKeyDown={onCellKeyDown}
        onCellClicked={onCellClicked}
        onBodyScroll={onBodyScroll}
        defaultColDef={{ resizable: true, sortable: false, filter: false }}
        suppressRowClickSelection={true}
        rowSelection="multiple"
        undoRedoCellEditing={true}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  )
}