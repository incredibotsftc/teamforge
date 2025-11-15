'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, BarChart3, TrendingUp, Award, Trophy } from 'lucide-react'
import { PerformanceLineChart, ScoreBreakdownChart, EventComparisonChart } from '@/components/scouting/TeamMatchCharts'
import { TeamAwardsSection } from '@/components/scouting/TeamAwardsSection'
import { TeamMatchDetailsTable } from '@/components/scouting/TeamMatchDetailsTable'
import type { FTCMatch } from '@/lib/ftcEventsService'

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

interface TeamPerformanceTabsProps {
  matches: (FTCMatch & { eventName: string; eventCode: string; eventStart: string; eventEnd: string; eventCity: string; eventState: string })[]
  awards: FTCAward[]
  teamNumber: number
  season: number
}

export function TeamPerformanceTabs({ matches, awards, teamNumber, season }: TeamPerformanceTabsProps) {
  return (
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
          <PerformanceLineChart matches={matches} teamNumber={teamNumber} />
        </div>
      </TabsContent>

      <TabsContent value="breakdown" className="mt-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Score Breakdown by Phase</h3>
          <p className="text-sm text-muted-foreground">
            Stacked breakdown of Auto and Teleop+Endgame contributions to alliance score.
          </p>
          <ScoreBreakdownChart matches={matches} teamNumber={teamNumber} />
        </div>
      </TabsContent>

      <TabsContent value="events" className="mt-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Event Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Average alliance scores across all events attended this season.
          </p>
          <EventComparisonChart matches={matches} teamNumber={teamNumber} />
        </div>
      </TabsContent>

      <TabsContent value="awards" className="mt-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Awards & Recognitions</h3>
          <p className="text-sm text-muted-foreground">
            All awards earned by this team during the {season} season.
          </p>
          <TeamAwardsSection awards={awards} season={season} />
        </div>
      </TabsContent>

      <TabsContent value="details" className="mt-6">
        <TeamMatchDetailsTable matches={matches} teamNumber={teamNumber} />
      </TabsContent>
    </Tabs>
  )
}
