
"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Bold, Italic, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UniverWrapperProps {
  data?: any
  onChange?: (data: any) => void
  height?: string | number
}

interface CellStyle {
  bold?: boolean
  italic?: boolean
}

interface GridCell {
  value: string
  style?: CellStyle
}

export default function UniverWrapper({ data, onChange, height = '100%' }: UniverWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [grid, setGrid] = useState<GridCell[][]>(() => {
    try {
      if (data && typeof data === 'object' && Array.isArray((data as any).sheets)) {
        const sheet = (data as any).sheets[0]
        if (sheet?.cellStyles && sheet?.data) {
          return sheet.data.map((row: string[], r: number) =>
            row.map((val: string, c: number) => ({
              value: val,
              style: sheet.cellStyles?.[r]?.[c]
            }))
          )
        }
        return sheet?.data ?? []
      }
    } catch (e) {
      // ignore
    }
    // default 8x5
    return Array.from({ length: 8 }, () =>
      Array.from({ length: 5 }, () => ({ value: '', style: {} }))
    )
  })

  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0])
  const [editingCell, setEditingCell] = useState<[number, number] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Notify parent when grid changes
  useEffect(() => {
    const fileLike = {
      sheets: [
        {
          name: 'Sheet1',
          data: grid.map(row => row.map(cell => cell.value)),
          cellStyles: grid.map(row =>
            row.map(cell => cell.style || {})
          )
        }
      ]
    }
    onChange?.(fileLike)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid])

  const [r, c] = selectedCell

  const setCell = useCallback((row: number, col: number, value: string, style?: CellStyle) => {
    setGrid(prev => {
      const next = prev.map(r => r.map(cell => ({ ...cell })))
      // ensure row exists
      while (next.length <= row) next.push(Array.from({ length: next[0]?.length || 5 }, () => ({ value: '', style: {} })))
      while (next[row].length <= col) next[row].push({ value: '', style: {} })
      next[row][col] = { value, style: style || next[row][col].style }
      return next
    })
  }, [])

  const addRow = () => {
    setGrid(prev => [...prev, Array.from({ length: prev[0]?.length || 5 }, () => ({ value: '', style: {} }))])
  }

  const removeRow = () => {
    setGrid(prev => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }

  const addCol = () => {
    setGrid(prev => prev.map(row => [...row, { value: '', style: {} }]))
  }

  const removeCol = () => {
    setGrid(prev => (prev[0]?.length > 1 ? prev.map(row => row.slice(0, -1)) : prev))
  }

  const toggleBold = () => {
    if (editingCell) return
    const [row, col] = selectedCell
    setCell(row, col, grid[row][col].value, {
      ...grid[row][col].style,
      bold: !grid[row][col].style?.bold
    })
  }

  const toggleItalic = () => {
    if (editingCell) return
    const [row, col] = selectedCell
    setCell(row, col, grid[row][col].value, {
      ...grid[row][col].style,
      italic: !grid[row][col].style?.italic
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editingCell) return

    const [row, col] = editingCell

    if (e.key === 'Enter') {
      e.preventDefault()
      setCell(row, col, inputRef.current?.value || '')
      setEditingCell(null)
      // Move down one cell
      const nextRow = Math.min(row + 1, grid.length - 1)
      setSelectedCell([nextRow, col])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingCell(null)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setCell(row, col, inputRef.current?.value || '')
      setEditingCell(null)
      const nextCol = (col + 1) % (grid[0]?.length || 5)
      const nextRow = col + 1 >= (grid[0]?.length || 5) ? row + 1 : row
      if (nextRow < grid.length) {
        setSelectedCell([nextRow, nextCol])
      }
    }
  }

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingCell) return

    const [row, col] = selectedCell
    let moved = false
    let newR = row
    let newC = col

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) {
          newR = row - 1
          moved = true
        }
        break
      case 'ArrowDown':
        if (row < grid.length - 1) {
          newR = row + 1
          moved = true
        }
        break
      case 'ArrowLeft':
        if (col > 0) {
          newC = col - 1
          moved = true
        }
        break
      case 'ArrowRight':
        if (col < (grid[0]?.length || 5) - 1) {
          newC = col + 1
          moved = true
        }
        break
      case 'Enter':
        e.preventDefault()
        setEditingCell([row, col])
        break
      case 'Delete':
        e.preventDefault()
        setCell(row, col, '')
        break
      default:
        // Allow typing to start editing
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          setEditingCell([row, col])
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.value = e.key
              inputRef.current.focus()
            }
          }, 0)
        }
        break
    }

    if (moved) {
      e.preventDefault()
      setSelectedCell([newR, newC])
    }
  }

  const cellStyle = (cellData: GridCell) => ({
    fontWeight: cellData.style?.bold ? 'bold' : 'normal',
    fontStyle: cellData.style?.italic ? 'italic' : 'normal'
  })

  return (
    <div className="w-full h-full flex flex-col bg-white" style={{ height }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <Button
          size="sm"
          variant={grid[r]?.[c]?.style?.bold ? 'default' : 'outline'}
          onClick={toggleBold}
          disabled={editingCell !== null}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={grid[r]?.[c]?.style?.italic ? 'default' : 'outline'}
          onClick={toggleItalic}
          disabled={editingCell !== null}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div className="ml-auto flex gap-1">
          <Button size="sm" onClick={addRow} disabled={editingCell !== null}>
            <Plus className="w-4 h-4 mr-1" />
            Row
          </Button>
          <Button size="sm" onClick={removeRow} disabled={editingCell !== null}>
            <Trash2 className="w-4 h-4 mr-1" />
            Row
          </Button>
          <Button size="sm" onClick={addCol} disabled={editingCell !== null}>
            <Plus className="w-4 h-4 mr-1" />
            Col
          </Button>
          <Button size="sm" onClick={removeCol} disabled={editingCell !== null}>
            <Trash2 className="w-4 h-4 mr-1" />
            Col
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onKeyDown={handleGridKeyDown}
        tabIndex={0}
      >
        <table className="border-collapse w-full" style={{ minWidth: '100%' }}>
          <thead>
            <tr>
              <th className="p-1 border border-gray-300 bg-gray-100 text-xs w-10 font-semibold">#</th>
              {grid[0]?.map((_, c) => (
                <th
                  key={c}
                  className="p-1 border border-gray-300 bg-gray-100 text-xs font-semibold"
                  style={{ minWidth: '80px', width: '80px' }}
                >
                  {String.fromCharCode(65 + (c % 26))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="p-0 border border-gray-300 text-xs text-center bg-gray-100 text-gray-600 font-medium w-10">
                  {rowIdx + 1}
                </td>
                {row.map((cellData, colIdx) => {
                  const isSelected = rowIdx === r && colIdx === c
                  const isEditing = editingCell && editingCell[0] === rowIdx && editingCell[1] === colIdx

                  return (
                    <td
                      key={colIdx}
                      className={`p-0 border ${
                        isSelected ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedCell([rowIdx, colIdx])
                        setEditingCell(null)
                      }}
                      style={{ minWidth: '80px', width: '80px' }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          autoFocus
                          defaultValue={cellData.value}
                          onKeyDown={handleKeyDown}
                          onBlur={() => {
                            setCell(rowIdx, colIdx, inputRef.current?.value || '')
                            setEditingCell(null)
                          }}
                          className="w-full h-8 px-2 border-0 outline-none text-sm"
                          style={cellStyle(cellData)}
                        />
                      ) : (
                        <div
                          className="w-full h-8 px-2 flex items-center text-sm cursor-cell select-none overflow-hidden text-ellipsis whitespace-nowrap"
                          onDoubleClick={() => setEditingCell([rowIdx, colIdx])}
                          style={cellStyle(cellData)}
                        >
                          {cellData.value}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
