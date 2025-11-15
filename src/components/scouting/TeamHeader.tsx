'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { CardTitle, CardDescription } from '@/components/ui/card'
import { StickyNote, FileText, Trophy } from 'lucide-react'

interface TeamHeaderProps {
  teamNumber: number
  teamName: string
  schoolName?: string
  location?: string
  rookieYear?: number
  matchCount?: number
  season?: number
  onViewNotes: () => void
  onFillScoutingSheet: () => void
  variant?: 'mobile' | 'desktop'
}

export function TeamHeader({
  teamNumber,
  teamName,
  schoolName,
  location,
  rookieYear,
  matchCount,
  season,
  onViewNotes,
  onFillScoutingSheet,
  variant = 'desktop',
}: TeamHeaderProps) {
  if (variant === 'mobile') {
    return (
      <div className="pb-4 border-b">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-2xl font-bold">{teamName}</div>
              <div className="text-xl font-bold text-muted-foreground whitespace-nowrap">
                #{teamNumber}
              </div>
            </div>
            {schoolName && (
              <div className="text-sm text-muted-foreground mb-1">{schoolName}</div>
            )}
            {location && (
              <div className="text-xs text-muted-foreground mb-2">{location}</div>
            )}
            {rookieYear && (
              <div className="text-xs text-muted-foreground mb-2">
                Rookie: {rookieYear}
              </div>
            )}
            {matchCount !== undefined && season && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                {matchCount} matches for the {season} season
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-row gap-2 mt-3">
          <Button onClick={onViewNotes} className="btn-accent flex-1" size="sm">
            <span>Notes</span>
          </Button>
          <Button onClick={onFillScoutingSheet} variant="outline" size="sm" className="flex-1">
            <span>Scout</span>
          </Button>
        </div>
      </div>
    )
  }

  // Desktop variant
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex-1">
        <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">
          {teamName}
        </CardTitle>
        {schoolName && (
          <div className="text-sm text-muted-foreground mb-1">{schoolName}</div>
        )}
        {location && (
          <div className="text-xs text-muted-foreground mb-2">{location}</div>
        )}
        {rookieYear && (
          <div className="text-xs text-muted-foreground mb-2">
            Rookie: {rookieYear}
          </div>
        )}
        {matchCount !== undefined && season && (
          <CardDescription className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {matchCount} matches for the {season} season
          </CardDescription>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="text-xl sm:text-2xl font-bold text-muted-foreground whitespace-nowrap">
          #{teamNumber}
        </div>
        <div className="flex flex-row gap-2">
          <Button onClick={onViewNotes} className="btn-accent" size="sm">
            <StickyNote className="h-4 w-4 mr-2" />
            <span>View Notes</span>
          </Button>
          <Button onClick={onFillScoutingSheet} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            <span>Fill Scouting Sheet</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
