'use client'

import React from 'react'

interface TeamStatsProps {
  totalMatches: number
  wins: number
  losses: number
  ties: number
  winRate: string
  avgScore: number
  improvement: string
  isImproving: boolean
  variant?: 'mobile' | 'desktop'
}

export function TeamStats({
  totalMatches,
  wins,
  losses,
  ties,
  winRate,
  avgScore,
  improvement,
  isImproving,
  variant = 'desktop',
}: TeamStatsProps) {
  const gridClass = variant === 'mobile' ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-2 md:grid-cols-4 gap-4'

  return (
    <div className={gridClass}>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Total Matches</p>
        <p className="text-2xl font-bold">{totalMatches}</p>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Win Rate</p>
        <p className="text-2xl font-bold">{winRate}%</p>
        <p className="text-xs text-muted-foreground">{wins}W - {losses}L - {ties}T</p>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Avg Score</p>
        <p className="text-2xl font-bold">{avgScore}</p>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">Improvement</p>
        <p className={`text-2xl font-bold ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
          {isImproving ? '+' : ''}{improvement}%
        </p>
        <p className="text-xs text-muted-foreground">vs first half</p>
      </div>
    </div>
  )
}
