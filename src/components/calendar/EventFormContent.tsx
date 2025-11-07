"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  Clock,
  Loader2,
  Trash2,
  CalendarIcon,
  Share2,
  FileText
} from 'lucide-react'
import { EntityNotebookSidebar } from '@/components/notebook/EntityNotebookSidebar'
import { useAppData } from '@/components/AppDataProvider'

interface EventFormContentProps {
  eventId?: string
  mode: 'create' | 'edit'
  onSuccess?: () => void
}

interface EventData {
  id?: string
  title: string
  event_type: string
  start_date: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  description?: string | null
  needs_signup: boolean
  is_recurring?: boolean
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  recurrence_interval?: number
  recurrence_days_of_week?: number[] | null
  recurrence_end_date?: string | null
  recurrence_count?: number | null
}

export function EventFormContent({ eventId, mode, onSuccess }: EventFormContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { team, currentSeason } = useAppData()
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState('')
  const [startTime, setStartTime] = useState('16:00')
  const [endTime, setEndTime] = useState('18:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [needsSignup, setNeedsSignup] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  // Recurring event state
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([])
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined)
  const [recurrenceCount, setRecurrenceCount] = useState<number | undefined>(undefined)
  const [recurrenceEndType, setRecurrenceEndType] = useState<'date' | 'count'>('date')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isNotebookOpen, setIsNotebookOpen] = useState(false)

  // Load existing event data for edit mode or handle pre-selected date for create mode
  useEffect(() => {
    if (mode === 'edit' && eventId) {
      loadEventData()
    } else if (mode === 'create') {
      // Check for pre-selected date from URL parameters
      const dateParam = searchParams.get('date')
      if (dateParam) {
        const [year, month, day] = dateParam.split('-').map(Number)
        if (year && month && day) {
          setSelectedDate(new Date(year, month - 1, day))
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, mode, searchParams])

  const loadEventData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch event directly using Supabase client (RLS policies handle auth)
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Event not found')
        }
        throw new Error(fetchError.message || 'Failed to load event')
      }

      if (!event) {
        throw new Error('Event not found')
      }
      
      // Populate form fields with existing data
      setEventTitle(event.title)
      setEventType(event.event_type)
      setStartTime(event.start_time || '16:00')
      setEndTime(event.end_time || '18:00')
      setLocation(event.location || '')
      setDescription(event.description || '')
      setNeedsSignup(event.needs_signup || false)

      // Populate recurring event data
      setIsRecurring(event.is_recurring || false)
      if (event.recurrence_type) {
        setRecurrenceType(event.recurrence_type)
      }
      setRecurrenceInterval(event.recurrence_interval || 1)
      setSelectedDaysOfWeek(event.recurrence_days_of_week || [])

      if (event.recurrence_end_date) {
        const [year, month, day] = event.recurrence_end_date.split('-').map(Number)
        setRecurrenceEndDate(new Date(year, month - 1, day))
        setRecurrenceEndType('date')
      } else if (event.recurrence_count) {
        setRecurrenceCount(event.recurrence_count)
        setRecurrenceEndType('count')
      }

      // Parse and set the date
      if (event.start_date) {
        const [year, month, day] = event.start_date.split('-').map(Number)
        setSelectedDate(new Date(year, month - 1, day))
      }

    } catch (err) {
      console.error('Error loading event:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!eventTitle || !eventType || !selectedDate) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      if (!team?.id || !currentSeason?.id) {
        setError('Team or season information is missing')
        setIsSubmitting(false)
        return
      }

      const eventData: EventData = {
        title: eventTitle,
        event_type: eventType,
        start_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: startTime || null,
        end_time: endTime || null,
        location: location || null,
        description: description || null,
        needs_signup: needsSignup,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null,
        recurrence_interval: isRecurring ? recurrenceInterval : undefined,
        recurrence_days_of_week: (isRecurring && recurrenceType === 'weekly') ? selectedDaysOfWeek : null,
        recurrence_end_date: (isRecurring && recurrenceEndType === 'date' && recurrenceEndDate)
          ? format(recurrenceEndDate, 'yyyy-MM-dd') : null,
        recurrence_count: (isRecurring && recurrenceEndType === 'count') ? recurrenceCount : null
      }

      if (mode === 'edit' && eventId) {
        // Update existing event using Supabase client
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId)

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update event')
        }
      } else {
        // Create new event using Supabase client - include team_id and season_id
        const { error: insertError } = await supabase
          .from('events')
          .insert([{
            ...eventData,
            team_id: team.id,
            season_id: currentSeason.id
          }])

        if (insertError) {
          throw new Error(insertError.message || 'Failed to create event')
        }
      }

      // Show success message
      const successMessage = mode === 'edit' ? 'Event updated successfully!' : 'Event created successfully!'
      setSuccess(successMessage)

      if (mode === 'create') {
        // Clear form for create mode
        setEventTitle('')
        setEventType('')
        setStartTime('16:00')
        setEndTime('18:00')
        setLocation('')
        setDescription('')
        setNeedsSignup(false)
        setSelectedDate(new Date())
      }

      // Call onSuccess callback or navigate back to calendar after a brief delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/calendar')
        }
      }, 1500)
    } catch (err) {
      console.error(`Error ${mode}ing event:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${mode} event`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!eventId || mode !== 'edit') return

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      // Delete event using Supabase client (RLS policies handle auth)
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete event')
      }

      // Call onSuccess callback or navigate back to calendar
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/calendar')
      }
    } catch (err) {
      console.error('Error deleting event:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    if (!eventId || mode !== 'edit') return

    setIsSharing(true)

    try {
      // Create a unique shareable link
      const shareUrl = `${window.location.origin}/calendar?event=${eventId}`

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)

      // Show success feedback
      setSuccess('Event link copied to clipboard!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('Error sharing event:', err)
      setError('Failed to copy link to clipboard')
    } finally {
      setIsSharing(false)
    }
  }

  if (mode === 'edit' && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-primary text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-4 p-0">
                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Weekly Team Meeting"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type *</Label>
                  <Select value={eventType} onValueChange={setEventType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="fundraising">Fundraising</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="scrimmage">Scrimmage</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>Event Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <div className="relative">
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                      <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <div className="relative">
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                      <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Robotics Lab, Conference Room"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the purpose and agenda for this event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Needs Sign-ups Toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="needsSignup"
                    checked={needsSignup}
                    onCheckedChange={setNeedsSignup}
                  />
                  <Label htmlFor="needsSignup" className="text-sm font-medium">
                    Needs sign-ups
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">
                    Team members can RSVP to this event
                  </span>
                </div>

                {/* Recurring Event Toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="isRecurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                  <Label htmlFor="isRecurring" className="text-sm font-medium">
                    Recurring event
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">
                    Event repeats on a schedule
                  </span>
                </div>

                {/* Recurring Options */}
                {isRecurring && (
                  <div className="space-y-4 pt-4 pl-4 border-l-2 border-gray-200">
                    <h4 className="font-medium text-sm">Recurrence Settings</h4>

                    {/* Recurrence Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Repeat</Label>
                        <Select value={recurrenceType} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') => setRecurrenceType(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Every</Label>
                        <Input
                          type="number"
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          min={1}
                          max={99}
                        />
                      </div>
                    </div>

                    {/* Days of Week Selection for Weekly */}
                    {recurrenceType === 'weekly' && (
                      <div className="space-y-2">
                        <Label>Days of Week</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${index}`}
                                checked={selectedDaysOfWeek.includes(index)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDaysOfWeek([...selectedDaysOfWeek, index])
                                  } else {
                                    setSelectedDaysOfWeek(selectedDaysOfWeek.filter(d => d !== index))
                                  }
                                }}
                              />
                              <Label htmlFor={`day-${index}`} className="text-sm">{day}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* End Condition */}
                    <div className="space-y-3">
                      <Label>End Recurrence</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="end-date"
                            checked={recurrenceEndType === 'date'}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRecurrenceEndType('date')
                                setRecurrenceCount(undefined)
                              }
                            }}
                          />
                          <Label htmlFor="end-date" className="text-sm">On date</Label>
                        </div>
                        {recurrenceEndType === 'date' && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !recurrenceEndDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "Pick end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={recurrenceEndDate}
                                onSelect={setRecurrenceEndDate}
                                disabled={(date) => selectedDate ? date <= selectedDate : date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="end-count"
                            checked={recurrenceEndType === 'count'}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRecurrenceEndType('count')
                                setRecurrenceEndDate(undefined)
                              }
                            }}
                          />
                          <Label htmlFor="end-count" className="text-sm">After occurrences</Label>
                        </div>
                        {recurrenceEndType === 'count' && (
                          <Input
                            type="number"
                            value={recurrenceCount || ''}
                            onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || undefined)}
                            min={1}
                            max={365}
                            placeholder="Number of occurrences"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>

        {/* Footer - Mobile responsive with stacked layout */}
        <div className="mt-8 pt-6 border-t">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-3 sm:hidden">
            <Button
              type="submit"
              className="w-full btn-accent"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                mode === 'edit' ? 'Update Event' : 'Create Event'
              )}
            </Button>

            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                {onSuccess ? (
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || isDeleting || isSharing}
                    className="flex-1"
                    onClick={onSuccess}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Link href="/calendar" className="flex-1">
                    <Button variant="outline" type="button" disabled={isSubmitting || isDeleting || isSharing} className="w-full">
                      Cancel
                    </Button>
                  </Link>
                )}

                {mode === 'edit' && (
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting || isSubmitting || isSharing}
                    className="flex-1"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                )}
              </div>

              {mode === 'edit' && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleShare}
                  disabled={isSharing || isSubmitting || isDeleting}
                  className="w-full"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Event
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              {mode === 'edit' && (
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting || isSharing}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Event
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {mode === 'edit' && (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleShare}
                    disabled={isSharing || isSubmitting || isDeleting}
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsNotebookOpen(true)}
                    disabled={isSubmitting || isDeleting || isSharing}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Edit Notes
                  </Button>
                </>
              )}
              {onSuccess ? (
                <Button
                  variant="outline"
                  type="button"
                  disabled={isSubmitting || isDeleting || isSharing}
                  onClick={onSuccess}
                >
                  Cancel
                </Button>
              ) : (
                <Link href="/calendar">
                  <Button variant="outline" type="button" disabled={isSubmitting || isDeleting || isSharing}>
                    Cancel
                  </Button>
                </Link>
              )}
              <Button
                type="submit"
                className="btn-accent"
                disabled={isSubmitting || isDeleting || isSharing}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'edit' ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  mode === 'edit' ? 'Update Event' : 'Create Event'
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Entity Notebook Sidebar - only render if we have an eventId */}
      {mode === 'edit' && eventId && (
        <EntityNotebookSidebar
          isOpen={isNotebookOpen}
          onClose={() => setIsNotebookOpen(false)}
          entityType="event"
          entityId={eventId}
          entityTitle={eventTitle}
        />
      )}
    </div>
  )
}