'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin } from 'lucide-react'

interface TeamEvent {
  code: string
  name: string
  dateStart: string
  dateEnd: string
  city: string
  stateprov: string
  venue: string
  type: string
}

interface TeamEventsCardProps {
  events: TeamEvent[]
  season: number
  onEventClick: (eventCode: string) => void
}

export function TeamEventsCard({ events, season, onEventClick }: TeamEventsCardProps) {
  const now = new Date()
  const upcomingEvents = events.filter((event: TeamEvent) => new Date(event.dateEnd) >= now)
  const pastEvents = events.filter((event: TeamEvent) => new Date(event.dateEnd) < now)

  // Only show the events card if there are any events to display
  if (upcomingEvents.length === 0 && pastEvents.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getEventTypeLabel = (eventType: string) => {
    const typeNum = parseInt(eventType)
    switch (typeNum) {
      case 0: return 'Regional'
      case 1: return 'Super Regional'
      case 2: return 'Championship'
      case 3: return 'League Meet'
      case 4: return 'League Tournament'
      case 5: return 'Qualifier'
      case 6: return 'Other'
      default: return 'Unknown'
    }
  }

  const getEventTypeBadgeVariant = (eventType: string): 'default' | 'secondary' | 'outline' => {
    const typeNum = parseInt(eventType)
    switch (typeNum) {
      case 2: return 'default' // Championship
      case 1: return 'secondary' // Super Regional
      case 0: return 'outline' // Regional
      default: return 'outline'
    }
  }

  const eventsContent = (
    <div className="space-y-6">
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING EVENTS</h3>
          <div className="space-y-4">
            {upcomingEvents.map((event: TeamEvent) => (
              <Card
                key={event.code}
                className="border-l-4 border-l-blue-500 transition-all hover:shadow-md hover:bg-accent cursor-pointer"
                onClick={() => onEventClick(event.code)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 sm:space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-base sm:text-lg">{event.name}</h4>
                        <Badge variant={getEventTypeBadgeVariant(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>
                            {formatDate(event.dateStart)}
                            {event.dateStart !== event.dateEnd && (
                              <> - {formatDate(event.dateEnd)}</>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>
                            {event.venue && `${event.venue}, `}
                            {event.city}, {event.stateprov}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">PAST EVENTS</h3>
          <div className="space-y-4">
            {pastEvents.map((event: TeamEvent) => (
              <Card
                key={event.code}
                className="border-l-4 border-l-gray-300 transition-all hover:shadow-md hover:bg-accent cursor-pointer opacity-75"
                onClick={() => onEventClick(event.code)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 sm:space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-base sm:text-lg">{event.name}</h4>
                        <Badge variant={getEventTypeBadgeVariant(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>
                            {formatDate(event.dateStart)}
                            {event.dateStart !== event.dateEnd && (
                              <> - {formatDate(event.dateEnd)}</>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>
                            {event.venue && `${event.venue}, `}
                            {event.city}, {event.stateprov}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile: No outer card wrapper */}
      <div className="block sm:hidden space-y-6">
        <div className="pt-6 pb-3 border-t border-b">
          <h2 className="text-2xl font-bold">Events</h2>
          <p className="text-sm text-muted-foreground">
            Upcoming and past events for the {season} season
          </p>
        </div>
        {eventsContent}
      </div>

      {/* Desktop: Card wrapper */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Events</CardTitle>
          <CardDescription>
            Upcoming and past events for the {season} season
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsContent}
        </CardContent>
      </Card>
    </>
  )
}
