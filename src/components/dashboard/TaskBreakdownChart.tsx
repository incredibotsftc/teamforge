'use client'

import { Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface TaskBreakdownChartProps {
  todo: number
  in_progress: number
  done: number
}

const chartConfig = {
  todo: {
    label: "To Do",
    color: "hsl(from var(--accent-color) h s calc(l * 0.7))",
  },
  in_progress: {
    label: "In Progress",
    color: "var(--accent-color)",
  },
  done: {
    label: "Done",
    color: "hsl(from var(--accent-color) h s calc(l * 1.3))",
  },
} satisfies ChartConfig

export function TaskBreakdownChart({ todo, in_progress, done }: TaskBreakdownChartProps) {
  const data = [
    { category: 'todo', count: todo, fill: 'var(--color-todo)' },
    { category: 'in_progress', count: in_progress, fill: 'var(--color-in_progress)' },
    { category: 'done', count: done, fill: 'var(--color-done)' }
  ].filter(item => item.count > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-center text-muted-foreground">
        No tasks to display
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={data}
          dataKey="count"
          nameKey="category"
          innerRadius={40}
          outerRadius={65}
          cy={80}
        />
        <ChartLegend
          content={ChartLegendContent as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          verticalAlign="bottom"
          align="center"
        />
      </PieChart>
    </ChartContainer>
  )
}
