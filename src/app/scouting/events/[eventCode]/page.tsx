'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAppData } from '@/components/AppDataProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, MapPin, Users, Loader2, AlertCircle, ExternalLink, FileText } from 'lucide-react'
import { ScoutingSearchBar } from '@/components/scouting/ScoutingSearchBar'
import { EventScoutingSheets } from '@/components/scouting/EventScoutingSheets'

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

interface TeamInfo {
  teamNumber: number
  nameFull: string
  nameShort: string
  schoolName: string
  city: string
  stateProv: string
  country: string
  rookieYear: number
  website: string | null
  rank: number | null
  wins: number | null
  losses: number | null
  ties: number | null
  sortOrder1: number | null // RP (Ranking Points)
  sortOrder2: number | null // TBP (Tie Breaker Points)
  matchesPlayed: number | null
  matchesCounted: number | null
}

function EventDetailsPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { currentSeason } = useAppData()

  // Get event code from route params
  const eventCode = params.eventCode as string

  // Get season from query params or use current season
  const seasonParam = searchParams.get('season')
  const selectedSeason = seasonParam ? parseInt(seasonParam) : (currentSeason?.start_year || 2025)

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<FTCEvent | null>(null)
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [showScoutingSheets, setShowScoutingSheets] = useState(false)
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | null>(null)
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null)

  // Generate available seasons
  const currentYear = currentSeason?.start_year || 2025
  const availableSeasons = Array.from({ length: 3 }, (_, i) => currentYear - i)

  // Fetch event data
  const fetchEventData = useCallback(async () => {
    if (!eventCode) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/scouting/search-event?eventCode=${encodeURIComponent(eventCode)}&season=${selectedSeason}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load event data')
      }

      const data = await response.json()

      if (!data.success || data.events.length === 0) {
        setError(`Event "${eventCode}" not found for the ${selectedSeason} season`)
        setEvent(null)
        setTeams([])
        setLoading(false)
        return
      }

      // Transform event data
      const eventData: FTCEvent = {
        key: `${data.events[0].eventId || data.events[0].code}`,
        name: data.events[0].name,
        event_code: data.events[0].code,
        event_type: parseInt(data.events[0].type) || 0,
        start_date: data.events[0].dateStart,
        end_date: data.events[0].dateEnd,
        year: selectedSeason,
        city: data.events[0].city,
        state_prov: data.events[0].stateprov,
        country: data.events[0].country,
        venue: data.events[0].venue,
        website: data.events[0].website || undefined
      }

      setEvent(eventData)
      setTeams(data.teams || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching event data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event data')
      setLoading(false)
    }
  }, [eventCode, selectedSeason])

  useEffect(() => {
    fetchEventData()
  }, [fetchEventData])

  // Handle season change
  const handleSeasonChange = (newSeason: string) => {
    const params = new URLSearchParams()
    params.set('season', newSeason)
    router.push(`/scouting/events/${eventCode}?${params.toString()}`)
  }

  // Handle team click
  const handleTeamClick = (teamNumber: number) => {
    const params = new URLSearchParams()
    params.set('teamNumber', teamNumber.toString())
    params.set('season', selectedSeason.toString())
    router.push(`/scouting/teams?${params.toString()}`)
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

  // Header actions
  const actions = (
    <ScoutingSearchBar
      selectedSeason={selectedSeason}
      availableSeasons={availableSeasons}
      onSeasonChange={handleSeasonChange}
      onError={(errorMsg) => setError(errorMsg)}
    />
  )

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Event Details"
          pageIcon={Calendar}
          actions={actions}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading event data...</span>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || !event) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Event Details"
          pageIcon={Calendar}
          actions={actions}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Event Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  {error || `Event "${eventCode}" could not be found`}
                </p>
                <Button onClick={() => router.push('/scouting')} variant="outline">
                  Back to Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Event Details"
        pageIcon={Calendar}
        actions={actions}
      >
        <div className="space-y-6">
          {/* Event Information Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <h3 className="text-xl md:text-2xl font-semibold">{event.name}</h3>
                    <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-muted-foreground">
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
                      <span className="break-words">
                        {event.venue && `${event.venue}, `}
                        {event.city}, {event.state_prov}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Event Code: {event.event_code}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 md:ml-4">
                  <Button
                    size="sm"
                    onClick={() => setShowScoutingSheets(true)}
                    className="w-full sm:w-auto btn-accent"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Scouting Sheets
                  </Button>
                  {event.website && (
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Event Info
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teams List */}
          <Card className="md:border md:shadow-sm border-0 shadow-none">
            <CardHeader className="px-0 md:px-6">
              <CardTitle className="text-2xl font-bold mb-1">
                Participating Teams
              </CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {teams.length} teams registered for this event
                </div>
                <div className="text-xs mt-1">
                  W-L-T, RP (Ranking Points), and TBP (Tie Breaker Points) show event-specific rankings when available
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              {teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
                  <p className="text-muted-foreground">
                    No team data is available for this event yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto md:rounded-md md:border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Rank</TableHead>
                        <TableHead className="w-24 hidden md:table-cell">Team #</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead className="max-w-[150px] hidden lg:table-cell">School</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="text-center">W-L-T</TableHead>
                        <TableHead className="text-right">RP</TableHead>
                        <TableHead className="text-right">TBP</TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-12 hidden md:table-cell"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow
                          key={team.teamNumber}
                          onClick={() => handleTeamClick(team.teamNumber)}
                          className="cursor-pointer hover:bg-accent transition-colors"
                        >
                          <TableCell className="font-medium">
                            {team.rank !== null ? (
                              <Badge variant="outline" className="font-mono">
                                {team.rank}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold hidden md:table-cell">
                            {team.teamNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium max-w-[120px] md:max-w-none truncate md:whitespace-normal">{team.nameShort || team.nameFull || '-'}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 md:hidden">#{team.teamNumber}</div>
                              {team.rookieYear && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Rookie {team.rookieYear}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] hidden lg:table-cell">
                            {(team.nameFull || team.schoolName) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate cursor-help">
                                    {team.nameFull || team.schoolName}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{team.nameFull || team.schoolName}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-sm hidden md:table-cell">
                            {team.city}, {team.stateProv}
                            {team.country !== 'USA' && `, ${team.country}`}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {team.wins !== null && team.losses !== null && team.ties !== null ? (
                              `${team.wins}-${team.losses}-${team.ties}`
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {team.sortOrder1 !== null ? team.sortOrder1 : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {team.sortOrder2 !== null ? team.sortOrder2.toFixed(1) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTeamNumber(team.teamNumber)
                                setSelectedTeamName(team.nameShort || team.nameFull || '')
                                setShowScoutingSheets(true)
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {team.website && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={team.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scouting Sheets Dialog */}
        <EventScoutingSheets
          eventCode={eventCode}
          eventName={event.name}
          seasonId={currentSeason?.id}
          teamNumber={selectedTeamNumber}
          teamName={selectedTeamName}
          eventTeams={teams}
          open={showScoutingSheets}
          onOpenChange={(open) => {
            setShowScoutingSheets(open)
            if (!open) {
              setSelectedTeamNumber(null)
              setSelectedTeamName(null)
            }
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export default function EventDetailsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Event Details"
          pageIcon={Calendar}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading event data...</span>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <EventDetailsPageContent />
    </Suspense>
  )
}
