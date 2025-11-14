'use client'

import type { Expense } from '@/types/budget'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Helper function to parse date string as local date (avoids timezone issues)
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

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (id: string) => void
  searchQuery: string
}

export function ExpenseList({ expenses, onEdit, searchQuery }: ExpenseListProps) {

  const getCategoryName = (categoryId: string) => {
    return expenseCategories.find(c => c.id === categoryId)?.name || categoryId
  }

  // Filter expenses based on search query
  const filteredExpenses = expenses.filter((expense) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const description = expense.description.toLowerCase()
    const category = getCategoryName(expense.category).toLowerCase()
    const date = parseLocalDate(expense.date).toLocaleDateString().toLowerCase()
    const amount = expense.amount.toString()
    const vendor = (expense.vendor?.name || '').toLowerCase()

    return (
      description.includes(searchLower) ||
      category.includes(searchLower) ||
      date.includes(searchLower) ||
      amount.includes(searchLower) ||
      vendor.includes(searchLower)
    )
  })

  if (expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No expenses recorded yet. Click &quot;Add Expense&quot; to get started.
      </p>
    )
  }

  if (filteredExpenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        {searchQuery ? 'No expenses match your search.' : 'No expenses recorded yet.'}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredExpenses.map((expense) => (
          <TableRow
            key={expense.id}
            className="cursor-pointer"
            onClick={() => onEdit(expense.id)}
          >
            <TableCell className="text-muted-foreground">
              {parseLocalDate(expense.date).toLocaleDateString()}
            </TableCell>
            <TableCell className="font-medium">{expense.description}</TableCell>
            <TableCell className="text-muted-foreground">
              {getCategoryName(expense.category)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {expense.vendor?.name || '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              ${Number(expense.amount).toLocaleString()}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(expense.id)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
