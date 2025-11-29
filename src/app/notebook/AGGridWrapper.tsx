// 'use client'
// import { useRef, useEffect, useState, useCallback } from 'react'
// import { Bold, Italic, Highlighter } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { AgGridReact } from 'ag-grid-react'
// import 'ag-grid-community/styles/ag-grid.css'
// import 'ag-grid-community/styles/ag-theme-alpine.css'

// interface AGGridWrapperProps {
//   data?: any
//   onChange?: (data: any) => void
//   height?: string | number
// }

// export default function AGGridWrapper({ data, onChange, height = 400 }: AGGridWrapperProps) {
//   // Default to 10x6 grid if no data
//   const defaultCols = Array(6).fill(0).map((_, i) => ({
//     field: `col${i+1}`,
//     headerName: String.fromCharCode(65 + i),
//     editable: true,
//     flex: 1,
//   cellClass: (params: any) => params.data && params.data[`col${i+1}_bold`] ? 'ag-bold' : '',
//   }))
//   const [colDefs, setColDefs] = useState<any[]>(data?.cols || defaultCols)
//   const [rowData, setRowData] = useState<any[]>(data?.rows || Array(10).fill(null).map(() => ({ })))


//   // AG Grid API ref
//   const gridRef = useRef<any>(null)

//   // Track selected cell
//   const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colId: string } | null>(null)

//   // Emit changes upward
//   const handleCellValueChanged = useCallback(() => {
//     onChange && onChange({ rows: rowData, cols: colDefs })
//   }, [rowData, colDefs, onChange])

//   // AG Grid event: update rowData on cell edit
//   const onCellValueChanged = useCallback((params: any) => {
//     setRowData(params.api.getDisplayedRowAtIndex(0).gridOptionsWrapper.gridOptions.rowData)
//     handleCellValueChanged()
//   }, [handleCellValueChanged])

//   // Keyboard shortcuts for bold/italic, and track selection
//   const onCellKeyDown = useCallback((params: any) => {
//     const col = params.column.getColId()
//     const rowIdx = params.node.rowIndex
//     setSelectedCell({ rowIdx, colId: col })
//     if ((params.event.ctrlKey || params.event.metaKey) && params.event.key === 'b') {
//       // Toggle bold for current cell
//       setRowData(prev => {
//         const next = prev.map((row, i) => i === rowIdx ? { ...row, [`${col}_bold`]: !row[`${col}_bold`] } : row)
//         return next
//       })
//       params.event.preventDefault()
//     }
//     if ((params.event.ctrlKey || params.event.metaKey) && params.event.key === 'i') {
//       // Toggle italic for current cell
//       setRowData(prev => {
//         const next = prev.map((row, i) => i === rowIdx ? { ...row, [`${col}_italic`]: !row[`${col}_italic`] } : row)
//         return next
//       })
//       params.event.preventDefault()
//     }
//   }, [])

//   // Track cell selection
//   const onCellClicked = useCallback((params: any) => {
//     setSelectedCell({ rowIdx: params.node.rowIndex, colId: params.column.getColId() })
//   }, [])

//   // Toolbar actions
//   const handleBold = () => {
//     if (!selectedCell) return
//     setRowData(prev => prev.map((row, i) => i === selectedCell.rowIdx ? { ...row, [`${selectedCell.colId}_bold`]: !row[`${selectedCell.colId}_bold`] } : row))
//   }
//   const handleItalic = () => {
//     if (!selectedCell) return
//     setRowData(prev => prev.map((row, i) => i === selectedCell.rowIdx ? { ...row, [`${selectedCell.colId}_italic`]: !row[`${selectedCell.colId}_italic`] } : row))
//   }
//   const handleHighlight = () => {
//     if (!selectedCell) return
//     setRowData(prev => prev.map((row, i) => i === selectedCell.rowIdx ? { ...row, [`${selectedCell.colId}_highlight`]: !row[`${selectedCell.colId}_highlight`] } : row))
//   }

//   // Custom cell style for bold/italic/highlight
//   const cellStyle = useCallback((params: any) => {
//     const col = params.colDef.field
//     const isBold = params.data && params.data[`${col}_bold`]
//     const isItalic = params.data && params.data[`${col}_italic`]
//     const isHighlight = params.data && params.data[`${col}_highlight`]
//     return {
//       fontWeight: isBold ? 'bold' : undefined,
//       fontStyle: isItalic ? 'italic' : undefined,
//       backgroundColor: isHighlight ? '#fff9c0' : undefined,
//     }
//   }, [])

//   return (
//     <div className="ag-theme-alpine" style={{ height, width: '100%' }}>
//       <div className="flex gap-2 items-center p-2 border-b bg-gray-50">
//         <Button size="sm" variant="outline" onClick={handleBold} disabled={!selectedCell} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></Button>
//         <Button size="sm" variant="outline" onClick={handleItalic} disabled={!selectedCell} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></Button>
//         <Button size="sm" variant="outline" onClick={handleHighlight} disabled={!selectedCell} title="Highlight"><Highlighter className="w-4 h-4" /></Button>
//       </div>
//       <AgGridReact
//         ref={gridRef}
//         rowData={rowData}
//         columnDefs={colDefs.map(col => ({ ...col, cellStyle }))}
//         onCellValueChanged={onCellValueChanged}
//         onCellKeyDown={onCellKeyDown}
//         onCellClicked={onCellClicked}
//         defaultColDef={{ resizable: true, sortable: false, filter: false }}
//         suppressRowClickSelection={true}
//         rowSelection="multiple"
//         undoRedoCellEditing={true}
//         stopEditingWhenCellsLoseFocus={true}
//       />
//     </div>
//   )
// }
