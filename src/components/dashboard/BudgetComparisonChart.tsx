'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface BudgetComparisonChartProps {
  fundsRaised: number
  expenses: number
}

const chartConfig = {
  fundsRaised: {
    label: "Funds Raised",
    color: "hsl(from var(--accent-color) h s calc(l * 1.2))",
  },
  expenses: {
    label: "Expenses",
    color: "var(--accent-color)",
  },
  netBalance: {
    label: "Net Balance",
    color: "hsl(from var(--accent-color) h s calc(l * 0.7))",
  },
} satisfies ChartConfig

export function BudgetComparisonChart({ fundsRaised, expenses }: BudgetComparisonChartProps) {
  const data = [
    {
      category: 'Budget',
      fundsRaised,
      expenses,
      netBalance: fundsRaised - expenses
    }
  ]

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
          }
        />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ChartLegend content={ChartLegendContent as any} />
        <Bar
          dataKey="fundsRaised"
          fill="var(--color-fundsRaised)"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="expenses"
          fill="var(--color-expenses)"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="netBalance"
          fill="var(--color-netBalance)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
