'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface FundraisingData {
  status: string
  count: number
  received: number
  committed: number
}

interface FundraisingPipelineChartProps {
  data: FundraisingData[]
}

const chartConfig = {
  prospecting: {
    label: "Prospecting",
    color: "hsl(from var(--accent-color) h s calc(l * 1.4))",
  },
  pending: {
    label: "Pending",
    color: "hsl(from var(--accent-color) h s calc(l * 1.2))",
  },
  committed: {
    label: "Committed",
    color: "var(--accent-color)",
  },
  received: {
    label: "Received",
    color: "hsl(from var(--accent-color) h s calc(l * 0.8))",
  },
  declined: {
    label: "Declined",
    color: "hsl(from var(--accent-color) h s calc(l * 0.6))",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(from var(--accent-color) h s calc(l * 0.5))",
  },
} satisfies ChartConfig

export function FundraisingPipelineChart({ data }: FundraisingPipelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-center text-muted-foreground">
        No fundraising data to display
      </div>
    )
  }

  // Map status to friendly names
  const statusNames: Record<string, string> = {
    'prospecting': 'Prospecting',
    'pending': 'Pending',
    'committed': 'Committed',
    'received': 'Received',
    'declined': 'Declined',
    'cancelled': 'Cancelled'
  }

  // Color mapping based on status
  const statusColors: Record<string, string> = {
    'prospecting': 'var(--color-prospecting)',
    'pending': 'var(--color-pending)',
    'committed': 'var(--color-committed)',
    'received': 'var(--color-received)',
    'declined': 'var(--color-declined)',
    'cancelled': 'var(--color-cancelled)',
  }

  // For each status, show the total amount (committed + received) with its color
  const chartData = data.map(item => ({
    status: statusNames[item.status] || item.status,
    amount: item.committed + item.received,
    fill: statusColors[item.status] || 'var(--accent-color)',
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="status"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          width={50}
        />
        <ChartTooltip
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar
          dataKey="amount"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ChartContainer>
  )
}
