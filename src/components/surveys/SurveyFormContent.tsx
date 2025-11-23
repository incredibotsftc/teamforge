'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { Loader2 } from 'lucide-react'
import { SurveyStatus } from '@/types/surveys'

interface SurveyFormContentProps {
  surveyId?: string
  mode: 'create' | 'edit'
  onSuccess?: (surveyId?: string) => void
}

export function SurveyFormContent({ surveyId, mode, onSuccess }: SurveyFormContentProps) {
  const { currentSeason, team } = useAppData()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<SurveyStatus>('draft')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Load existing survey data for edit mode
  useEffect(() => {
    if (mode === 'edit' && surveyId) {
      loadSurveyData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, mode])

  const loadSurveyData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setTitle(data.title || '')
        setDescription(data.description || '')
        setStatus(data.status || 'draft')
      }
    } catch (err) {
      console.error('Error loading survey:', err)
      setError('Failed to load survey data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!currentSeason?.id) {
      setError('No current season set')
      return
    }

    if (!team?.id) {
      setError('No team selected')
      return
    }

    if (!user?.id) {
      setError('Not authenticated')
      return
    }

    try {
      setIsSubmitting(true)

      if (mode === 'create') {
        // Create new survey
        const { data, error: insertError } = await supabase
          .from('surveys')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            status,
            team_id: team.id,
            season_id: currentSeason.id,
            created_by: user.id,
            published_at: status === 'published' ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Pass the created survey ID to onSuccess
        onSuccess?.(data?.id)
      } else {
        // Update existing survey
        const updateData: {
          title: string
          description: string | null
          status: SurveyStatus
          updated_at: string
          published_at?: string
          closed_at?: string
        } = {
          title: title.trim(),
          description: description.trim() || null,
          status,
          updated_at: new Date().toISOString()
        }

        // Set timestamps based on status
        if (status === 'published') {
          updateData.published_at = new Date().toISOString()
        }
        if (status === 'closed') {
          updateData.closed_at = new Date().toISOString()
        }

        const { error: updateError } = await supabase
          .from('surveys')
          .update(updateData)
          .eq('id', surveyId)

        if (updateError) throw updateError

        // Call onSuccess for update (without ID since we're editing)
        onSuccess?.()
      }
    } catch (err) {
      console.error('Error saving survey:', err)
      setError(err instanceof Error ? err.message : 'Failed to save survey')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter survey title"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional survey description"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as SurveyStatus)}>
          <SelectTrigger id="status" disabled={isSubmitting}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {status === 'draft' && 'Survey is editable but not accessible publicly'}
          {status === 'published' && 'Survey is public and accepting responses'}
          {status === 'closed' && 'Survey is public but no longer accepting responses'}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="btn-accent">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Survey' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
