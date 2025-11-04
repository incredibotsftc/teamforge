'use client'

import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { FTCMatch } from "@/lib/ftcEventsService"

interface TeamMatchChartsProps {
  matches: (FTCMatch & { eventName: string; eventCode: string; eventStart: string })[]
  teamNumber: number
}

// Calculate moving average
function calculateMovingAverage(data: number[], windowSize: number = 3): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2))
    const window = data.slice(start, end)
    const avg = window.reduce((a, b) => a + b, 0) / window.length
    result.push(avg)
  }
  return result
}

export function PerformanceLineChart({ matches, teamNumber }: TeamMatchChartsProps) {
  const chartConfig = {
    score: {
      label: "Alliance Score",
      color: "var(--accent-color)",
    },
    trend: {
      label: "Trend",
      color: "hsl(from var(--accent-color) h s l / 0.3)",
    },
  } satisfies ChartConfig

  // Process match data
  const chartData = matches.map((match, index) => {
    const teamData = match.teams?.find(t => t.teamNumber === teamNumber)
    const isRedAlliance = teamData?.station.startsWith('Red')
    const allianceScore = isRedAlliance ? match.scoreRedFinal : match.scoreBlueFinal
    const opponentScore = isRedAlliance ? match.scoreBlueFinal : match.scoreRedFinal

    const result = allianceScore !== null && opponentScore !== null
      ? allianceScore > opponentScore ? 'win' : allianceScore === opponentScore ? 'tie' : 'loss'
      : 'unknown'

    return {
      matchNumber: index + 1,
      score: allianceScore || 0,
      result,
      eventName: match.eventName,
      date: new Date(match.actualStartTime || match.startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      matchLabel: `${match.tournamentLevel === 'qual' ? 'Q' : 'P'}${match.matchNumber}`,
      trend: 0, // Will be calculated below
    }
  })

  // Calculate trend line
  const scores = chartData.map(d => d.score)
  const trendValues = calculateMovingAverage(scores, 5)
  chartData.forEach((d, i) => {
    d.trend = trendValues[i]
  })

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center text-muted-foreground">
        No match data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="matchNumber"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={{ value: 'Match Number', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => `Match ${value}`}
              formatter={(value, name, item) => {
                if (name === 'trend') return null
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Score:</span>
                      <span className="font-mono font-semibold">{value}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Result:</span>
                      <span className="font-semibold capitalize">{item.payload.result}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.payload.matchLabel} • {item.payload.eventName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.payload.date}
                    </div>
                  </div>
                )
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="trend"
          stroke="var(--color-trend)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-score)"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload, index } = props
            const colors = {
              win: 'hsl(from var(--accent-color) h s calc(l * 1.3))',
              loss: 'hsl(from var(--accent-color) h s calc(l * 0.7))',
              tie: 'hsl(from var(--accent-color) h calc(s * 0.5) l)',
              unknown: 'hsl(var(--muted-foreground))'
            }
            return (
              <circle
                key={`dot-${index}`}
                cx={cx}
                cy={cy}
                r={4}
                fill={colors[payload.result as keyof typeof colors]}
                stroke="white"
                strokeWidth={2}
              />
            )
          }}
        />
      </LineChart>
    </ChartContainer>
  )
}

export function ScoreBreakdownChart({ matches, teamNumber }: TeamMatchChartsProps) {
  const chartConfig = {
    auto: {
      label: "Auto",
      color: "hsl(from var(--accent-color) h s calc(l * 0.7))",
    },
    teleopEndgame: {
      label: "Teleop + Endgame",
      color: "var(--accent-color)",
    },
  } satisfies ChartConfig

  const chartData = matches.map((match, index) => {
    const teamData = match.teams?.find(t => t.teamNumber === teamNumber)
    const isRedAlliance = teamData?.station.startsWith('Red')

    const autoScore = isRedAlliance ? (match.scoreRedAuto || 0) : (match.scoreBlueAuto || 0)
    const finalScore = isRedAlliance ? (match.scoreRedFinal || 0) : (match.scoreBlueFinal || 0)

    // Calculate Teleop + Endgame as Final - Auto (API doesn't provide breakdown)
    const teleopEndgameScore = Math.max(0, finalScore - autoScore)

    return {
      matchNumber: index + 1,
      auto: autoScore,
      teleopEndgame: teleopEndgameScore,
      eventName: match.eventName,
    }
  })

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center text-muted-foreground">
        No match data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="matchNumber"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={{ value: 'Match Number', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => `Match ${value}`}
            />
          }
        />
        <Bar
          dataKey="auto"
          stackId="1"
          fill="var(--color-auto)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="teleopEndgame"
          stackId="1"
          fill="var(--color-teleopEndgame)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function EventComparisonChart({ matches, teamNumber }: TeamMatchChartsProps) {
  const chartConfig = {
    avgScore: {
      label: "Average Score",
      color: "var(--accent-color)",
    },
  } satisfies ChartConfig

  // Group matches by event and calculate averages
  const eventStats = matches.reduce((acc, match) => {
    const teamData = match.teams?.find(t => t.teamNumber === teamNumber)
    const isRedAlliance = teamData?.station.startsWith('Red')
    const score = isRedAlliance ? (match.scoreRedFinal || 0) : (match.scoreBlueFinal || 0)

    if (!acc[match.eventCode]) {
      acc[match.eventCode] = {
        eventName: match.eventName,
        eventCode: match.eventCode,
        scores: [],
        date: match.eventStart,
      }
    }
    acc[match.eventCode].scores.push(score)
    return acc
  }, {} as Record<string, { eventName: string; eventCode: string; scores: number[]; date: string }>)

  const chartData = Object.values(eventStats)
    .map(event => ({
      eventName: event.eventName.length > 25 ? event.eventName.substring(0, 25) + '...' : event.eventName,
      avgScore: Math.round(event.scores.reduce((a, b) => a + b, 0) / event.scores.length),
      matchCount: event.scores.length,
      date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center text-muted-foreground">
        No event data available
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="eventName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Avg Score:</span>
                    <span className="font-mono font-semibold">{value}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Matches:</span>
                    <span className="font-semibold">{item.payload.matchCount}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.payload.date}
                  </div>
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="avgScore"
          fill="var(--color-avgScore)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
