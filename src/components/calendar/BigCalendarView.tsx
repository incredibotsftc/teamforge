"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, momentLocalizer, Event as BigCalendarEvent, View, ToolbarProps, NavigateAction } from 'react-big-calendar'
import moment from 'moment'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/components/AppDataProvider'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar.css'

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment)

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

interface BigCalendarEventType extends BigCalendarEvent {
  id: string;
  eventType: string;
  location?: string | null;
  description?: string | null;
  needs_signup: boolean;
}

export interface BigCalendarViewHandle {
  refreshEvents: () => Promise<void>
}

interface BigCalendarViewProps {
  onEventClick?: (eventId: string) => void
}

export const BigCalendarView = forwardRef<BigCalendarViewHandle, BigCalendarViewProps>(({ onEventClick }, ref) => {
  const router = useRouter()
  const { team, currentSeason } = useAppData()
  const calendarRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  const fetchEvents = useCallback(async () => {
    // Wait for team and season to be loaded
    if (!team?.id || !currentSeason?.id) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch events directly using Supabase client (RLS policies handle auth)
      const { data: fetchedEvents, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', team.id)
        .eq('season_id', currentSeason.id)
        .order('start_date', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch events')
      }

      setEvents(fetchedEvents || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }, [team?.id, currentSeason?.id])

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshEvents: fetchEvents
  }))

  // Function to scroll to 8 AM in week/day view
  const scrollTo8AM = useCallback(() => {
    if (!calendarRef.current || (view !== 'week' && view !== 'day')) {
      return
    }

    // Use setTimeout to ensure DOM is fully rendered after view change
    setTimeout(() => {
      const calendar = calendarRef.current
      if (!calendar) return

      // Find the calendar's scrollable time content container
      const scrollContainer = calendar.querySelector('.rbc-time-content') ||
                              calendar.querySelector('.rbc-time-view') ||
                              calendar.querySelector('.rbc-calendar')

      if (!scrollContainer) return

      // Method 1: Find 8 AM time slot and calculate its position relative to the container
      const timeSlots = calendar.querySelectorAll('.rbc-time-slot')
      if (timeSlots.length > 0) {
        const eightAMSlot = Array.from(timeSlots).find((slot) => {
          const timeText = slot.textContent || ''
          return timeText.includes('8') && timeText.includes('AM')
        })

        if (eightAMSlot) {
          // Calculate the position of 8 AM slot relative to the scrollable container
          const slotRect = eightAMSlot.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()
          const relativeTop = slotRect.top - containerRect.top + scrollContainer.scrollTop

          scrollContainer.scrollTo({
            top: relativeTop,
            behavior: 'smooth'
          })
          return
        }
      }

      // Method 2: Look for time gutter labels
      const timeLabels = calendar.querySelectorAll('.rbc-time-gutter .rbc-label')
      if (timeLabels.length > 0) {
        const eightAMLabel = Array.from(timeLabels).find((label) => {
          const timeText = label.textContent || ''
          return timeText.includes('8') && timeText.includes('AM')
        })

        if (eightAMLabel) {
          // Calculate the position relative to the scrollable container
          const labelRect = eightAMLabel.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()
          const relativeTop = labelRect.top - containerRect.top + scrollContainer.scrollTop

          scrollContainer.scrollTo({
            top: relativeTop,
            behavior: 'smooth'
          })
          return
        }
      }

      // Method 3: Mathematical scroll position within the container
      const scrollHeight = scrollContainer.scrollHeight
      const containerHeight = scrollContainer.clientHeight
      const targetScroll = Math.max(0, Math.min(
        scrollHeight - containerHeight,
        scrollHeight * (8 / 24) // 8 AM out of 24 hours
      ))

      scrollContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      })
    }, 200)
  }, [view])

  // Handle view changes and auto-scroll for week/day views
  const handleViewChange = (newView: View) => {
    setView(newView)
    // Scroll to 8 AM for time-based views
    if (newView === 'week' || newView === 'day') {
      scrollTo8AM()
    }
  }

  useEffect(() => {
    fetchEvents()

    // Only set up realtime subscription if team and season are loaded
    if (!team?.id || !currentSeason?.id) {
      return
    }

    // Set up realtime subscription for events
    const channel = supabase
      .channel('calendar-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEvents, team?.id, currentSeason?.id])

  // Handle shared event links
  useEffect(() => {
    const handleSharedLink = async () => {
      // Check for event ID in URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const eventId = urlParams.get('event')

      if (eventId && events.length > 0 && onEventClick) {
        // Find the event in our events array
        const sharedEvent = events.find(event => event.id === eventId)

        if (sharedEvent) {
          // Open the event in the sheet
          onEventClick(sharedEvent.id)

          // Remove the event parameter from the URL to clean up
          const url = new URL(window.location.href)
          url.searchParams.delete('event')
          router.replace(url.pathname + url.search, { scroll: false })
        }
      }
    }

    handleSharedLink()
  }, [events, router, onEventClick])

  // Switch away from month view on mobile and handle initial autoscroll
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768
      if (isMobile && view === 'month') {
        setView('week')
        isFirstRender.current = false
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [view])

  // Auto-scroll when view changes OR when loading completes for initial mobile load
  useEffect(() => {
    if (!loading && (view === 'week' || view === 'day')) {
      // Use a longer delay for initial mobile load, shorter for view changes
      const delay = isFirstRender.current ? 800 : 200
      setTimeout(() => {
        scrollTo8AM()
      }, delay)

      if (isFirstRender.current) {
        isFirstRender.current = false
      }
    }
  }, [view, loading, scrollTo8AM])

  // Convert our events to react-big-calendar format
  const calendarEvents: BigCalendarEventType[] = useMemo(() => {
    if (!events || events.length === 0) {
      return []
    }
    
    return events.map(event => {
      // Parse the date string as local date to avoid timezone issues
      const [year, month, day] = event.start_date.split('-').map(Number)
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      
      // Set times if provided
      if (event.start_time) {
        const [startHours, startMinutes] = event.start_time.split(':').map(Number)
        startDate.setHours(startHours, startMinutes, 0, 0)
        
        if (event.end_time) {
          const [endHours, endMinutes] = event.end_time.split(':').map(Number)
          endDate.setHours(endHours, endMinutes, 0, 0)
        } else {
          endDate.setHours(startHours + 1, startMinutes, 0, 0)
        }
      } else {
        // All-day event
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
      }

      return {
        id: event.id,
        title: event.title,
        start: startDate,
        end: endDate,
        eventType: event.event_type,
        location: event.location,
        description: event.description,
        needs_signup: event.needs_signup,
        resource: event,
        allDay: !event.start_time
      }
    })
  }, [events])

  // Event style getter for color coding
  const eventStyleGetter = (event: BigCalendarEventType) => {
    let backgroundColor = '#3174ad' // default blue
    
    switch (event.eventType) {
      case 'meeting': backgroundColor = '#3b82f6'; break      // blue
      case 'review': backgroundColor = '#8b5cf6'; break       // purple
      case 'workshop': backgroundColor = '#10b981'; break     // green
      case 'competition': backgroundColor = '#ef4444'; break  // red
      case 'practice': backgroundColor = '#f59e0b'; break     // orange
      case 'outreach': backgroundColor = '#14b8a6'; break     // teal
      case 'fundraising': backgroundColor = '#ec4899'; break  // pink
      case 'training': backgroundColor = '#6366f1'; break     // indigo
      case 'scrimmage': backgroundColor = '#eab308'; break    // yellow
      case 'other': backgroundColor = '#6b7280'; break        // gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '13px',
        fontWeight: '500'
      }
    }
  }

  // Custom event component for better display
  const EventComponent = ({ event }: { event: BigCalendarEventType }) => {
    const formatTime = (date: Date) => {
      return moment(date).format('h:mm A')
    }

    const isAllDay = event.start && event.end &&
                     event.start.getHours() === 0 && event.start.getMinutes() === 0 &&
                     event.end.getHours() === 23 && event.end.getMinutes() === 59

    return (
      <div className="p-1">
        <div className="font-medium text-white truncate">{event.title}</div>
        {!isAllDay && event.start && event.end && (
          <div className="text-xs text-white/90">
            {formatTime(event.start)} - {formatTime(event.end)}
          </div>
        )}
        {event.location && view !== 'month' && (
          <div className="text-xs text-white/80 truncate">📍 {event.location}</div>
        )}
      </div>
    )
  }

  // Custom toolbar for better styling
  const CustomToolbar = ({ label, onNavigate }: ToolbarProps<BigCalendarEventType, object>) => {
    return (
      <div className="mb-4 p-3 sm:p-4 bg-card rounded-lg border">
        {/* Mobile Layout */}
        <div className="flex flex-col space-y-3 sm:hidden">
          {/* Title with Navigation */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={() => onNavigate('PREV' as NavigateAction)}
              variant="outline"
              size="sm"
            >
              ←
            </Button>
            <h2 className="text-lg font-semibold">{label}</h2>
            <Button
              onClick={() => onNavigate('NEXT' as NavigateAction)}
              variant="outline"
              size="sm"
            >
              →
            </Button>
          </div>

          {/* View Buttons - Mobile (no month view) */}
          <div className="grid grid-cols-3 gap-2">
            {['week', 'day', 'agenda'].map((viewName) => (
              <Button
                key={viewName}
                onClick={() => handleViewChange(viewName as View)}
                variant={view === viewName ? 'default' : 'outline'}
                size="sm"
                className="capitalize"
              >
                {viewName}
              </Button>
            ))}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-center relative">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onNavigate('PREV' as NavigateAction)}
              variant="outline"
              size="sm"
            >
              ←
            </Button>
            <h2 className="text-xl font-semibold">{label}</h2>
            <Button
              onClick={() => onNavigate('NEXT' as NavigateAction)}
              variant="outline"
              size="sm"
            >
              →
            </Button>
          </div>

          <div className="flex items-center space-x-1 absolute right-0">
            {['month', 'week', 'day', 'agenda'].map((viewName) => (
              <Button
                key={viewName}
                onClick={() => handleViewChange(viewName as View)}
                variant={view === viewName ? 'default' : 'outline'}
                size="sm"
                className="capitalize"
              >
                {viewName}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-destructive mb-4">{error}</div>
          <Button onClick={fetchEvents}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }


  return (
    <div ref={calendarRef} className={view === 'agenda' ? 'w-full h-auto min-h-[600px]' : 'h-[calc(100vh-220px)] sm:h-[calc(100vh-180px)] min-h-[400px]'}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        view={view}
        onView={handleViewChange}
        date={date}
        onNavigate={setDate}
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
          toolbar: CustomToolbar
        }}
        formats={{
          timeGutterFormat: 'h A',
          eventTimeRangeFormat: ({ start, end }) => 
            `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
          agendaTimeRangeFormat: ({ start, end }) => 
            `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
        }}
        step={30}
        timeslots={2}
        defaultView="month"
        views={['month', 'week', 'day', 'agenda']}
        popup={true}
        showMultiDayTimes={true}
        onSelectEvent={(event) => {
          // Call parent component's event click handler
          if (onEventClick) {
            onEventClick(event.id)
          }
        }}
        onSelectSlot={() => {
          // Don't do anything on empty slot click for now
          // Parent component handles event creation via the Add Event button
        }}
      />
    </div>
  )
})

BigCalendarView.displayName = 'BigCalendarView'