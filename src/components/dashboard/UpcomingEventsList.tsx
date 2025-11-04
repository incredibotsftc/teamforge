'use client'

import Link from 'next/link'
import { CalendarIcon, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Event {
  id: string
  title: string
  event_type: string
  start_date: string
  start_time?: string
  location?: string
}

interface UpcomingEventsListProps {
  events: Event[]
}

export function UpcomingEventsList({ events }: UpcomingEventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No upcoming events scheduled
      </div>
    )
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'competition':
        return 'bg-red-100 text-red-800'
      case 'meeting':
        return 'bg-blue-100 text-blue-800'
      case 'workshop':
        return 'bg-purple-100 text-purple-800'
      case 'outreach':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string, timeStr?: string) => {
    const date = new Date(dateStr)
    const dateFormatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })

    if (timeStr) {
      return `${dateFormatted} at ${timeStr}`
    }
    return dateFormatted
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/calendar/${event.id}/edit`}
          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer block"
        >
          <div className="flex-shrink-0 mt-1">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{event.title}</p>
              <Badge className={getEventTypeColor(event.event_type)} variant="secondary">
                {event.event_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(event.start_date, event.start_time)}
            </p>
            {event.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
