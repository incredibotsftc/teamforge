'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useTeamData } from '@/hooks/useTeamData'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { Loader2, Trash2 } from 'lucide-react'
import { fundraisingSourceTypes, fundraisingStatuses } from '@/types/fundraising'

interface FundraisingFormContentProps {
  fundraisingId?: string
  mode: 'create' | 'edit'
  onSuccess?: () => void
}

export function FundraisingFormContent({ fundraisingId, mode, onSuccess }: FundraisingFormContentProps) {
  const { team } = useTeamData()
  const { currentSeason } = useAppData()
  const { user } = useAuth()

  // Form fields
  const [sourceType, setSourceType] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [amountRequested, setAmountRequested] = useState('')
  const [amountCommitted, setAmountCommitted] = useState('')
  const [amountReceived, setAmountReceived] = useState('')
  const [dateContacted, setDateContacted] = useState('')
  const [dateCommitted, setDateCommitted] = useState('')
  const [dateReceived, setDateReceived] = useState('')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [recognitionType, setRecognitionType] = useState('')
  const [recurring, setRecurring] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  // Load existing fundraising data for edit mode
  useEffect(() => {
    if (mode === 'edit' && fundraisingId) {
      loadFundraisingData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundraisingId, mode])

  const loadFundraisingData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('fundraising')
        .select('*')
        .eq('id', fundraisingId)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setSourceType(data.source_type || '')
        setSourceName(data.source_name || '')
        setContactName(data.contact_name || '')
        setContactEmail(data.contact_email || '')
        setContactPhone(data.contact_phone || '')
        setAmountRequested(data.amount_requested?.toString() || '')
        setAmountCommitted(data.amount_committed?.toString() || '')
        setAmountReceived(data.amount_received?.toString() || '')
        setDateContacted(data.date_contacted || '')
        setDateCommitted(data.date_committed || '')
        setDateReceived(data.date_received || '')
        setDeadline(data.deadline || '')
        setStatus(data.status || '')
        setDescription(data.description || '')
        setNotes(data.notes || '')
        setRecognitionType(data.recognition_type || '')
        setRecurring(data.recurring || false)
      }
    } catch (err) {
      console.error('Error loading fundraising:', err)
      setError('Failed to load fundraising data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!team?.id || !currentSeason?.id || !user?.id) {
      setError('Missing required data')
      return
    }

    if (!sourceName.trim()) {
      setError('Source name is required')
      return
    }

    if (!sourceType) {
      setError('Please select a source type')
      return
    }

    if (!status) {
      setError('Please select a status')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const fundraisingData = {
        source_type: sourceType,
        source_name: sourceName.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        amount_requested: amountRequested ? Number(amountRequested) : null,
        amount_committed: amountCommitted ? Number(amountCommitted) : null,
        amount_received: amountReceived ? Number(amountReceived) : 0,
        date_contacted: dateContacted || null,
        date_committed: dateCommitted || null,
        date_received: dateReceived || null,
        deadline: deadline || null,
        status: status,
        description: description.trim() || null,
        notes: notes.trim() || null,
        recognition_type: recognitionType.trim() || null,
        recurring: recurring,
      }

      if (mode === 'edit' && fundraisingId) {
        const { error: updateError } = await supabase
          .from('fundraising')
          .update({
            ...fundraisingData,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fundraisingId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('fundraising')
          .insert({
            ...fundraisingData,
            team_id: team.id,
            season_id: currentSeason.id,
            created_by: user.id,
            updated_by: user.id,
          })

        if (insertError) throw insertError
      }

      // Call success callback
      onSuccess?.()
    } catch (err) {
      console.error('Error saving fundraising:', err)
      setError(mode === 'edit' ? 'Failed to update fundraising' : 'Failed to create fundraising')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!fundraisingId) return

    if (!confirm('Are you sure you want to delete this fundraising record? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('fundraising')
        .delete()
        .eq('id', fundraisingId)

      if (deleteError) throw deleteError

      // Call success callback
      onSuccess?.()
    } catch (err) {
      console.error('Error deleting fundraising:', err)
      setError('Failed to delete fundraising')
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
        {/* Source Information */}
        <div className="space-y-4 pb-4 border-b">
          <h3 className="font-semibold text-sm">Source Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source_type">Source Type *</Label>
              <Select value={sourceType} onValueChange={setSourceType} required>
                <SelectTrigger id="source_type">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  {fundraisingSourceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_name">Company/Organization/Name *</Label>
              <Input
                id="source_name"
                placeholder="e.g., ABC Corporation"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 pb-4 border-b">
          <h3 className="font-semibold text-sm">Contact Information (Optional)</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                placeholder="John Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="john@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="space-y-4 pb-4 border-b">
          <h3 className="font-semibold text-sm">Financial Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_requested">Amount Requested ($)</Label>
              <Input
                id="amount_requested"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountRequested}
                onChange={(e) => setAmountRequested(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_committed">Amount Committed ($)</Label>
              <Input
                id="amount_committed"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountCommitted}
                onChange={(e) => setAmountCommitted(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_received">Amount Received ($)</Label>
              <Input
                id="amount_received"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4 pb-4 border-b">
          <h3 className="font-semibold text-sm">Timeline</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_contacted">Date Contacted</Label>
              <Input
                id="date_contacted"
                type="date"
                value={dateContacted}
                onChange={(e) => setDateContacted(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Application Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_committed">Date Committed</Label>
              <Input
                id="date_committed"
                type="date"
                value={dateCommitted}
                onChange={(e) => setDateCommitted(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_received">Date Received</Label>
              <Input
                id="date_received"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Status and Additional Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {fundraisingStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} - {s.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this sponsorship/grant for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recognition_type">Recognition Type</Label>
            <Input
              id="recognition_type"
              placeholder="e.g., Logo on robot, Website listing, etc."
              value={recognitionType}
              onChange={(e) => setRecognitionType(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes, follow-up items, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={recurring}
              onCheckedChange={(checked) => setRecurring(checked as boolean)}
            />
            <Label htmlFor="recurring" className="font-normal cursor-pointer">
              This is a recurring sponsorship/donation
            </Label>
          </div>
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
              mode === 'edit' ? 'Update Fundraising' : 'Create Fundraising'
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
