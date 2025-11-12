'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { FTCMatch, FTCTeam } from '@/lib/ftcEventsService'

interface MatchDetailPanelProps {
  match: FTCMatch & { eventName?: string; matchLabel?: string; date?: string } | null
  teamNumber: number
  teamsLookup?: Map<number, FTCTeam>  // Pre-fetched team data
  className?: string
  showEmptyState?: boolean  // Whether to show "hover over a match" message when no match is selected
}

interface TeamDetails {
  teamNumber: number
  nameFull: string
  nameShort: string
  schoolName: string
  station: string
}

export function MatchDetailPanel({ match, teamNumber, teamsLookup, className = '', showEmptyState = false }: MatchDetailPanelProps) {
  // Process team data from pre-fetched lookup
  const { redTeams, blueTeams } = useMemo(() => {
    if (!match || !match.teams) {
      return { redTeams: [], blueTeams: [] }
    }

    const allTeamDetails: TeamDetails[] = match.teams.map((team) => {
      const teamData = teamsLookup?.get(team.teamNumber)

      // Use actual team name if available, otherwise show a placeholder
      const nameShort = teamData?.nameShort && teamData.nameShort !== `${team.teamNumber}`
        ? teamData.nameShort
        : teamData?.nameFull || `Team ${team.teamNumber}`

      // Determine team type: School-based or Community-based
      let schoolName = 'Community Team'
      if (teamData) {
        const hasSchoolName = teamData.schoolName &&
                             teamData.schoolName.trim() !== ''

        if (hasSchoolName) {
          schoolName = teamData.schoolName
        } else {
          // If no school name, it's a community-based team
          schoolName = 'Community Team'
        }
      }

      return {
        teamNumber: team.teamNumber,
        nameFull: teamData?.nameFull || `Team ${team.teamNumber}`,
        nameShort,
        schoolName,
        station: team.station,
      }
    })

    // Split into red and blue alliances and sort by station
    const red = allTeamDetails
      .filter(t => t.station.startsWith('Red'))
      .sort((a, b) => a.station.localeCompare(b.station))
    const blue = allTeamDetails
      .filter(t => t.station.startsWith('Blue'))
      .sort((a, b) => a.station.localeCompare(b.station))

    return { redTeams: red, blueTeams: blue }
  }, [match, teamsLookup])

  if (!match) {
    // Only show empty state card if showEmptyState is true
    if (showEmptyState) {
      return (
        <Card className={className}>
          <CardContent className="flex items-center justify-center h-full min-h-[400px] text-center">
            <p className="text-muted-foreground">Hover over a match to see details</p>
          </CardContent>
        </Card>
      )
    }
    // Otherwise return empty div (invisible)
    return <div className={className}></div>
  }

  const currentTeamStation = match.teams?.find(t => t.teamNumber === teamNumber)?.station
  const isOnRed = currentTeamStation?.startsWith('Red')
  const isOnBlue = currentTeamStation?.startsWith('Blue')

  const redScore = match.scoreRedFinal || 0
  const blueScore = match.scoreBlueFinal || 0
  const redWon = redScore > blueScore
  const blueWon = blueScore > redScore
  const tie = redScore === blueScore

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {match.matchLabel || `Match ${match.matchNumber}`}
          </CardTitle>
          <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
            {match.eventName && <span className="truncate">{match.eventName}</span>}
            {match.date && <span>• {match.date}</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Blue Alliance */}
        <div className={`space-y-2 rounded-lg border-2 p-2 ${isOnBlue ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-blue-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">Blue</Badge>
              {blueWon && <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 text-xs">Won</Badge>}
              {tie && <Badge variant="outline" className="text-xs">Tie</Badge>}
            </div>
            <div className="text-xl font-bold">{blueScore}</div>
          </div>
          <div className="space-y-1">
            {blueTeams.map((team) => (
              <TeamCard
                key={team.teamNumber}
                team={team}
                isHighlighted={team.teamNumber === teamNumber}
                allianceColor="blue"
              />
            ))}
          </div>
          <div className="flex justify-between pt-1 border-t text-xs">
            <span className="text-muted-foreground">Auto: <span className="font-semibold text-foreground">{match.scoreBlueAuto || 0}</span></span>
            <span className="text-muted-foreground">T+E: <span className="font-semibold text-foreground">{Math.max(0, blueScore - (match.scoreBlueAuto || 0))}</span></span>
          </div>
        </div>

        {/* Red Alliance */}
        <div className={`space-y-2 rounded-lg border-2 p-2 ${isOnRed ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-red-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Badge variant="default" className="bg-red-500 hover:bg-red-600 text-xs">Red</Badge>
              {redWon && <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 text-xs">Won</Badge>}
              {tie && <Badge variant="outline" className="text-xs">Tie</Badge>}
            </div>
            <div className="text-xl font-bold">{redScore}</div>
          </div>
          <div className="space-y-1">
            {redTeams.map((team) => (
              <TeamCard
                key={team.teamNumber}
                team={team}
                isHighlighted={team.teamNumber === teamNumber}
                allianceColor="red"
              />
            ))}
          </div>
          <div className="flex justify-between pt-1 border-t text-xs">
            <span className="text-muted-foreground">Auto: <span className="font-semibold text-foreground">{match.scoreRedAuto || 0}</span></span>
            <span className="text-muted-foreground">T+E: <span className="font-semibold text-foreground">{Math.max(0, redScore - (match.scoreRedAuto || 0))}</span></span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground italic">
          Note: Individual team scores not available from FTC API. Scores are alliance totals.
        </div>
      </CardContent>
    </Card>
  )
}

interface TeamCardProps {
  team: TeamDetails
  isHighlighted: boolean
  allianceColor: 'red' | 'blue'
}

function TeamCard({ team, isHighlighted, allianceColor }: TeamCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSeason = searchParams.get('season')

  const handleTeamClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const params = new URLSearchParams()
    params.set('teamNumber', team.teamNumber.toString())
    if (currentSeason) {
      params.set('season', currentSeason)
    }
    router.push(`/scouting/teams?${params.toString()}`)
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md p-2 cursor-pointer hover:bg-accent/70 transition-colors ${isHighlighted ? 'bg-accent ring-2 ring-accent-foreground/20' : 'bg-background/50'}`}
      onClick={handleTeamClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleTeamClick(e as unknown as React.MouseEvent)
        }
      }}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage
          src={`https://www.theorangealliance.org/api/team/${team.teamNumber}/avatar`}
          alt={`Team ${team.teamNumber}`}
        />
        <AvatarFallback className={`text-xs font-bold ${allianceColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'}`}>
          {team.teamNumber}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate hover:underline">
          {team.nameShort !== `${team.teamNumber}` && team.nameShort !== `Team ${team.teamNumber}`
            ? `${team.nameShort} (#${team.teamNumber})`
            : `Team #${team.teamNumber}`}
        </div>
      </div>
    </div>
  )
}
