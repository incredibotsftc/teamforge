'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { FTCMatch } from '@/lib/ftcEventsService'

interface TeamComparisonCardProps {
  teamNumber: number
  teamName: string
  schoolName?: string
  matches: FTCMatch[]
  onRemove: () => void
}

export function TeamComparisonCard({
  teamNumber,
  teamName,
  schoolName,
  matches,
  onRemove,
}: TeamComparisonCardProps) {
  // Calculate stats
  let wins = 0, losses = 0, ties = 0, totalScore = 0, scoredMatches = 0

  matches.forEach((match) => {
    const teamData = match.teams?.find(t => t.teamNumber === teamNumber)
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
    <div className="border rounded-lg p-4 relative">
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="mb-3">
        <h3 className="font-bold text-lg">{teamName}</h3>
        <p className="text-sm text-muted-foreground">#{teamNumber}</p>
        {schoolName && (
          <p className="text-xs text-muted-foreground mt-1">{schoolName}</p>
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
}
