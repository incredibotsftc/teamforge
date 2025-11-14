'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VendorAutocomplete } from '@/components/budget/VendorAutocomplete'
import { supabase } from '@/lib/supabase'
import { useTeamData } from '@/hooks/useTeamData'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { getOrCreateVendor, getVendorById } from '@/lib/vendors'
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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

// Helper function to format date as YYYY-MM-DD in local timezone
function formatDateForDB(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface ExpenseFormContentProps {
  expenseId?: string
  mode: 'create' | 'edit'
  onSuccess?: () => void
}

export function ExpenseFormContent({ expenseId, mode, onSuccess }: ExpenseFormContentProps) {
  const { team } = useTeamData()
  const { currentSeason } = useAppData()
  const { user } = useAuth()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [vendorName, setVendorName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  // Load existing expense data for edit mode
  useEffect(() => {
    if (mode === 'edit' && expenseId) {
      loadExpenseData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId, mode])

  const loadExpenseData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setDescription(data.description || '')
        setAmount(data.amount?.toString() || '')
        setCategory(data.category || '')
        // Parse date as local date to avoid timezone issues
        if (data.date) {
          const [year, month, day] = data.date.split('-').map(Number)
          setDate(new Date(year, month - 1, day))
        } else {
          setDate(new Date())
        }

        // Load vendor name if vendor_id exists
        if (data.vendor_id) {
          const vendor = await getVendorById(data.vendor_id)
          if (vendor) {
            setVendorName(vendor.name)
          }
        }

        setNotes(data.notes || '')
      }
    } catch (err) {
      console.error('Error loading expense:', err)
      setError('Failed to load expense data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!team?.id) {
      setError('No team selected')
      return
    }

    if (!currentSeason?.id) {
      setError('No current season set')
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!category) {
      setError('Please select a category')
      return
    }

    if (!date) {
      setError('Please select a date')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Handle vendor - get or create vendor ID
      let vendorId: string | null = null
      if (vendorName.trim()) {
        vendorId = await getOrCreateVendor(team.id, vendorName.trim(), user?.id)
      }

      const expenseData = {
        description: description.trim(),
        amount: Number(amount),
        category,
        date: formatDateForDB(date),
        vendor_id: vendorId,
        notes: notes.trim() || null,
        team_id: team.id,
        season_id: currentSeason.id,
      }

      if (mode === 'edit' && expenseId) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', expenseId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('expenses')
          .insert(expenseData)

        if (insertError) throw insertError
      }

      // Call success callback
      onSuccess?.()
    } catch (err) {
      console.error('Error saving expense:', err)
      setError(mode === 'edit' ? 'Failed to update expense' : 'Failed to create expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!expenseId) return

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (deleteError) throw deleteError

      // Call success callback
      onSuccess?.()
    } catch (err) {
      console.error('Error deleting expense:', err)
      setError('Failed to delete expense')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            placeholder="Enter expense description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor (optional)</Label>
          {team?.id ? (
            <VendorAutocomplete
              teamId={team.id}
              value={vendorName}
              onChange={setVendorName}
              placeholder="Enter vendor or supplier name"
              disabled={isSubmitting || isDeleting}
            />
          ) : (
            <Input
              id="vendor"
              placeholder="Enter vendor or supplier name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              disabled
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional notes about this expense"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || isDeleting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'edit' ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              mode === 'edit' ? 'Update Expense' : 'Create Expense'
            )}
          </Button>

          {mode === 'edit' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
