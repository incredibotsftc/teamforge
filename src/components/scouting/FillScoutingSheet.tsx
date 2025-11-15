'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { FieldAnnotation } from './FieldAnnotation'

interface Question {
  id: string
  text: string
  type?: 'text' | 'number' | 'multiple-choice' | 'checkbox' | 'scale' | 'long-text' | 'image' | 'field'
  options?: string[]
  scaleMin?: number
  scaleMax?: number
  mandatory?: boolean
}

interface FillScoutingSheetProps {
  isOpen: boolean
  onClose: () => void
  teamNumber: number
  teamName: string
  season: number
}

export function FillScoutingSheet({
  isOpen,
  onClose,
  teamNumber,
  teamName,
  season,
}: FillScoutingSheetProps) {
  const { team, currentSeason } = useAppData()
  const { user } = useAuth()

  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Record<string, string | number | string[]>>({})
  const [eventCode, setEventCode] = useState<string>('')
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventSearchQuery, setEventSearchQuery] = useState<string>('')
  const [eventSearchResults, setEventSearchResults] = useState<Array<{ code: string; name: string; dateStart: string; eventId?: string }>>([])
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const [isUserTyping, setIsUserTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})

  // Load scouting template and existing responses
  useEffect(() => {
    const loadTemplateAndResponses = async () => {
      if (!team?.id || !currentSeason?.id) return

      try {
        // Load template
        const { data: template, error: templateError } = await supabase
          .from('scouting_templates')
          .select('content')
          .eq('team_id', team.id)
          .eq('season_id', currentSeason.id)
          .maybeSingle()

        if (!templateError && template?.content?.questions) {
          setQuestions(template.content.questions)
        }

        // Note: We'll load existing responses after the closest event is determined
        // This happens in a separate useEffect that runs after event is set
      } catch (err) {
        console.error('Failed to load template or responses:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      loadTemplateAndResponses()
    }
  }, [isOpen, team?.id, currentSeason?.id, teamNumber])

  // Fetch closest upcoming event
  useEffect(() => {
    const fetchClosestEvent = async () => {
      if (!team?.team_number) return

      try {
        const response = await fetch(`/api/scouting/team-events?teamNumber=${team.team_number}&season=${season}`)
        if (!response.ok) return

        const data = await response.json()
        if (data.success && data.events && data.events.length > 0) {
          const now = new Date()
          const upcomingEvents = data.events.filter((event: { dateEnd: string }) =>
            new Date(event.dateEnd) >= now
          ).sort((a: { dateStart: string }, b: { dateStart: string }) =>
            new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
          )

          if (upcomingEvents.length > 0) {
            setEventCode(upcomingEvents[0].code)
            setEventSearchQuery(upcomingEvents[0].name)
            // Use event code, not event ID (GUID)
            setEventId(upcomingEvents[0].code)
          }
        }
      } catch (err) {
        console.error('Failed to fetch events:', err)
      }
    }

    if (isOpen) {
      fetchClosestEvent()
    }
  }, [isOpen, team?.team_number, season])

  // Load existing response when eventId is set
  useEffect(() => {
    const loadExistingResponse = async () => {
      if (!team?.id || !currentSeason?.id || !eventId) return

      try {
        const { data: existingResponse, error } = await supabase
          .from('scouting_responses')
          .select('*')
          .eq('team_id', team.id)
          .eq('season_id', currentSeason.id)
          .eq('scouting_team_number', teamNumber)
          .eq('scouting_event_id', eventId)
          .maybeSingle()

        if (!error && existingResponse) {
          // Found existing response for this event - pre-fill
          setExistingResponseId(existingResponse.id)
          if (existingResponse.responses) {
            setResponses(existingResponse.responses)
          }
        } else {
          // No existing response for this event
          setExistingResponseId(null)
          // Don't clear responses here - let user start fresh or keep typing
        }
      } catch (err) {
        console.error('Failed to load existing response:', err)
      }
    }

    loadExistingResponse()
  }, [eventId, team?.id, currentSeason?.id, teamNumber])

  // Event search with debounce
  useEffect(() => {
    if (!eventSearchQuery || eventSearchQuery.length < 2) {
      setEventSearchResults([])
      setShowEventDropdown(false)
      return
    }

    // Only search if user is actively typing
    if (!isUserTyping) {
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/scouting/search-event?query=${encodeURIComponent(eventSearchQuery)}&season=${season}`)
        if (!response.ok) return

        const data = await response.json()
        if (data.success && data.events) {
          setEventSearchResults(data.events)
          setShowEventDropdown(data.events.length > 0)
        }
      } catch (err) {
        console.error('Event search failed:', err)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [eventSearchQuery, season, isUserTyping])

  const setResponse = (questionId: string, value: string | number | string[]) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  const handleImageUpload = async (questionId: string, file: File) => {
    if (!team?.id || !currentSeason?.id) {
      setSaveMessage('Team or season not found')
      setTimeout(() => setSaveMessage(null), 2000)
      return
    }

    setUploadingImages(prev => ({ ...prev, [questionId]: true }))

    try {
      // Create a unique filename: team_id/season_id/scouting-responses/team_number/question_id/timestamp_filename
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${team.id}/${currentSeason.id}/scouting-responses/${teamNumber}/${questionId}/${timestamp}.${fileExt}`

      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('scouting-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        setSaveMessage('Failed to upload image')
        setTimeout(() => setSaveMessage(null), 2000)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('scouting-images')
        .getPublicUrl(fileName)

      // Store the public URL in responses
      setResponse(questionId, urlData.publicUrl)
      setSaveMessage('✓ Image uploaded')
      setTimeout(() => setSaveMessage(null), 1500)
    } catch (err) {
      console.error('Failed to upload image:', err)
      setSaveMessage('Failed to upload image')
      setTimeout(() => setSaveMessage(null), 2000)
    } finally {
      setUploadingImages(prev => ({ ...prev, [questionId]: false }))
    }
  }

  const handleSelectEvent = async (event: { code: string; name: string; eventId?: string }) => {
    setEventCode(event.code)
    setEventSearchQuery(event.name)
    // Use event code, not event ID (GUID)
    setEventId(event.code)
    setShowEventDropdown(false)
    setIsUserTyping(false) // Reset typing flag when event is selected

    // When event changes, check if there's an existing response for this event
    if (team?.id && currentSeason?.id && event.code) {
      try {
        const { data: existingResponse, error } = await supabase
          .from('scouting_responses')
          .select('*')
          .eq('team_id', team.id)
          .eq('season_id', currentSeason.id)
          .eq('scouting_team_number', teamNumber)
          .eq('scouting_event_id', event.code)
          .maybeSingle()

        if (!error && existingResponse) {
          // Found existing response for this event - pre-fill and set ID for update
          setExistingResponseId(existingResponse.id)
          if (existingResponse.responses) {
            setResponses(existingResponse.responses)
          }
        } else {
          // No existing response for this event - clear for new insert
          setExistingResponseId(null)
          setResponses({})
        }
      } catch (err) {
        console.error('Failed to check for existing response:', err)
      }
    } else {
      // No event ID - clear for new insert
      setExistingResponseId(null)
    }
  }

  const handleSave = async (closeAfterSave = false) => {
    if (!user?.id) {
      setSaveMessage('Sign in to save responses')
      setTimeout(() => setSaveMessage(null), 2000)
      return false
    }

    if (!eventCode.trim()) {
      setSaveMessage('Event code is required')
      setTimeout(() => setSaveMessage(null), 2000)
      return false
    }

    setSaving(true)
    try {
      const payload = {
        team_id: team?.id || null,
        season_id: currentSeason?.id || null,
        scouting_team_number: teamNumber,
        scouting_event_id: eventId,
        questions: questions,
        responses: responses,
        metadata: {
          event_code: eventCode.trim(),
          event_name: eventSearchQuery,
          scouting_team_name: teamName
        },
        updated_by: user.id
      }

      let res
      if (existingResponseId) {
        // Update existing response
        res = await supabase
          .from('scouting_responses')
          .update(payload)
          .eq('id', existingResponseId)
          .select('*')
      } else {
        // Create new response
        res = await supabase
          .from('scouting_responses')
          .insert([{
            ...payload,
            template_id: null,
            created_by: user.id
          }])
          .select('*')
      }

      if (res.error) {
        console.error('Failed to save responses:', res.error)
        setSaveMessage('Failed to save: ' + (res.error.message || 'unknown'))
        return false
      } else {
        // Store the response ID if this was a new insert
        if (!existingResponseId && res.data && res.data.length > 0) {
          setExistingResponseId(res.data[0].id)
        }
        setSaveMessage('✓ Saved successfully')

        if (closeAfterSave) {
          setTimeout(() => {
            onClose()
            setSaveMessage(null)
          }, 500)
        }
        return true
      }
    } catch (err) {
      console.error('Failed to save responses:', err)
      setSaveMessage('Failed to save')
      return false
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 2500)
    }
  }

  const handleClose = async () => {
    // Check if there are any responses filled
    const hasResponses = Object.keys(responses).length > 0

    if (hasResponses) {
      // Auto-save before closing
      await handleSave(true)
    } else {
      // No responses, just close
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-background border-l shadow-lg z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Fill Scouting Sheet</h2>
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading template...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Number (read-only) */}
              <div className="space-y-2">
                <Label>Team Number</Label>
                <Input value={teamNumber} disabled className="bg-muted" />
              </div>

              {/* Team Name (read-only) */}
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={teamName} disabled className="bg-muted" />
              </div>

              {/* Event Name (searchable) */}
              <div className="space-y-2 relative">
                <Label>Event Name</Label>
                <Input
                  value={eventSearchQuery}
                  onChange={(e) => {
                    setEventSearchQuery(e.target.value)
                    setIsUserTyping(true)
                  }}
                  onFocus={() => {
                    if (eventSearchResults.length > 0 && isUserTyping) {
                      setShowEventDropdown(true)
                    }
                  }}
                  placeholder="Search for an event..."
                />
                {showEventDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
                    {eventSearchResults.map((event) => (
                      <button
                        key={event.code}
                        onClick={() => handleSelectEvent(event)}
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <div className="font-medium">{event.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.code} • {new Date(event.dateStart).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Questions */}
              {questions.map((q, idx) => {
                // Skip mandatory fields as they're handled above
                if (q.mandatory) return null

                const type = q.type || 'text'
                return (
                  <div key={q.id} className="space-y-2">
                    <Label>
                      {idx + 1}. {q.text}
                    </Label>

                    {type === 'text' && (
                      <Input
                        value={responses[q.id] || ''}
                        onChange={(e) => setResponse(q.id, e.target.value)}
                      />
                    )}

                    {type === 'number' && (
                      <Input
                        type="number"
                        value={responses[q.id] ?? ''}
                        onChange={(e) => setResponse(q.id, e.target.value ? Number(e.target.value) : '')}
                      />
                    )}

                    {type === 'long-text' && (
                      <Textarea
                        value={responses[q.id] || ''}
                        onChange={(e) => setResponse(q.id, e.target.value)}
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
                              checked={responses[q.id] === opt}
                              onChange={() => setResponse(q.id, opt)}
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
                              checked={Array.isArray(responses[q.id]) ? (responses[q.id] as string[]).includes(opt) : false}
                              onChange={(e) => {
                                const prev = Array.isArray(responses[q.id]) ? (responses[q.id] as string[]) : []
                                if (e.target.checked) setResponse(q.id, [...prev, opt])
                                else setResponse(q.id, prev.filter((x: string) => x !== opt))
                              }}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {type === 'scale' && (
                      <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: (q.scaleMax || 10) - (q.scaleMin || 1) + 1 }, (_, i) => (q.scaleMin || 1) + i).map((n) => (
                          <label key={n} className={`inline-flex items-center p-2 rounded border cursor-pointer ${responses[q.id] === n ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                            <input
                              type="radio"
                              name={`scale-${q.id}`}
                              checked={responses[q.id] === n}
                              onChange={() => setResponse(q.id, n)}
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
                              disabled={uploadingImages[q.id]}
                              className="hidden"
                              id={`image-input-${q.id}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById(`image-input-${q.id}`)?.click()}
                              disabled={uploadingImages[q.id]}
                              className="w-full"
                            >
                              <span className="md:hidden">Take Photo / Upload</span>
                              <span className="hidden md:inline">Choose Image</span>
                            </Button>
                          </div>
                        </div>
                        {uploadingImages[q.id] && (
                          <div className="text-sm text-muted-foreground">Uploading...</div>
                        )}
                        {responses[q.id] && typeof responses[q.id] === 'string' && (
                          <div className="mt-2">
                            <Image
                              src={responses[q.id] as string}
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
                            >
                              Remove image
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {type === 'field' && (
                      <FieldAnnotation
                        value={responses[q.id] as string}
                        onChange={(dataUrl) => setResponse(q.id, dataUrl)}
                        disabled={saving}
                      />
                    )}
                  </div>
                )
              })}

              {/* Save Button */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {saveMessage && (
                    <span className={`text-sm font-medium ${saveMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={saving}>
                    {saving ? 'Saving...' : 'Close'}
                  </Button>
                  <Button onClick={() => handleSave(false)} disabled={saving} className="btn-accent">
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
