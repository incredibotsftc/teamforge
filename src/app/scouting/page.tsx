'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAppData } from '@/components/AppDataProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList, Calendar, MapPin, Trophy, Loader2, AlertCircle, FileText } from 'lucide-react'
import { ScoutingSearchBar } from '@/components/scouting/ScoutingSearchBar'
import { ApiSetupInstructions } from '@/components/scouting/ApiSetupInstructions'

interface FTCEventAPIResponse {
  eventId?: string
  code: string
  name: string
  type: string
  dateStart: string
  dateEnd: string
  city: string
  stateprov: string
  country: string
  venue: string
  website?: string
}

interface FTCEvent {
  key: string
  name: string
  event_code: string
  event_type: number
  start_date: string
  end_date: string
  year: number
  city: string
  state_prov: string
  country: string
  venue: string
  website?: string
}

function ScoutingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { team, currentSeason } = useAppData()

  // State
  const [events, setEvents] = useState<FTCEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiCredentialsError, setApiCredentialsError] = useState(false)

  // Season selection
  const seasonParam = searchParams.get('season')
  const selectedSeason = seasonParam ? parseInt(seasonParam) : (currentSeason?.start_year || 2025)

  // Generate available seasons
  const currentYear = currentSeason?.start_year || 2025
  const availableSeasons = Array.from({ length: 3 }, (_, i) => currentYear - i)

  // Fetch user's team events
  const fetchTeamEvents = useCallback(async (teamNumber: number) => {
    const cacheKey = `team_events_${teamNumber}_${selectedSeason}`

    // Check sessionStorage cache first
    try {
      const cachedData = sessionStorage.getItem(cacheKey)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        const cacheAge = Date.now() - parsed.timestamp
        // Use cache if less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          setEvents(parsed.data)
          setLoading(false)
          return
        }
      }
    } catch (err) {
      console.error('Cache read error:', err)
    }

    setLoading(true)
    setError(null)
    setApiCredentialsError(false)

    try {
      const response = await fetch(`/api/scouting/team-events?teamNumber=${teamNumber}&season=${selectedSeason}`)

      if (!response.ok) {
        const errorData = await response.json()

        // Check if it's an API credentials error
        if (response.status === 401 && errorData.error === 'API_CREDENTIALS_MISSING') {
          setApiCredentialsError(true)
          setLoading(false)
          return
        }

        throw new Error(errorData.error || `Failed to fetch team events (${response.status})`)
      }

      const data = await response.json()

      if (data.success && data.events) {
        const transformedEvents: FTCEvent[] = data.events.map((event: FTCEventAPIResponse) => ({
          key: `${selectedSeason}-${event.code}`,
          name: event.name,
          event_code: event.code,
          event_type: event.type || 0,
          start_date: event.dateStart,
          end_date: event.dateEnd,
          year: selectedSeason,
          city: event.city || '',
          state_prov: event.stateprov || '',
          country: event.country || '',
          venue: event.venue || '',
          website: event.website || undefined
        }))

        const sortedEvents = transformedEvents.sort((a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        )

        setEvents(sortedEvents)

        // Cache the results
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: sortedEvents,
            timestamp: Date.now()
          }))
        } catch (err) {
          console.error('Cache write error:', err)
        }
      } else {
        setEvents([])
      }
    } catch (err) {
      console.error('Error fetching team events:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [selectedSeason])

  // Load user's team events on mount and season change
  useEffect(() => {
    if (team?.team_number) {
      fetchTeamEvents(team.team_number)
    } else {
      setLoading(false)
    }
  }, [team, selectedSeason, fetchTeamEvents])

  const handleSeasonChange = (newSeason: string) => {
    const params = new URLSearchParams()
    params.set('season', newSeason)
    router.push(`/scouting?${params.toString()}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getEventTypeLabel = (eventType: number) => {
    switch (eventType) {
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

  const getEventTypeBadgeVariant = (eventType: number) => {
    switch (eventType) {
      case 2: return 'default' // Championship
      case 1: return 'secondary' // Super Regional
      case 0: return 'outline' // Regional
      default: return 'outline'
    }
  }

  const handleEventClick = (eventCode: string) => {
    const params = new URLSearchParams()
    params.set('season', selectedSeason.toString())
    router.push(`/scouting/events/${eventCode}?${params.toString()}`)
  }

  // Search bar + scouting sheet button in header actions
  const actions = (
    <div className="flex items-center gap-2">
      <ScoutingSearchBar
        selectedSeason={selectedSeason}
        availableSeasons={availableSeasons}
        onSeasonChange={handleSeasonChange}
        onError={(error) => setError(error)}
        onApiCredentialsError={() => setApiCredentialsError(true)}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/scouting/sheet')}
        className="whitespace-nowrap"
      >
        <FileText className="mr-2 h-4 w-4" />
        Scouting Sheet
      </Button>
    </div>
  )

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Scouting"
        pageIcon={ClipboardList}
        actions={!apiCredentialsError ? actions : undefined}
      >
        {/* Show API setup instructions if credentials are missing */}
        {apiCredentialsError ? (
          <ApiSetupInstructions />
        ) : (
          <div className="space-y-6">
            {/* Error message */}
            {error && (
              <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Upcoming Events for User's Team */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events for Team {team?.team_number || 'Unknown'}
                {team?.team_name && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({team.team_name})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Competition schedule for the {selectedSeason} season
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading events...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center p-8">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
                  <p className="text-muted-foreground">
                    No events found for Team {team?.team_number} in the {selectedSeason} season.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const now = new Date()
                    const upcomingEvents = events.filter(event => new Date(event.end_date) >= now)
                    const pastEvents = events.filter(event => new Date(event.end_date) < now)

                    return (
                      <>
                        {/* Upcoming Events */}
                        {upcomingEvents.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING EVENTS</h3>
                            <div className="space-y-4">
                              {upcomingEvents.map((event) => (
                                <Card
                                  key={event.key}
                                  className="border-l-4 border-l-blue-500 transition-all hover:shadow-md cursor-pointer"
                                  onClick={() => handleEventClick(event.event_code)}
                                >
                                  <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                          <h3 className="text-lg font-semibold">{event.name}</h3>
                                          <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                                            {getEventTypeLabel(event.event_type)}
                                          </Badge>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                              {formatDate(event.start_date)}
                                              {event.start_date !== event.end_date && (
                                                <> - {formatDate(event.end_date)}</>
                                              )}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            <span>
                                              {event.venue && `${event.venue}, `}
                                              {event.city}, {event.state_prov}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                          Event Code: {event.event_code}
                                        </div>
                                      </div>

                                      <div className="flex gap-2 ml-4">
                                        {event.website && (
                                          <Button variant="outline" size="sm" asChild>
                                            <a
                                              href={event.website}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              Event Info
                                            </a>
                                          </Button>
                                        )}
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
                              {pastEvents.map((event) => (
                                <Card
                                  key={event.key}
                                  className="border-l-4 border-l-gray-400 transition-all hover:shadow-md opacity-75 cursor-pointer"
                                  onClick={() => handleEventClick(event.event_code)}
                                >
                                  <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                          <h3 className="text-lg font-semibold">{event.name}</h3>
                                          <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                                            {getEventTypeLabel(event.event_type)}
                                          </Badge>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                              {formatDate(event.start_date)}
                                              {event.start_date !== event.end_date && (
                                                <> - {formatDate(event.end_date)}</>
                                              )}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            <span>
                                              {event.venue && `${event.venue}, `}
                                              {event.city}, {event.state_prov}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                          Event Code: {event.event_code}
                                        </div>
                                      </div>

                                      <div className="flex gap-2 ml-4">
                                        {event.website && (
                                          <Button variant="outline" size="sm" asChild>
                                            <a
                                              href={event.website}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              Event Info
                                            </a>
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {!loading && (
                <div className="mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => team?.team_number && fetchTeamEvents(team.team_number)}
                    className="w-full btn-accent"
                  >
                    Refresh Events
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export default function ScoutingPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Scouting"
          pageIcon={ClipboardList}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading scouting data...</span>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <ScoutingPageContent />
    </Suspense>
  )
}
