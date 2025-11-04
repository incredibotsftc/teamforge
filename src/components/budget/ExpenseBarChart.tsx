"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { Expense } from '@/types/budget'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

interface ExpenseBarChartProps {
  expenses: Expense[]
}

// Helper function to parse date string as local date (avoids timezone issues)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Helper to format date as 'Month YYYY'
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
function getMonth(expense: Expense) {
  const date = parseLocalDate(expense.date)
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

const chartConfig = {
  expenses: {
    label: "Expenses",
    color: "var(--accent-color)",
  },
} satisfies ChartConfig

export function ExpenseBarChart({ expenses }: ExpenseBarChartProps) {
  // Aggregate expenses by month
  const monthly = expenses.reduce((acc, exp) => {
    const month = getMonth(exp)
    if (!acc[month]) acc[month] = 0
    acc[month] += Number(exp.amount)
    return acc
  }, {} as Record<string, number>)

  // Convert to array and sort by month
  const data = Object.entries(monthly)
    .map(([month, expenses]) => ({ month, expenses }))
    .sort((a, b) => {
      // Sort by year then month
      const [aMonth, aYear] = a.month.split(' ')
      const [bMonth, bYear] = b.month.split(' ')
      if (aYear !== bYear) return Number(aYear) - Number(bYear)
      return MONTHS.indexOf(aMonth) - MONTHS.indexOf(bMonth)
    })

  if (data.length === 0) {
    return <div className="text-center text-muted-foreground">No monthly data.</div>
  }

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
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
          dataKey="expenses"
          fill="var(--color-expenses)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
