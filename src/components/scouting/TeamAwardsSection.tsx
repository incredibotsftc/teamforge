'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award } from 'lucide-react'

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

interface TeamAwardsSectionProps {
  awards: FTCAward[]
  season: number
}

export function TeamAwardsSection({ awards, season }: TeamAwardsSectionProps) {
  if (awards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Award className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Awards Yet</h3>
        <p className="text-muted-foreground">
          This team has not won any awards in the {season} season.
        </p>
      </div>
    )
  }

  const awardsByEvent = awards.reduce((acc, award) => {
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

  return (
    <div className="space-y-4 mt-4">
      {Object.entries(awardsByEvent).map(([eventCode, eventData]) => (
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
      ))}
    </div>
  )
}
