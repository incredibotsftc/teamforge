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
import { Loader2, FileText } from 'lucide-react'
import { SurveyStatus, SurveyTemplate, SurveyVisibility } from '@/types/surveys'

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
  const [visibility, setVisibility] = useState<SurveyVisibility>('public')
  const [templateId, setTemplateId] = useState<string>('')
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  // Load existing survey data for edit mode
  useEffect(() => {
    if (mode === 'edit' && surveyId) {
      loadSurveyData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, mode])

  const loadTemplates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/survey-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const { templates: loadedTemplates } = await response.json()
        setTemplates(loadedTemplates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

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
        setVisibility(data.visibility || 'public')
        setTemplateId(data.template_id || '')
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
            visibility,
            template_id: templateId || null,
            team_id: team.id,
            season_id: currentSeason.id,
            created_by: user.id,
            published_at: status === 'published' ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (insertError) {
          console.error('Supabase insert error:', insertError)
          throw insertError
        }

        // Pass the created survey ID to onSuccess
        onSuccess?.(data?.id)
      } else {
        // Update existing survey
        const updateData: {
          title: string
          description: string | null
          status: SurveyStatus
          visibility: SurveyVisibility
          template_id?: string | null
          updated_at: string
          published_at?: string
          closed_at?: string
        } = {
          title: title.trim(),
          description: description.trim() || null,
          status,
          visibility,
          template_id: templateId || null,
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

      <div className="space-y-3">
        <Label>Visibility *</Label>
        <div className="space-y-2">
          <div
            className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${visibility === 'public'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
              }`}
            onClick={() => setVisibility('public')}
          >
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={(e) => setVisibility(e.target.value as SurveyVisibility)}
              className="mt-1"
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <div className="font-medium">Public</div>
              <div className="text-sm text-muted-foreground">
                Anyone with the link can access and respond to this survey without logging in.
              </div>
            </div>
          </div>

          <div
            className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${visibility === 'private'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
              }`}
            onClick={() => setVisibility('private')}
          >
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === 'private'}
              onChange={(e) => setVisibility(e.target.value as SurveyVisibility)}
              className="mt-1"
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <div className="font-medium">Private</div>
              <div className="text-sm text-muted-foreground">
                Requires users to log in before accessing the survey. Anyone logged in can respond.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Template (Optional)</Label>
        <Select value={templateId || 'none'} onValueChange={(value) => setTemplateId(value === 'none' ? '' : value)}>
          <SelectTrigger id="template" disabled={isSubmitting}>
            <SelectValue placeholder="Select a template (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Template</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {template.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Apply a template for custom header image and footer content
        </p>
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
