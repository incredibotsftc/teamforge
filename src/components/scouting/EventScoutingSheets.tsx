'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, FileText, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { FieldAnnotation } from './FieldAnnotation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { toast } from 'sonner'

interface Question {
  id: string
  text: string
  type?: 'text' | 'number' | 'multiple-choice' | 'checkbox' | 'scale' | 'long-text' | 'image' | 'field'
  options?: string[]
  scaleMin?: number
  scaleMax?: number
  mandatory?: boolean
}

// Response value can be various types based on question type
type ResponseValue = string | number | string[] | null | undefined

interface ScoutingResponse {
  id: string
  scouting_team_number: number | null
  scouting_event_id: string | null
  questions: Question[]
  responses: Record<string, ResponseValue>
  created_at: string
  created_by: string
  metadata: {
    event_code?: string
    event_name?: string
    scouting_team_name?: string
  }
  teams?: {
    team_number: number
    team_name: string
  }
}

interface TeamInfo {
  teamNumber: number
  nameFull?: string
  nameShort?: string
}

interface EventScoutingSheetsProps {
  eventCode: string
  eventName: string
  seasonId?: string
  teamNumber?: number | null
  teamName?: string | null
  eventTeams: TeamInfo[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventScoutingSheets({
  eventCode,
  eventName,
  seasonId,
  teamNumber,
  // teamName is passed but not currently used
  eventTeams,
  open,
  onOpenChange
}: EventScoutingSheetsProps) {
  const { user } = useAuth()
  const { team, currentSeason } = useAppData()
  const [loading, setLoading] = useState(false)
  const [responses, setResponses] = useState<ScoutingResponse[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editedResponses, setEditedResponses] = useState<Record<string, Record<string, ResponseValue>>>({})
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})

  const fetchResponses = useCallback(async () => {
    setLoading(true)
    setError(null)
    setCurrentIndex(0)

    try {
      // Load the template first
      if (!team?.id || !currentSeason?.id) {
        setResponses([])
        setLoading(false)
        return
      }

      const { data: template, error: templateError } = await supabase
        .from('scouting_templates')
        .select('content')
        .eq('team_id', team.id)
        .eq('season_id', currentSeason.id)
        .maybeSingle()

      if (templateError || !template?.content?.questions) {
        console.error('Failed to load template:', templateError)
        setError('No scouting template found. Please create a template first.')
        setResponses([])
        setLoading(false)
        return
      }

      const templateQuestions = template.content.questions

      // Fetch existing responses directly from Supabase
      let responsesQuery = supabase
        .from('scouting_responses')
        .select(`
          *,
          teams:team_id (
            team_number,
            team_name
          )
        `)
        .filter('metadata->>event_code', 'eq', eventCode)
        .order('created_at', { ascending: false })

      // Optionally filter by season
      if (seasonId) {
        responsesQuery = responsesQuery.eq('season_id', seasonId)
      }

      const { data: existingResponses, error: responsesError } = await responsesQuery

      if (responsesError) {
        console.error('Error fetching responses:', responsesError)
        setError('Failed to load existing responses')
        setLoading(false)
        return
      }

      // Create a map of existing responses by team number
      const responseMap = new Map<number, ScoutingResponse>()
      existingResponses?.forEach((r: ScoutingResponse) => {
        if (r.scouting_team_number) {
          responseMap.set(r.scouting_team_number, r)
        }
      })

      // Determine which teams to show
      let teamsToShow = eventTeams
      if (teamNumber !== null && teamNumber !== undefined) {
        // Filter to only the selected team
        teamsToShow = eventTeams.filter(t => t.teamNumber === teamNumber)
      }

      // Create responses for all teams (existing or blank)
      const allResponses: ScoutingResponse[] = teamsToShow.map(teamInfo => {
        const existing = responseMap.get(teamInfo.teamNumber)

        if (existing) {
          // Use existing response
          return existing
        } else {
          // Create blank response
          return {
            id: `temp-new-${teamInfo.teamNumber}`,
            scouting_team_number: teamInfo.teamNumber,
            scouting_event_id: eventCode,
            questions: templateQuestions,
            responses: {},
            created_at: new Date().toISOString(),
            created_by: user?.id || '',
            metadata: {
              event_code: eventCode,
              event_name: eventName,
              scouting_team_name: teamInfo.nameShort || teamInfo.nameFull || `Team ${teamInfo.teamNumber}`
            }
          }
        }
      })

      // Sort by team number
      allResponses.sort((a, b) => (a.scouting_team_number || 0) - (b.scouting_team_number || 0))

      setResponses(allResponses)
    } catch (err) {
      console.error('Error fetching responses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scouting responses')
    } finally {
      setLoading(false)
    }
  }, [team, currentSeason, eventCode, seasonId, eventTeams, teamNumber, eventName, user])

  useEffect(() => {
    if (open && eventCode) {
      fetchResponses()
    }
  }, [open, eventCode, fetchResponses])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const currentResponse = responses[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < responses.length - 1

  // Get current edited responses or fallback to original
  const currentEditedResponses = editedResponses[currentResponse?.id] || currentResponse?.responses || {}

  useEffect(() => {
    // Initialize edited responses when current response changes
    if (currentResponse && !editedResponses[currentResponse.id]) {
      setEditedResponses(prev => ({
        ...prev,
        [currentResponse.id]: currentResponse.responses
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentResponse])

  const handlePrevious = async () => {
    if (!hasPrevious) return

    // Auto-save if there are changes
    const hasChanges = currentResponse && editedResponses[currentResponse.id] &&
      JSON.stringify(editedResponses[currentResponse.id]) !== JSON.stringify(currentResponse.responses)

    if (hasChanges) {
      await handleSave()
    }

    setCurrentIndex(prev => prev - 1)
  }

  const handleNext = async () => {
    if (!hasNext) return

    // Auto-save if there are changes
    const hasChanges = currentResponse && editedResponses[currentResponse.id] &&
      JSON.stringify(editedResponses[currentResponse.id]) !== JSON.stringify(currentResponse.responses)

    if (hasChanges) {
      await handleSave()
    }

    setCurrentIndex(prev => prev + 1)
  }

  const setResponse = (questionId: string, value: string | number | string[]) => {
    if (!currentResponse) return

    setEditedResponses(prev => ({
      ...prev,
      [currentResponse.id]: {
        ...(prev[currentResponse.id] || currentResponse.responses),
        [questionId]: value
      }
    }))
  }

  const handleImageUpload = async (questionId: string, file: File) => {
    if (!team?.id || !currentSeason?.id) {
      toast.error('Team or season not found')
      return
    }

    if (!currentResponse) return

    const uploadKey = `${currentResponse.id}-${questionId}`
    setUploadingImages(prev => ({ ...prev, [uploadKey]: true }))

    try {
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${team.id}/${currentSeason.id}/scouting-responses/${currentResponse.scouting_team_number}/${questionId}/${timestamp}.${fileExt}`

      const { error } = await supabase.storage
        .from('scouting-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        toast.error('Failed to upload image')
        return
      }

      const { data: urlData } = supabase.storage
        .from('scouting-images')
        .getPublicUrl(fileName)

      setResponse(questionId, urlData.publicUrl)
      toast.success('Image uploaded')
    } catch (err) {
      console.error('Failed to upload image:', err)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImages(prev => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleSave = async (silent = false) => {
    if (!user?.id) {
      if (!silent) toast.error('Sign in to save changes')
      return false
    }

    if (!currentResponse) return false

    setSaving(true)
    try {
      const updatedResponses = editedResponses[currentResponse.id] || currentResponse.responses

      // Check if this is a new response (temp ID starts with 'temp-new')
      if (currentResponse.id.startsWith('temp-new')) {
        // Insert new response
        const payload = {
          team_id: team?.id || null,
          season_id: currentSeason?.id || null,
          scouting_team_number: currentResponse.scouting_team_number,
          scouting_event_id: currentResponse.scouting_event_id,
          questions: currentResponse.questions,
          responses: updatedResponses,
          metadata: currentResponse.metadata,
          created_by: user.id,
          updated_by: user.id,
          template_id: null
        }

        const { data, error } = await supabase
          .from('scouting_responses')
          .insert([payload])
          .select('*')

        if (error) {
          console.error('Failed to save new response:', error)
          if (!silent) toast.error('Failed to save response')
          return false
        } else if (data && data.length > 0) {
          // Update the response with the new ID from database
          const newResponse = {
            ...currentResponse,
            id: data[0].id,
            responses: updatedResponses
          }
          setResponses([newResponse])
          // Update edited responses to use the new ID
          setEditedResponses({ [data[0].id]: updatedResponses })
          if (!silent) toast.success('Scouting sheet saved successfully')
          return true
        }
      } else {
        // Update existing response
        const { error } = await supabase
          .from('scouting_responses')
          .update({
            responses: updatedResponses,
            updated_by: user.id
          })
          .eq('id', currentResponse.id)

        if (error) {
          console.error('Failed to save changes:', error)
          if (!silent) toast.error('Failed to save changes')
          return false
        } else {
          // Update local state
          setResponses(prev => prev.map(resp =>
            resp.id === currentResponse.id
              ? { ...resp, responses: updatedResponses }
              : resp
          ))
          if (!silent) toast.success('Changes saved successfully')
          return true
        }
      }
    } catch (err) {
      console.error('Error saving:', err)
      if (!silent) toast.error('Failed to save changes')
      return false
    } finally {
      setSaving(false)
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full md:max-w-6xl h-[100vh] md:h-[90vh] w-full p-0 md:p-6 gap-0 overflow-y-auto">
        <div className="p-4 md:p-0">
        <DialogHeader className="hidden md:block mb-6">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Scouting Sheets - {eventName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading scouting sheets...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchResponses} variant="outline">
              Try Again
            </Button>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scouting Sheets Found</h3>
            <p className="text-muted-foreground">
              {teamNumber
                ? `No scouting responses found for team #${teamNumber} at this event.`
                : 'No scouting responses have been submitted for this event yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation Header - Only show if there are multiple responses */}
            {responses.length > 1 ? (
              <div className="flex items-center justify-between border-b pb-3 mb-4 pr-8 md:pr-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious || saving}
                  className="hidden md:flex"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                {/* Mobile: Icon button only */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious || saving}
                  className="md:hidden"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-center flex-1">
                  <div className="text-sm font-medium">
                    Sheet {currentIndex + 1} of {responses.length}
                  </div>
                  {currentResponse && (
                    <div className="text-xs text-muted-foreground hidden md:block">
                      {formatDate(currentResponse.created_at)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="hidden md:flex"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>

                  {/* Mobile: Icon button only */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="md:hidden"
                  >
                    <Save className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasNext || saving}
                    className="hidden md:flex"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>

                  {/* Mobile: Icon button only */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasNext || saving}
                    className="md:hidden"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end border-b pb-3 mb-4 pr-8 md:pr-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="hidden md:flex"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>

                {/* Mobile: Icon button only */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="md:hidden"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Response Form View */}
            {currentResponse && (
              <div className="space-y-6">
                {/* Team Information */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Scouted Team Number</Label>
                    <div className="font-medium">#{currentResponse.scouting_team_number || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Scouted Team Name</Label>
                    <div className="font-medium">{currentResponse.metadata?.scouting_team_name || 'N/A'}</div>
                  </div>
                </div>

                {/* Questions and Responses */}
                {currentResponse.questions && currentResponse.questions.map((q, idx) => {
                if (q.mandatory) return null

                const type = q.type || 'text'
                const response = currentEditedResponses[q.id]

                return (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-base font-medium">
                      {idx + 1}. {q.text}
                    </Label>

                    {type === 'text' && (
                      <Input
                        value={response || ''}
                        onChange={(e) => setResponse(q.id, e.target.value)}
                        disabled={saving}
                      />
                    )}

                    {type === 'number' && (
                      <Input
                        type="number"
                        value={response ?? ''}
                        onChange={(e) => setResponse(q.id, e.target.value ? Number(e.target.value) : '')}
                        disabled={saving}
                      />
                    )}

                    {type === 'long-text' && (
                      <Textarea
                        value={response || ''}
                        onChange={(e) => setResponse(q.id, e.target.value)}
                        disabled={saving}
                        rows={4}
                      />
                    )}

                    {type === 'multiple-choice' && q.options && (
                      <div className="space-y-2">
                        {q.options.filter(o => o).map((opt, i) => (
                          <label key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`mc-${q.id}`}
                              checked={response === opt}
                              onChange={() => setResponse(q.id, opt)}
                              disabled={saving}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {type === 'checkbox' && q.options && (
                      <div className="space-y-2">
                        {q.options.filter(o => o).map((opt, i) => (
                          <label key={i} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Array.isArray(response) ? response.includes(opt) : false}
                              onChange={(e) => {
                                const prev = Array.isArray(response) ? response : []
                                if (e.target.checked) setResponse(q.id, [...prev, opt])
                                else setResponse(q.id, prev.filter((x: string) => x !== opt))
                              }}
                              disabled={saving}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {type === 'scale' && (
                      <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: (q.scaleMax || 10) - (q.scaleMin || 1) + 1 }, (_, i) => (q.scaleMin || 1) + i).map((n) => (
                          <label key={n} className={`inline-flex items-center p-2 rounded border cursor-pointer ${response === n ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                            <input
                              type="radio"
                              name={`scale-${q.id}`}
                              checked={response === n}
                              onChange={() => setResponse(q.id, n)}
                              disabled={saving}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">{n}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {type === 'image' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleImageUpload(q.id, file)
                                }
                              }}
                              disabled={uploadingImages[`${currentResponse.id}-${q.id}`] || saving}
                              className="hidden"
                              id={`image-input-${currentResponse.id}-${q.id}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById(`image-input-${currentResponse.id}-${q.id}`)?.click()}
                              disabled={uploadingImages[`${currentResponse.id}-${q.id}`] || saving}
                              className="w-full"
                            >
                              <span className="md:hidden">Take Photo / Upload</span>
                              <span className="hidden md:inline">Choose Image</span>
                            </Button>
                          </div>
                        </div>
                        {uploadingImages[`${currentResponse.id}-${q.id}`] && (
                          <div className="text-sm text-muted-foreground">Uploading...</div>
                        )}
                        {response && typeof response === 'string' && (
                          <div className="mt-2">
                            <Image
                              src={response}
                              alt="Uploaded preview"
                              width={400}
                              height={192}
                              className="max-w-full h-auto max-h-48 rounded border object-contain"
                              unoptimized
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setResponse(q.id, '')}
                              className="mt-1"
                              disabled={saving}
                            >
                              Remove image
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {type === 'field' && (
                      <FieldAnnotation
                        value={response as string}
                        onChange={(dataUrl) => setResponse(q.id, dataUrl)}
                        disabled={saving}
                      />
                    )}

                    {!response && type !== 'multiple-choice' && type !== 'checkbox' && type !== 'scale' && type !== 'field' && type !== 'image' && (
                      <div className="text-sm text-muted-foreground italic">
                        No response provided
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
