'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface MentoringHoursChartProps {
  data: Array<{ month: string; hours: number }>
}

const chartConfig = {
  hours: {
    label: "Hours",
    color: "var(--accent-color)",
  },
} satisfies ChartConfig

export function MentoringHoursChart({ data }: MentoringHoursChartProps) {
  // Format month for display (e.g., "2024-01" -> "Jan 24")
  const formattedData = data.map(item => {
    const [year, month] = item.month.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[parseInt(month) - 1]
    return {
      ...item,
      monthLabel: `${monthName} ${year.slice(2)}`
    }
  })

  if (formattedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-center text-muted-foreground">
        No mentoring hours logged yet
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart data={formattedData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="monthLabel"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${Number(value).toFixed(1)} hours`}
              labelKey="monthLabel"
            />
          }
        />
        <Bar
          dataKey="hours"
          fill="var(--color-hours)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
