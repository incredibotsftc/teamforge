"use client"

import { Pie, PieChart } from "recharts"
import type { Expense } from '@/types/budget'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface ExpensePieChartProps {
  expenses: Expense[]
}

export function ExpensePieChart({ expenses }: ExpensePieChartProps) {
  // Aggregate by category
  const aggregated = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = 0
    }
    acc[exp.category] += Number(exp.amount)
    return acc
  }, {} as Record<string, number>)

  const categories = Object.entries(aggregated)

  // Create chart config dynamically from categories with contrasting accent color variations
  const chartConfig: ChartConfig = categories.reduce((config, [category], index) => {
    const key = category.toLowerCase().replace(/\s+/g, '-')

    // Create contrasting variations by adjusting saturation and lightness
    // Keep the same hue to maintain accent color identity
    const totalColors = categories.length

    // Create a range of distinct shades from dark to medium-light (no white)
    // Distribute evenly across the lightness spectrum (40% to 70%)
    const lightnessStep = 30 / Math.max(totalColors - 1, 1)  // 70% - 40% = 30% range
    const lightness = 40 + (index * lightnessStep)

    // Vary saturation for more distinction (85% to 100%)
    const saturationStep = 15 / Math.max(totalColors - 1, 1)
    const saturation = 100 - (index * saturationStep)

    const colorVariation = `hsl(from var(--accent-color) h calc(s * ${saturation / 100}) calc(l * ${lightness / 50}))`

    config[key] = {
      label: category,
      color: colorVariation,
    }
    return config
  }, {} as ChartConfig)

  // Map to data format that matches chartConfig keys
  const data = categories.map(([category, amount]) => {
    const key = category.toLowerCase().replace(/\s+/g, '-')
    return {
      categoryKey: key,
      amount,
      fill: `var(--color-${key})`,
    }
  })

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[180px] text-center text-muted-foreground">No expenses to display.</div>
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={data}
          dataKey="amount"
          nameKey="categoryKey"
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
