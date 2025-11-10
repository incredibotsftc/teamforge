'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAppData } from '@/components/AppDataProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClipboardList, Loader2, AlertCircle, Trophy, Activity, BarChart3, TrendingUp, X, StickyNote, Award, Calendar, MapPin } from 'lucide-react'
import type { FTCMatch } from '@/lib/ftcEventsService'
import { PerformanceLineChart, ScoreBreakdownChart, EventComparisonChart } from '@/components/scouting/TeamMatchCharts'
import { ScoutingTeamNotes } from '@/components/scouting/ScoutingTeamNotes'
import { ScoutingSearchBar } from '@/components/scouting/ScoutingSearchBar'

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
}

interface FTCAward {
  awardId: number
  eventCode: string
  teamNumber: number | null
  personName: string | null
  name: string
  series: number
  eventName: string
  eventStart: string
  eventEnd: string
  eventCity: string
  eventState: string
}

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

function ScoutingTeamsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentSeason } = useAppData()

  // Parse query params (use raw strings to avoid creating new arrays on every render)
  const teamNumbersParam = searchParams.get('teamNumber') || ''
  const seasonParam = searchParams.get('season')

  // Memoize selected season to prevent unnecessary re-renders
  const selectedSeason = React.useMemo(() => {
    return seasonParam ? parseInt(seasonParam) : (currentSeason?.start_year || 2025)
  }, [seasonParam, currentSeason?.start_year])

  // Parse team numbers once to avoid infinite loops
  const teamNumbers = React.useMemo(() => {
    return teamNumbersParam ? teamNumbersParam.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : []
  }, [teamNumbersParam])

  // Check cache immediately to set initial loading state
  const initialLoadKey = `${teamNumbersParam}-${selectedSeason}`
  const hasInitialCache = React.useMemo(() => {
    try {
      const cachedData = sessionStorage.getItem(`teams_data_${initialLoadKey}`)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        const cacheAge = Date.now() - parsed.timestamp
        return cacheAge < 5 * 60 * 1000
      }
    } catch {
      // Ignore errors
    }
    return false
  }, [initialLoadKey])

  // State - start with loading=false if we have cache
  const [loading, setLoading] = useState(!hasInitialCache)
  const [error, setError] = useState<string | null>(null)
  const [teamsData, setTeamsData] = useState<Array<{
    teamNumber: number
    teamInfo: TeamInfo | null
    matches: (FTCMatch & { eventName: string; eventCode: string; eventStart: string; eventEnd: string; eventCity: string; eventState: string })[]
    awards: FTCAward[]
    events?: TeamEvent[]
  }>>([])
  const [showNotesSidebar, setShowNotesSidebar] = useState(false)

  // Use refs to track loading state and prevent infinite loops
  const currentLoadKeyRef = React.useRef<string>('')

  // Generate available seasons
  const currentYear = currentSeason?.start_year || 2025
  const availableSeasons = Array.from({ length: 3 }, (_, i) => currentYear - i)

  // Fetch team data with timeout and error handling
  const fetchTeamData = useCallback(async (teamNumber: number) => {
    const timeoutMs = 15000 // 15 second timeout

    const fetchWithTimeout = async (url: string, useAbort = true) => {
      if (!useAbort) {
        // For critical requests like team info, don't use abort to avoid Fast Refresh issues
        return await fetch(url)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)
        return response
      } catch (err) {
        clearTimeout(timeoutId)
        throw err
      }
    }

    try {
      // FIRST: Fetch team info (without abort controller to avoid Fast Refresh issues)
      let teamInfo: TeamInfo | null = null
      try {
        const searchRes = await fetchWithTimeout(`/api/scouting/search?query=${teamNumber}&type=team&season=${selectedSeason}`, false)
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData.success && searchData.matches.length > 0) {
            const match = searchData.matches[0]
            teamInfo = {
              teamNumber: match.teamNumber,
              nameFull: match.nameFull || `Team ${teamNumber}`,
              nameShort: match.nameShort || match.nameFull || `Team ${teamNumber}`,
              schoolName: match.schoolName || '',
              city: match.city || '',
              stateProv: match.stateProv || '',
              country: match.country || '',
              rookieYear: match.rookieYear || 0,
              website: match.website || null
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching team info for team ${teamNumber}:`, e)
      }

      // THEN: Fetch matches, awards, and events in parallel with timeout
      const [matchesRes, awardsRes, eventsRes] = await Promise.allSettled([
        fetchWithTimeout(`/api/scouting/team-matches?teamNumber=${teamNumber}&season=${selectedSeason}`),
        fetchWithTimeout(`/api/scouting/team-awards?teamNumber=${teamNumber}&season=${selectedSeason}`),
        fetchWithTimeout(`/api/scouting/team-events?teamNumber=${teamNumber}&season=${selectedSeason}`)
      ])

      // Handle matches response
      let matchesData = { matches: [] }
      if (matchesRes.status === 'fulfilled' && matchesRes.value.ok) {
        try {
          matchesData = await matchesRes.value.json()
        } catch (e) {
          console.error(`Error parsing matches JSON for team ${teamNumber}:`, e)
        }
      } else if (matchesRes.status === 'rejected') {
        console.error(`Error fetching matches for team ${teamNumber}:`, matchesRes.reason)
      }

      // Handle awards response
      let awardsData = { awards: [] }
      if (awardsRes.status === 'fulfilled' && awardsRes.value.ok) {
        try {
          awardsData = await awardsRes.value.json()
        } catch (e) {
          console.error(`Error parsing awards JSON for team ${teamNumber}:`, e)
        }
      } else if (awardsRes.status === 'rejected') {
        console.error(`Error fetching awards for team ${teamNumber}:`, awardsRes.reason)
      }

      // Handle events response
      let eventsData = { events: [] }
      if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
        try {
          eventsData = await eventsRes.value.json()
        } catch (e) {
          console.error(`Error parsing events JSON for team ${teamNumber}:`, e)
        }
      } else if (eventsRes.status === 'rejected') {
        console.error(`Error fetching events for team ${teamNumber}:`, eventsRes.reason)
      }

      return {
        teamNumber,
        teamInfo,
        matches: matchesData.matches || [],
        awards: awardsData.awards || [],
        events: eventsData.events || []
      }
    } catch {
      return {
        teamNumber,
        teamInfo: null,
        matches: [],
        awards: [],
        events: []
      }
    }
  }, [selectedSeason])

  // Load all teams data
  useEffect(() => {
    const loadKey = `${teamNumbersParam}-${selectedSeason}`

    // Redirect if no team numbers
    if (teamNumbers.length === 0) {
      router.push('/scouting')
      return
    }

    // Skip if this is the same load key we're currently processing
    if (currentLoadKeyRef.current === loadKey) {
      return
    }

    // Check sessionStorage for cached data
    let usedCache = false
    try {
      const cachedData = sessionStorage.getItem(`teams_data_${loadKey}`)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        const cacheAge = Date.now() - parsed.timestamp
        // Use cache if less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          setTeamsData(parsed.data)
          setLoading(false)
          currentLoadKeyRef.current = loadKey
          usedCache = true
        }
      }
    } catch (err) {
      console.error('Cache read error:', err)
    }

    // If we used cache, don't fetch
    if (usedCache) {
      return
    }

    // Mark this load key as being processed
    currentLoadKeyRef.current = loadKey

    setLoading(true)
    setError(null)
    setTeamsData([]) // Clear old data

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
      setError('Request timed out. Please try again.')
      currentLoadKeyRef.current = '' // Reset so it can be retried
    }, 20000)

    const fetchData = async () => {
      try {
        const results = await Promise.all(teamNumbers.map(num => fetchTeamData(num)))

        // Only check if we're still on the same load key
        if (currentLoadKeyRef.current === loadKey) {
          clearTimeout(safetyTimeout)
          setTeamsData(results)
          setLoading(false)

          // Cache the results in sessionStorage
          try {
            sessionStorage.setItem(`teams_data_${loadKey}`, JSON.stringify({
              data: results,
              timestamp: Date.now()
            }))
          } catch (err) {
            console.error('Cache write error:', err)
          }
        }
      } catch {
        if (currentLoadKeyRef.current === loadKey) {
          clearTimeout(safetyTimeout)
          setError('Failed to load team data. Please try again.')
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      clearTimeout(safetyTimeout)
      // Don't reset currentLoadKeyRef here - let the next effect handle it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamNumbersParam, selectedSeason])

  // Handle season change
  const handleSeasonChange = (newSeason: string) => {
    const params = new URLSearchParams()
    params.set('teamNumber', teamNumbers.join(','))
    params.set('season', newSeason)
    router.push(`/scouting/teams?${params.toString()}`)
  }

  // Handle remove team from comparison
  const handleRemoveTeam = (teamNumber: number) => {
    const remainingTeams = teamNumbers.filter(n => n !== teamNumber)
    if (remainingTeams.length === 0) {
      router.push('/scouting')
    } else {
      const params = new URLSearchParams()
      params.set('teamNumber', remainingTeams.join(','))
      params.set('season', selectedSeason.toString())
      router.push(`/scouting/teams?${params.toString()}`)
    }
  }

  const isComparisonMode = teamNumbers.length > 1

  // Header actions
  const actions = (
    <ScoutingSearchBar
      selectedSeason={selectedSeason}
      availableSeasons={availableSeasons}
      onSeasonChange={handleSeasonChange}
      onError={(error) => setError(error)}
    />
  )

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Team Details"
          pageIcon={ClipboardList}
          actions={actions}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading team data...</span>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || teamsData.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Team Details"
          pageIcon={ClipboardList}
          actions={actions}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Team Data</h3>
                <p className="text-muted-foreground mb-4">
                  {error || 'Failed to load team information'}
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

  // Comparison Mode
  if (isComparisonMode) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Team Comparison"
          pageIcon={BarChart3}
          actions={actions}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold mb-2">Team Comparison</CardTitle>
              <CardDescription>
                Comparing {teamsData.length} team{teamsData.length > 1 ? 's' : ''} for the {selectedSeason} season
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Team Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {teamsData.map((team) => {
                  // Calculate stats
                  let wins = 0, losses = 0, ties = 0, totalScore = 0, scoredMatches = 0

                  team.matches.forEach((match) => {
                    const teamData = match.teams?.find(t => t.teamNumber === team.teamNumber)
                    const isRedAlliance = teamData?.station.startsWith('Red')
                    const allianceScore = isRedAlliance ? match.scoreRedFinal : match.scoreBlueFinal
                    const opponentScore = isRedAlliance ? match.scoreBlueFinal : match.scoreRedFinal

                    if (allianceScore !== null && opponentScore !== null) {
                      if (allianceScore > opponentScore) wins++
                      else if (allianceScore < opponentScore) losses++
                      else ties++
                      totalScore += allianceScore
                      scoredMatches++
                    }
                  })

                  const avgScore = scoredMatches > 0 ? Math.round(totalScore / scoredMatches) : 0
                  const totalMatches = wins + losses + ties
                  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(0) : '0'

                  return (
                    <div key={team.teamNumber} className="border rounded-lg p-4 relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => handleRemoveTeam(team.teamNumber)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="mb-3">
                        <h3 className="font-bold text-lg">{team.teamInfo?.nameShort || team.teamInfo?.nameFull || `Team ${team.teamNumber}`}</h3>
                        <p className="text-sm text-muted-foreground">#{team.teamNumber}</p>
                        {team.teamInfo?.schoolName && (
                          <p className="text-xs text-muted-foreground mt-1">{team.teamInfo.schoolName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Matches:</span>
                          <span className="font-semibold">{totalMatches}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Win Rate:</span>
                          <span className="font-semibold">{winRate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Record:</span>
                          <span className="font-semibold">{wins}-{losses}-{ties}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Score:</span>
                          <span className="font-semibold">{avgScore}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Comparison Charts */}
              {teamsData.length >= 2 && (
                <Tabs defaultValue="performance" className="w-full mt-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="breakdown">Score Analysis</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="awards">Awards</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="mt-6">
                    <div className="space-y-6">
                      {teamsData.map((team) => (
                        <div key={team.teamNumber} className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            {team.teamInfo?.nameShort || team.teamInfo?.nameFull || `Team ${team.teamNumber}`} (#{team.teamNumber})
                          </h3>
                          <PerformanceLineChart matches={team.matches} teamNumber={team.teamNumber} />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="breakdown" className="mt-6">
                    <div className="space-y-6">
                      {teamsData.map((team) => (
                        <div key={team.teamNumber} className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            {team.teamInfo?.nameShort || team.teamInfo?.nameFull || `Team ${team.teamNumber}`} (#{team.teamNumber})
                          </h3>
                          <ScoreBreakdownChart matches={team.matches} teamNumber={team.teamNumber} />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="mt-6">
                    <div className="space-y-6">
                      {teamsData.map((team) => (
                        <div key={team.teamNumber} className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            {team.teamInfo?.nameShort || team.teamInfo?.nameFull || `Team ${team.teamNumber}`} (#{team.teamNumber})
                          </h3>
                          <EventComparisonChart matches={team.matches} teamNumber={team.teamNumber} />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="awards" className="mt-6">
                    {(() => {
                      // Group all awards by event code
                      const allEventCodes = new Set<string>()
                      teamsData.forEach(team => {
                        team.awards.forEach(award => allEventCodes.add(award.eventCode))
                      })

                      // Create event info map
                      const eventInfoMap: Record<string, { name: string; date: string; city: string; state: string }> = {}
                      teamsData.forEach(team => {
                        team.awards.forEach(award => {
                          if (!eventInfoMap[award.eventCode]) {
                            eventInfoMap[award.eventCode] = {
                              name: award.eventName,
                              date: award.eventStart,
                              city: award.eventCity,
                              state: award.eventState
                            }
                          }
                        })
                      })

                      // Sort events by date
                      const sortedEventCodes = Array.from(allEventCodes).sort((a, b) => {
                        const dateA = new Date(eventInfoMap[a].date).getTime()
                        const dateB = new Date(eventInfoMap[b].date).getTime()
                        return dateA - dateB
                      })

                      if (sortedEventCodes.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <Award className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Awards</h3>
                            <p className="text-muted-foreground">
                              None of these teams have won any awards in the {selectedSeason} season.
                            </p>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground mb-4">
                            Side-by-side awards comparison. Teams that attended the same event are shown in the same row.
                          </div>

                          {sortedEventCodes.map((eventCode) => {
                            const eventInfo = eventInfoMap[eventCode]

                            return (
                              <Card key={eventCode} className="border-l-4 border-l-yellow-500">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <CardTitle className="text-base font-semibold">{eventInfo.name}</CardTitle>
                                      <CardDescription className="text-xs">
                                        {eventInfo.city}, {eventInfo.state} • {new Date(eventInfo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </CardDescription>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className={`grid gap-4 ${teamsData.length === 2 ? 'grid-cols-2' : teamsData.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                                    {teamsData.map((team) => {
                                      const teamAwards = team.awards.filter(award => award.eventCode === eventCode)
                                      const teamName = team.teamInfo?.nameShort || team.teamInfo?.nameFull || `Team ${team.teamNumber}`

                                      return (
                                        <div key={team.teamNumber} className="border rounded-lg p-3">
                                          <div className="font-semibold text-sm mb-2 pb-2 border-b">
                                            {teamName}
                                            <span className="text-xs text-muted-foreground ml-1">(#{team.teamNumber})</span>
                                          </div>

                                          {teamAwards.length === 0 ? (
                                            <div className="text-center py-4 text-sm text-muted-foreground">
                                              No awards
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {teamAwards.map((award, index) => (
                                                <div key={`${award.awardId}-${index}`} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                                                  <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-xs">{award.name}</div>
                                                    {award.personName && (
                                                      <div className="text-xs text-muted-foreground mt-0.5">
                                                        {award.personName}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Single Team Mode
  const teamData = teamsData[0]
  const teamInfo = teamData.teamInfo
  const teamMatches = teamData.matches
  const teamAwards = teamData.awards
  const teamEvents = teamData.events || []
  const currentTeamNumber = teamData.teamNumber
  const isCurrentSeason = selectedSeason === currentYear

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Team Details"
        pageIcon={ClipboardList}
        actions={actions}
      >
        <div className="space-y-6">
          {/* No matches message */}
          {teamMatches.length === 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-bold mb-1">
                      {teamInfo?.nameShort || teamInfo?.nameFull || `Team ${currentTeamNumber}`}
                    </CardTitle>
                    {teamInfo?.schoolName && (
                      <div className="text-sm text-muted-foreground mb-1">{teamInfo.schoolName}</div>
                    )}
                    {teamInfo?.city && teamInfo?.stateProv && (
                      <div className="text-xs text-muted-foreground mb-2">{teamInfo.city}, {teamInfo.stateProv}</div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-2xl font-bold text-muted-foreground">
                      #{currentTeamNumber}
                    </div>
                    {teamInfo?.rookieYear && (
                      <div className="text-xs text-muted-foreground">
                        Rookie: {teamInfo.rookieYear}
                      </div>
                    )}
                    <Button
                      onClick={() => setShowNotesSidebar(true)}
                      className="btn-accent mt-2"
                      size="sm"
                    >
                      <StickyNote className="h-4 w-4 mr-2" />
                      View Notes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Match Data</h3>
                  <p className="text-muted-foreground">
                    No match data found for the {selectedSeason} season.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Details with Matches */}
          {teamMatches.length > 0 && (() => {
            const teamName = teamInfo?.nameShort || teamInfo?.nameFull || `Team ${currentTeamNumber}`
            const teamSchool = teamInfo?.schoolName
            const teamLocation = teamInfo?.city && teamInfo?.stateProv ? `${teamInfo.city}, ${teamInfo.stateProv}` : null

            // Calculate statistics
            let wins = 0, losses = 0, ties = 0, totalScore = 0, scoredMatches = 0
            const firstHalfScores: number[] = []
            const secondHalfScores: number[] = []

            teamMatches.forEach((match, index) => {
              const teamDataMatch = match.teams?.find(t => t.teamNumber === currentTeamNumber)
              const isRedAlliance = teamDataMatch?.station.startsWith('Red')
              const allianceScore = isRedAlliance ? match.scoreRedFinal : match.scoreBlueFinal
              const opponentScore = isRedAlliance ? match.scoreBlueFinal : match.scoreRedFinal

              if (allianceScore !== null && opponentScore !== null) {
                if (allianceScore > opponentScore) wins++
                else if (allianceScore < opponentScore) losses++
                else ties++

                totalScore += allianceScore
                scoredMatches++

                if (index < teamMatches.length / 2) {
                  firstHalfScores.push(allianceScore)
                } else {
                  secondHalfScores.push(allianceScore)
                }
              }
            })

            const totalMatches = wins + losses + ties
            const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0'
            const avgScore = scoredMatches > 0 ? Math.round(totalScore / scoredMatches) : 0

            const firstHalfAvg = firstHalfScores.length > 0
              ? firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length
              : 0
            const secondHalfAvg = secondHalfScores.length > 0
              ? secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length
              : 0
            const improvement = firstHalfAvg > 0
              ? (((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100).toFixed(1)
              : '0.0'
            const isImproving = parseFloat(improvement) > 0

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-3xl font-bold mb-1">
                        {teamName}
                      </CardTitle>
                      {teamSchool && (
                        <div className="text-sm text-muted-foreground mb-1">{teamSchool}</div>
                      )}
                      {teamLocation && (
                        <div className="text-xs text-muted-foreground mb-2">{teamLocation}</div>
                      )}
                      <CardDescription className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        {teamMatches.length} matches for the {selectedSeason} season
                      </CardDescription>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{currentTeamNumber}
                      </div>
                      {teamInfo?.rookieYear && (
                        <div className="text-xs text-muted-foreground">
                          Rookie: {teamInfo.rookieYear}
                        </div>
                      )}
                      <Button
                        onClick={() => setShowNotesSidebar(true)}
                        className="btn-accent mt-2"
                        size="sm"
                      >
                        <StickyNote className="h-4 w-4 mr-2" />
                        View Notes
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Matches</p>
                      <p className="text-2xl font-bold">{totalMatches}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">{winRate}%</p>
                      <p className="text-xs text-muted-foreground">{wins}W - {losses}L - {ties}T</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Avg Score</p>
                      <p className="text-2xl font-bold">{avgScore}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Improvement</p>
                      <p className={`text-2xl font-bold ${isImproving ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isImproving ? '+' : ''}{improvement}%
                      </p>
                      <p className="text-xs text-muted-foreground">vs first half</p>
                    </div>
                  </div>

                  {/* Tabbed Charts and Table */}
                  <Tabs defaultValue="performance" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="performance"><Activity className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Performance</span></TabsTrigger>
                      <TabsTrigger value="breakdown"><BarChart3 className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Score Analysis</span></TabsTrigger>
                      <TabsTrigger value="events"><TrendingUp className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Events</span></TabsTrigger>
                      <TabsTrigger value="awards"><Award className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Awards</span></TabsTrigger>
                      <TabsTrigger value="details"><Trophy className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Details</span></TabsTrigger>
                    </TabsList>

                    <TabsContent value="performance" className="mt-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Performance Over Time</h3>
                        <p className="text-sm text-muted-foreground">
                          Alliance scores across all matches with trend line. Points colored by result (Win/Loss/Tie).
                        </p>
                        <PerformanceLineChart matches={teamMatches} teamNumber={currentTeamNumber} />
                      </div>
                    </TabsContent>

                    <TabsContent value="breakdown" className="mt-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Score Breakdown by Phase</h3>
                        <p className="text-sm text-muted-foreground">
                          Stacked breakdown of Auto and Teleop+Endgame contributions to alliance score.
                        </p>
                        <ScoreBreakdownChart matches={teamMatches} teamNumber={currentTeamNumber} />
                      </div>
                    </TabsContent>

                    <TabsContent value="events" className="mt-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Event Comparison</h3>
                        <p className="text-sm text-muted-foreground">
                          Average alliance scores across all events attended this season.
                        </p>
                        <EventComparisonChart matches={teamMatches} teamNumber={currentTeamNumber} />
                      </div>
                    </TabsContent>

                    <TabsContent value="awards" className="mt-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Awards & Recognitions</h3>
                        <p className="text-sm text-muted-foreground">
                          All awards earned by this team during the {selectedSeason} season.
                        </p>
                        {teamAwards.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <Award className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Awards Yet</h3>
                            <p className="text-muted-foreground">
                              This team has not won any awards in the {selectedSeason} season.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4 mt-4">
                            {(() => {
                              const awardsByEvent = teamAwards.reduce((acc, award) => {
                                if (!acc[award.eventCode]) {
                                  acc[award.eventCode] = {
                                    eventName: award.eventName,
                                    eventCity: award.eventCity,
                                    eventState: award.eventState,
                                    eventDate: award.eventStart,
                                    awards: []
                                  }
                                }
                                acc[award.eventCode].awards.push(award)
                                return acc
                              }, {} as Record<string, { eventName: string; eventCity: string; eventState: string; eventDate: string; awards: FTCAward[] }>)

                              return Object.entries(awardsByEvent).map(([eventCode, eventData]) => (
                                <Card key={eventCode} className="border-l-4 border-l-yellow-500">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <CardTitle className="text-base font-semibold">{eventData.eventName}</CardTitle>
                                        <CardDescription className="text-xs">
                                          {eventData.eventCity}, {eventData.eventState} • {new Date(eventData.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </CardDescription>
                                      </div>
                                      <Badge variant="secondary" className="ml-2">
                                        {eventData.awards.length} {eventData.awards.length === 1 ? 'Award' : 'Awards'}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      {eventData.awards.map((award, index) => (
                                        <div key={`${award.awardId}-${index}`} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                          <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{award.name}</div>
                                            {award.personName && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                Recipient: {award.personName}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            })()}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="details" className="mt-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Alliance</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Auto</TableHead>
                            <TableHead>Teleop</TableHead>
                            <TableHead>Endgame</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamMatches.map((match, index) => {
                            const teamDataMatch = match.teams?.find(t => t.teamNumber === currentTeamNumber)
                            const isRedAlliance = teamDataMatch?.station.startsWith('Red')
                            const allianceScore = isRedAlliance ? match.scoreRedFinal : match.scoreBlueFinal
                            const opponentScore = isRedAlliance ? match.scoreBlueFinal : match.scoreRedFinal
                            const won = allianceScore !== null && opponentScore !== null && allianceScore > opponentScore
                            const tied = allianceScore !== null && opponentScore !== null && allianceScore === opponentScore
                            const autoScore = isRedAlliance ? match.scoreRedAuto : match.scoreBlueAuto
                            const teleopScore = isRedAlliance ? match.scoreRedTeleop : match.scoreBlueTeleop
                            const endgameScore = isRedAlliance ? match.scoreRedEndgame : match.scoreBlueEndgame

                            return (
                              <TableRow key={`${match.eventCode}-${match.tournamentLevel}-${match.matchNumber}-${index}`}>
                                <TableCell className="text-sm">
                                  {new Date(match.actualStartTime || match.startTime).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-sm">{match.eventName}</div>
                                    <div className="text-xs text-muted-foreground">{match.eventCity}, {match.eventState}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{match.tournamentLevel === 'qual' ? 'Qual' : 'Playoff'} {match.matchNumber}</div>
                                    {teamDataMatch && <div className="text-xs text-muted-foreground">{teamDataMatch.station}</div>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={isRedAlliance ? 'destructive' : 'default'}
                                    className={isRedAlliance ? 'text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                                  >
                                    {isRedAlliance ? 'Red' : 'Blue'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-bold">
                                  {allianceScore !== null ? allianceScore : '-'}
                                  <span className="text-muted-foreground"> - </span>
                                  {opponentScore !== null ? opponentScore : '-'}
                                </TableCell>
                                <TableCell>
                                  {allianceScore !== null && opponentScore !== null ? (
                                    <Badge variant={won ? 'default' : tied ? 'secondary' : 'outline'}>
                                      {won ? 'Win' : tied ? 'Tie' : 'Loss'}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{autoScore ?? '-'}</TableCell>
                                <TableCell className="text-sm">{teleopScore ?? '-'}</TableCell>
                                <TableCell className="text-sm">{endgameScore ?? '-'}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )
          })()}

          {/* Events Card - shown independently for current season */}
          {isCurrentSeason && teamEvents.length > 0 && (() => {
            const now = new Date()
            const upcomingEvents = teamEvents.filter((event: TeamEvent) => new Date(event.dateEnd) >= now)
            const pastEvents = teamEvents.filter((event: TeamEvent) => new Date(event.dateEnd) < now)

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

            const getEventTypeBadgeVariant = (eventType: string) => {
              const typeNum = parseInt(eventType)
              switch (typeNum) {
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

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Events</CardTitle>
                  <CardDescription>
                    Upcoming and past events for the {selectedSeason} season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING EVENTS</h3>
                        <div className="space-y-4">
                          {upcomingEvents.map((event: TeamEvent) => (
                            <Card
                              key={event.code}
                              className="border-l-4 border-l-blue-500 transition-all hover:shadow-md cursor-pointer"
                              onClick={() => handleEventClick(event.code)}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-lg">{event.name}</h4>
                                      <Badge variant={getEventTypeBadgeVariant(event.type)}>
                                        {getEventTypeLabel(event.type)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                          {formatDate(event.dateStart)}
                                          {event.dateStart !== event.dateEnd && (
                                            <> - {formatDate(event.dateEnd)}</>
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
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
                              className="border-l-4 border-l-gray-300 transition-all hover:shadow-md cursor-pointer opacity-75"
                              onClick={() => handleEventClick(event.code)}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-lg">{event.name}</h4>
                                      <Badge variant={getEventTypeBadgeVariant(event.type)}>
                                        {getEventTypeLabel(event.type)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                          {formatDate(event.dateStart)}
                                          {event.dateStart !== event.dateEnd && (
                                            <> - {formatDate(event.dateEnd)}</>
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
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
                </CardContent>
              </Card>
            )
          })()}
        </div>

        {/* Scouting Notes Sidebar */}
        {showNotesSidebar && teamInfo && (
          <ScoutingTeamNotes
            teamNumber={currentTeamNumber}
            teamName={teamInfo.nameShort || teamInfo.nameFull}
            onClose={() => setShowNotesSidebar(false)}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export default function ScoutingTeamsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout
          pageTitle="Team Details"
          pageIcon={ClipboardList}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading team data...</span>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <ScoutingTeamsPageContent />
    </Suspense>
  )
}
