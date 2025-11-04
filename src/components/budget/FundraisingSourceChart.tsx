'use client'

import { Pie, PieChart } from "recharts"
import type { Fundraising } from '@/types/fundraising'
import { fundraisingSourceTypes } from '@/types/fundraising'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface FundraisingSourceChartProps {
  fundraising: Fundraising[]
}

export function FundraisingSourceChart({ fundraising }: FundraisingSourceChartProps) {
  // Group by source type - include both committed and received amounts
  const sourceData = fundraising.reduce((acc, item) => {
    const sourceType = item.source_type
    const totalAmount = Number(item.amount_received) + Number(item.amount_committed || 0)
    const existing = acc.find(d => d.name === sourceType)
    if (existing) {
      existing.value += totalAmount
    } else {
      acc.push({
        name: sourceType,
        value: totalAmount
      })
    }
    return acc
  }, [] as Array<{ name: string; value: number }>)

  // Create chart config dynamically from source types with contrasting accent color variations
  const chartConfig: ChartConfig = sourceData.reduce((config, item, index) => {
    const key = item.name.replace(/_/g, '-')
    const sourceTypeName = fundraisingSourceTypes.find(s => s.id === item.name)?.name || item.name

    // Create contrasting variations by adjusting saturation and lightness
    // Keep the same hue to maintain accent color identity
    const totalColors = sourceData.length

    // Create a range of distinct shades from dark to medium-light (no white)
    // Distribute evenly across the lightness spectrum (40% to 70%)
    const lightnessStep = 30 / Math.max(totalColors - 1, 1)  // 70% - 40% = 30% range
    const lightness = 40 + (index * lightnessStep)

    // Vary saturation for more distinction (85% to 100%)
    const saturationStep = 15 / Math.max(totalColors - 1, 1)
    const saturation = 100 - (index * saturationStep)

    const colorVariation = `hsl(from var(--accent-color) h calc(s * ${saturation / 100}) calc(l * ${lightness / 50}))`

    config[key] = {
      label: sourceTypeName,
      color: colorVariation,
    }
    return config
  }, {} as ChartConfig)

  // Map to data format that matches chartConfig keys
  const data = sourceData
    .map(item => {
      const key = item.name.replace(/_/g, '-')
      return {
        sourceType: key,
        amount: item.value,
        fill: `var(--color-${key})`,
      }
    })
    .filter(item => item.amount > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-center text-muted-foreground">No fundraising data to display.</div>
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
          dataKey="amount"
          nameKey="sourceType"
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
