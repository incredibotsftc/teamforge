'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Expense } from '@/types/budget'
import { arrayToCSV, downloadCSV, formatDateForFilename } from '@/lib/csvExport'

interface ExportExpensesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenses: Expense[]
  teamName?: string
}

// Helper function to parse date string as local date
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const expenseCategories = [
  { id: 'food', name: 'Food & Refreshments' },
  { id: 'events', name: 'Events & Competition Fees' },
  { id: 'materials', name: 'Robot Materials & Parts' },
  { id: 'tools', name: 'Tools & Equipment' },
  { id: 'travel', name: 'Travel & Transportation' },
  { id: 'apparel', name: 'Team Apparel' },
  { id: 'marketing', name: 'Marketing & Outreach' },
  { id: 'other', name: 'Other' },
]

function getCategoryName(categoryId: string) {
  return expenseCategories.find(c => c.id === categoryId)?.name || categoryId
}

export function ExportExpensesDialog({
  open,
  onOpenChange,
  expenses,
  teamName = 'Team',
}: ExportExpensesDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [exporting, setExporting] = useState(false)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const handleExport = () => {
    setExporting(true)

    try {
      // Filter expenses by date range
      let filteredExpenses = expenses

      if (startDate || endDate) {
        filteredExpenses = expenses.filter(expense => {
          const expenseDate = parseLocalDate(expense.date)

          if (startDate && expenseDate < startDate) return false
          if (endDate) {
            // Set end date to end of day for comparison
            const endOfDay = new Date(endDate)
            endOfDay.setHours(23, 59, 59, 999)
            if (expenseDate > endOfDay) return false
          }

          return true
        })
      }

      // Sort by date
      const sortedExpenses = [...filteredExpenses].sort((a, b) => {
        return parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
      })

      // Prepare data for CSV
      const csvData = sortedExpenses.map(expense => ({
        date: expense.date,
        description: expense.description,
        category: getCategoryName(expense.category),
        vendor: expense.vendor?.name || '',
        amount: expense.amount,
        notes: expense.notes || '',
      }))

      // Define CSV headers
      const headers = [
        { key: 'date' as const, label: 'Date' },
        { key: 'description' as const, label: 'Description' },
        { key: 'category' as const, label: 'Category' },
        { key: 'vendor' as const, label: 'Vendor' },
        { key: 'amount' as const, label: 'Amount' },
        { key: 'notes' as const, label: 'Notes' },
      ]

      // Generate CSV
      const csvContent = arrayToCSV(csvData, headers)

      // Generate filename
      const dateRangeStr = startDate || endDate
        ? `_${startDate ? formatDateForFilename(startDate) : 'beginning'}_to_${endDate ? formatDateForFilename(endDate) : 'present'}`
        : '_all'

      const filename = `${teamName.replace(/\s+/g, '_')}_expenses${dateRangeStr}.csv`

      // Download
      downloadCSV(csvContent, filename)

      // Close dialog
      onOpenChange(false)

      // Reset dates
      setStartDate(undefined)
      setEndDate(undefined)
    } catch (error) {
      console.error('Error exporting expenses:', error)
      alert('Failed to export expenses. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Expenses to CSV</DialogTitle>
          <DialogDescription>
            Select a date range to filter expenses, or leave blank to export all expenses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (optional)</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : <span>Pick start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date)
                    setStartDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (optional)</Label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>Pick end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date)
                    setEndDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {startDate && endDate && startDate > endDate && (
            <p className="text-sm text-destructive">
              Start date must be before end date
            </p>
          )}

          <div className="text-sm text-muted-foreground">
            {startDate || endDate ? (
              <p>
                Exporting expenses from{' '}
                <strong>{startDate ? format(startDate, 'MMM d, yyyy') : 'beginning'}</strong>
                {' '}to{' '}
                <strong>{endDate ? format(endDate, 'MMM d, yyyy') : 'present'}</strong>
              </p>
            ) : (
              <p>Exporting all expenses ({expenses.length} total)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || (startDate !== undefined && endDate !== undefined && startDate > endDate)}
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
