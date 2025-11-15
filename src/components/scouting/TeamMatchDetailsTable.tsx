'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { FTCMatch } from '@/lib/ftcEventsService'

interface TeamMatchDetailsTableProps {
  matches: (FTCMatch & { eventName: string; eventCode: string; eventStart: string; eventEnd: string; eventCity: string; eventState: string })[]
  teamNumber: number
}

export function TeamMatchDetailsTable({ matches, teamNumber }: TeamMatchDetailsTableProps) {
  return (
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
        {matches.map((match, index) => {
          const teamDataMatch = match.teams?.find(t => t.teamNumber === teamNumber)
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
  )
}
