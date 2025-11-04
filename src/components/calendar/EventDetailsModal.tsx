"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Edit3,
  Users,
  Loader2,
  UserCheck,
  UserMinus,
  Trash2,
  Share2
} from 'lucide-react'

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
  needs_signup: boolean;
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  recurrence_interval?: number;
  recurrence_days_of_week?: number[] | null;
  recurrence_end_date?: string | null;
  recurrence_count?: number | null;
  parent_event_id?: string | null;
}

interface EventAttendee {
  id: string;
  team_member_id: string;
  status: 'pending' | 'attending' | 'not_attending' | 'maybe';
  first_name: string;
  last_name: string;
  response_date: string;
}

interface EventDetailsModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
}

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isNavigating, setIsNavigating] = React.useState(false)
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [currentUserMemberId, setCurrentUserMemberId] = useState<string | null>(null)
  const [userSignupStatus, setUserSignupStatus] = useState<EventAttendee | null>(null)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handleEdit = () => {
    if (!event) return
    setIsNavigating(true)
    router.push(`/calendar/${event.id}/edit`)
    // Don't close the modal immediately - let the navigation complete
  }

  const handleDelete = async () => {
    if (!event) return

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      // Delete event using Supabase client (RLS policies handle auth)
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete event')
      }

      // Close modal and refresh the page to show updated calendar
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Error deleting event:', err)
      alert('Failed to delete event. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    if (!event) return

    setIsSharing(true)

    try {
      // Create a unique shareable link
      const shareUrl = `${window.location.origin}/calendar?event=${event.id}`

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)

      // Show success feedback (you could add a toast notification here)
      alert('Event link copied to clipboard!')
    } catch (err) {
      console.error('Error sharing event:', err)
      alert('Failed to copy link to clipboard')
    } finally {
      setIsSharing(false)
    }
  }

  // Fetch current user's team member ID
  useEffect(() => {
    const fetchCurrentUserMemberId = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (error) {
          console.error('Error fetching user member ID:', error)
          return
        }

        setCurrentUserMemberId(data?.id || null)
      } catch (error) {
        console.error('Error fetching user member ID:', error)
      }
    }

    fetchCurrentUserMemberId()
  }, [user])

  // Fetch attendees when modal opens and event needs signup
  useEffect(() => {
    const fetchAttendees = async () => {
      if (!event?.needs_signup || !isOpen) return

      setIsLoadingAttendees(true)
      try {
        const { data, error } = await supabase
          .from('event_attendees')
          .select(`
            id,
            team_member_id,
            status,
            response_date,
            team_members!inner (
              first_name,
              last_name
            )
          `)
          .eq('event_id', event.id)
          .eq('status', 'attending')
          .order('response_date', { ascending: true })

        if (error) {
          console.error('Error fetching attendees:', error)
          return
        }

        const formattedAttendees: EventAttendee[] = data?.map(attendee => {
          const teamMember = attendee.team_members as unknown as { first_name: string; last_name: string }
          return {
            id: attendee.id,
            team_member_id: attendee.team_member_id,
            status: attendee.status,
            first_name: teamMember.first_name,
            last_name: teamMember.last_name,
            response_date: attendee.response_date
          }
        }) || []

        setAttendees(formattedAttendees)

        // Check if current user has signed up
        if (currentUserMemberId) {
          const userAttendance = formattedAttendees.find(a => a.team_member_id === currentUserMemberId)
          setUserSignupStatus(userAttendance || null)
        }

      } catch (error) {
        console.error('Error fetching attendees:', error)
      } finally {
        setIsLoadingAttendees(false)
      }
    }

    fetchAttendees()
  }, [event?.id, event?.needs_signup, isOpen, currentUserMemberId])

  const handleSignUp = async () => {
    if (!currentUserMemberId || !event) {
      console.error('Missing required data:', { currentUserMemberId, event: !!event })
      return
    }


    setIsSigningUp(true)
    try {
      // First check if user is already signed up
      const { data: existing } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', event.id)
        .eq('team_member_id', currentUserMemberId)
        .single()

      if (existing) {
        return
      }

      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: event.id,
          team_member_id: currentUserMemberId,
          status: 'attending'
        })

      if (error) {
        console.error('Error signing up:', error)
        return
      }

      // Refresh attendees
      const { data } = await supabase
        .from('event_attendees')
        .select(`
          id,
          team_member_id,
          status,
          response_date,
          team_members!inner (
            first_name,
            last_name
          )
        `)
        .eq('event_id', event.id)
        .eq('team_member_id', currentUserMemberId)
        .single()

      if (data) {
        const teamMember = data.team_members as unknown as { first_name: string; last_name: string }
        const newAttendee: EventAttendee = {
          id: data.id,
          team_member_id: data.team_member_id,
          status: data.status,
          first_name: teamMember.first_name,
          last_name: teamMember.last_name,
          response_date: data.response_date
        }

        setAttendees(prev => [...prev, newAttendee])
        setUserSignupStatus(newAttendee)
      }

    } catch (error) {
      console.error('Error signing up:', error)
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleRemoveSignup = async () => {
    if (!userSignupStatus) return

    setIsSigningUp(true)
    try {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('id', userSignupStatus.id)

      if (error) {
        console.error('Error removing signup:', error)
        return
      }

      // Update state
      setAttendees(prev => prev.filter(a => a.id !== userSignupStatus.id))
      setUserSignupStatus(null)

    } catch (error) {
      console.error('Error removing signup:', error)
    } finally {
      setIsSigningUp(false)
    }
  }

  const formatEventType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatTime = (time: string | null) => {
    if (!time) return null
    const [hours, minutes] = time.split(':')
    const hour24 = parseInt(hours)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-purple-100 text-purple-800'
      case 'workshop': return 'bg-green-100 text-green-800'
      case 'competition': return 'bg-red-100 text-red-800'
      case 'practice': return 'bg-orange-100 text-orange-800'
      case 'outreach': return 'bg-teal-100 text-teal-800'
      case 'fundraising': return 'bg-pink-100 text-pink-800'
      case 'training': return 'bg-indigo-100 text-indigo-800'
      case 'scrimmage': return 'bg-yellow-100 text-yellow-800'
      case 'other': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pr-8">
            <DialogTitle className="text-lg sm:text-xl font-semibold leading-tight text-left">
              {event.title}
            </DialogTitle>
            <Badge className={`${getEventTypeColor(event.event_type)} w-fit`} variant="secondary">
              {formatEventType(event.event_type)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date and Time */}
          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">{(() => {
                // Parse date string as local date to avoid timezone issues
                const [year, month, day] = event.start_date.split('-').map(Number)
                const localDate = new Date(year, month - 1, day)
                return format(localDate, 'MMMM d, yyyy')
              })()}</p>
              {event.start_time && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatTime(event.start_time)}
                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center space-x-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p>{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start space-x-3">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm leading-relaxed">{event.description}</p>
              </div>
            </div>
          )}

          {/* Event Signups */}
          {event.needs_signup && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium">Event Signups</h3>
              </div>

              {isLoadingAttendees ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground ml-7">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading attendees...</span>
                </div>
              ) : (
                <>
                  {attendees.length > 0 ? (
                    <div className="ml-7 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {attendees.length} {attendees.length === 1 ? 'person' : 'people'} signed up:
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {attendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center space-x-2 text-sm">
                            <UserCheck className="h-3 w-3 text-green-600" />
                            <span>{attendee.first_name} {attendee.last_name}</span>
                            {attendee.team_member_id === currentUserMemberId && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-7">No signups yet</p>
                  )}

                  {/* Signup/Remove button for current user */}
                  {currentUserMemberId && (
                    <div className="ml-7 pt-2">
                      {userSignupStatus ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveSignup}
                          disabled={isSigningUp}
                        >
                          {isSigningUp ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <UserMinus className="h-3 w-3 mr-2" />
                          )}
                          Remove Signup
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleSignUp}
                          disabled={isSigningUp}
                        >
                          {isSigningUp ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <UserCheck className="h-3 w-3 mr-2" />
                          )}
                          Sign Up for this Event
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Show separator only if we have additional details */}
          {(event.location || event.description || event.needs_signup) && (
            <Separator />
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4">
          {/* Mobile Layout */}
          <div className="flex flex-col sm:hidden gap-2 w-full">
            <div className="flex gap-2">
              <Button
                onClick={handleShare}
                disabled={isNavigating || isDeleting || isSharing}
                className="flex-1 bg-black text-white hover:bg-gray-800"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                {isSharing ? 'Sharing...' : 'Share'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isNavigating || isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
            <Button
              onClick={handleEdit}
              disabled={isNavigating || isDeleting}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              {isNavigating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Edit3 className="h-4 w-4 mr-2" />
              )}
              {isNavigating ? 'Opening...' : 'Edit Event'}
            </Button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between w-full">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isNavigating || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleShare}
                disabled={isNavigating || isDeleting || isSharing}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                {isSharing ? 'Sharing...' : 'Share'}
              </Button>
              <Button
                onClick={handleEdit}
                disabled={isNavigating || isDeleting}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isNavigating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4 mr-2" />
                )}
                {isNavigating ? 'Opening...' : 'Edit Event'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}