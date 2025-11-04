'use client'

import { useState, useEffect } from 'react'
import { useTeamData } from './useTeamData'
import { useAppData } from '@/components/AppDataProvider'
import {
  getTasksByStatus,
  getTotalExpenses,
  getTotalFundsRaised,
  getBudgetUtilization,
  getCompetitionCount,
  getUpcomingEventsCount,
  getTotalNotebookPages,
  getTotalMentoringHours
} from '@/lib/dashboard'

interface DashboardStats {
  teamMembers: number
  totalTasks: number
  tasksCompleted: number
  tasksProgress: number
  totalExpenses: number
  totalFundsRaised: number
  budgetUtilization: number
  upcomingEvents: number
  competitions: number
  notebookPages: number
  mentoringHours: number
}

interface UseDashboardStatsReturn {
  stats: DashboardStats
  loading: boolean
  error: string | null
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const { team, teamMembers } = useTeamData()
  const { currentSeason } = useAppData()
  const [stats, setStats] = useState<DashboardStats>({
    teamMembers: 0,
    totalTasks: 0,
    tasksCompleted: 0,
    tasksProgress: 0,
    totalExpenses: 0,
    totalFundsRaised: 0,
    budgetUtilization: 0,
    upcomingEvents: 0,
    competitions: 0,
    notebookPages: 0,
    mentoringHours: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (!team?.id || !currentSeason?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch all stats in parallel
        const [
          tasksByStatus,
          expenses,
          fundsRaised,
          budgetUtil,
          upcomingEventsCount,
          competitionsCount,
          notebookPagesCount,
          mentoringHours
        ] = await Promise.all([
          getTasksByStatus(team.id, currentSeason.id),
          getTotalExpenses(team.id, currentSeason.id),
          getTotalFundsRaised(team.id, currentSeason.id),
          getBudgetUtilization(team.id, currentSeason.id),
          getUpcomingEventsCount(team.id, currentSeason.id, 30),
          getCompetitionCount(team.id, currentSeason.id),
          getTotalNotebookPages(team.id, currentSeason.id),
          getTotalMentoringHours(team.id, currentSeason.id)
        ])

        const tasksProgress = tasksByStatus.total > 0
          ? Math.round((tasksByStatus.done / tasksByStatus.total) * 100)
          : 0

        const calculatedStats: DashboardStats = {
          teamMembers: teamMembers.length,
          totalTasks: tasksByStatus.total,
          tasksCompleted: tasksByStatus.done,
          tasksProgress,
          totalExpenses: expenses,
          totalFundsRaised: fundsRaised,
          budgetUtilization: budgetUtil,
          upcomingEvents: upcomingEventsCount,
          competitions: competitionsCount,
          notebookPages: notebookPagesCount,
          mentoringHours: mentoringHours
        }

        setStats(calculatedStats)
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [team?.id, currentSeason?.id, teamMembers.length])

  return {
    stats,
    loading,
    error
  }
}
