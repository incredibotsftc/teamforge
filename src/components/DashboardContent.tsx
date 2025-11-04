"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAppData } from '@/components/AppDataProvider'
import { useTeamData } from '@/hooks/useTeamData'
import {
  Users,
  DollarSign,
  CheckSquare,
  Trophy,
  Calendar,
  BookOpen,
  Clock
} from 'lucide-react'
import { BudgetComparisonChart } from './dashboard/BudgetComparisonChart'
import { FundraisingPipelineChart } from './dashboard/FundraisingPipelineChart'
import { TaskBreakdownChart } from './dashboard/TaskBreakdownChart'
import { MentoringHoursChart } from './dashboard/MentoringHoursChart'
import { UpcomingEventsList } from './dashboard/UpcomingEventsList'
import { TasksDueSoonList } from './dashboard/TasksDueSoonList'
import { RecentNotebookList } from './dashboard/RecentNotebookList'
import {
  getTasksByStatus,
  getTasksDueSoon,
  getFundraisingByStatus,
  getUpcomingEvents,
  getRecentNotebookUpdates,
  getMentoringHoursByMonth
} from '@/lib/dashboard'

interface DashboardStat {
  title: string
  value: string
  subtitle: string | null
  icon: React.ComponentType<{ className?: string }>
  progress?: number
}

export function DashboardContent() {
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats()
  const { team } = useTeamData()
  const { currentSeason } = useAppData()

  // State for additional data
  const [tasksDueSoon, setTasksDueSoon] = useState<Array<{ id: string; title: string; due_date: string; priority?: string; status: string; assignees?: Array<{ first_name: string; last_name: string }> }>>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{ id: string; title: string; event_type: string; start_date: string; start_time?: string; location?: string }>>([])
  const [recentNotebook, setRecentNotebook] = useState<Array<{ id: string; title: string; updated_at: string; updated_by: string; team_members?: { first_name: string; last_name: string } }>>([])
  const [fundraisingData, setFundraisingData] = useState<Array<{ status: string; count: number; received: number; committed: number }>>([])
  const [taskStatusData, setTaskStatusData] = useState({ todo: 0, in_progress: 0, done: 0, total: 0 })
  const [mentoringHoursData, setMentoringHoursData] = useState<Array<{ month: string; hours: number }>>([])


  useEffect(() => {
    const loadAdditionalData = async () => {
      if (!team?.id || !currentSeason?.id) return

      try {
        const [tasks, events, notebook, fundraising, taskStatus, mentoringHours] = await Promise.all([
          getTasksDueSoon(team.id, currentSeason.id, 7),
          getUpcomingEvents(team.id, currentSeason.id, 7),
          getRecentNotebookUpdates(team.id, currentSeason.id, 5),
          getFundraisingByStatus(team.id, currentSeason.id),
          getTasksByStatus(team.id, currentSeason.id),
          getMentoringHoursByMonth(team.id, currentSeason.id)
        ])

        setTasksDueSoon(tasks)
        setUpcomingEvents(events)
        setRecentNotebook(notebook)
        setFundraisingData(fundraising)
        setTaskStatusData(taskStatus)
        setMentoringHoursData(mentoringHours)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    loadAdditionalData()
  }, [team?.id, currentSeason?.id])

  const stats: DashboardStat[] = [
    {
      title: 'Team Members',
      value: statsLoading ? '...' : dashboardStats.teamMembers.toString(),
      subtitle: team ? `${team.team_name}` : 'Loading...',
      icon: Users,
    },
    {
      title: 'Total Tasks',
      value: statsLoading ? '...' : dashboardStats.totalTasks.toString(),
      subtitle: `${dashboardStats.tasksCompleted} completed`,
      icon: CheckSquare,
    },
    {
      title: 'Tasks Progress',
      value: statsLoading ? '...' : `${dashboardStats.tasksProgress}%`,
      subtitle: null,
      icon: CheckSquare,
      progress: dashboardStats.tasksProgress,
    },
    {
      title: 'Budget Utilization',
      value: statsLoading ? '...' : `${dashboardStats.budgetUtilization}%`,
      subtitle: `$${dashboardStats.totalFundsRaised.toLocaleString()} raised`,
      icon: DollarSign,
      progress: dashboardStats.budgetUtilization,
    },
    {
      title: 'Upcoming Events',
      value: statsLoading ? '...' : dashboardStats.upcomingEvents.toString(),
      subtitle: 'Next 30 days',
      icon: Calendar,
    },
    {
      title: 'Competitions',
      value: statsLoading ? '...' : dashboardStats.competitions.toString(),
      subtitle: 'This season',
      icon: Trophy,
    },
    {
      title: 'Notebook Pages',
      value: statsLoading ? '...' : dashboardStats.notebookPages.toString(),
      subtitle: 'This season',
      icon: BookOpen,
    },
    {
      title: 'Mentoring Hours',
      value: statsLoading ? '...' : dashboardStats.mentoringHours.toFixed(1),
      subtitle: 'Total hours logged',
      icon: Clock,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="@container/card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-0 pb-0">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0 pb-0">
                <div className="text-3xl font-bold tabular-nums @[250px]/card:text-4xl">{stat.value}</div>
                {stat.progress !== undefined && (
                  <div className="mt-1">
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${stat.progress}%`,
                          backgroundColor: 'var(--accent-color)'
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Budget Comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Budget Comparison</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <BudgetComparisonChart
                fundsRaised={dashboardStats.totalFundsRaised}
                expenses={dashboardStats.totalExpenses}
              />
            </CardContent>
          </Card>

          {/* Fundraising Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Fundraising Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <FundraisingPipelineChart data={fundraisingData} />
            </CardContent>
          </Card>

          {/* Task Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Task Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <TaskBreakdownChart
                todo={taskStatusData.todo}
                in_progress={taskStatusData.in_progress}
                done={taskStatusData.done}
              />
            </CardContent>
          </Card>

          {/* Mentoring Hours Over Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Mentoring Hours by Month</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <MentoringHoursChart data={mentoringHoursData} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <UpcomingEventsList events={upcomingEvents} />
          </CardContent>
        </Card>

        {/* Tasks Due Soon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Tasks Due Soon</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TasksDueSoonList tasks={tasksDueSoon} />
          </CardContent>
        </Card>

        {/* Recent Notebook Updates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Recent Notebook Updates</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RecentNotebookList pages={recentNotebook} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}