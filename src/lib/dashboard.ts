import { supabase } from '@/lib/supabase'

/**
 * Dashboard helper functions for aggregating and calculating metrics
 */

// ==================== TASK METRICS ====================

export async function getTotalTasks(teamId: string, seasonId: string): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching total tasks:', error)
    return 0
  }

  return count || 0
}

export async function getTasksByStatus(teamId: string, seasonId: string): Promise<{
  todo: number
  in_progress: number
  done: number
  total: number
}> {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching tasks by status:', error)
    return { todo: 0, in_progress: 0, done: 0, total: 0 }
  }

  const statusCounts = data?.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return {
    todo: statusCounts.todo || 0,
    in_progress: statusCounts.in_progress || 0,
    done: statusCounts.done || 0,
    total: data?.length || 0
  }
}

export async function getTasksDueSoon(teamId: string, seasonId: string, days: number = 7) {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + days)

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      due_date,
      priority,
      status,
      assignee_ids
    `)
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(5)

  if (error) {
    console.error('Error fetching tasks due soon:', error)
    return []
  }

  // For each task, fetch the assignee names
  if (data && data.length > 0) {
    const enrichedData = await Promise.all(
      data.map(async (task) => {
        if (task.assignee_ids && task.assignee_ids.length > 0) {
          const { data: assignees } = await supabase
            .from('team_members')
            .select('first_name, last_name')
            .in('id', task.assignee_ids)

          return {
            ...task,
            assignees: assignees || []
          }
        }
        return {
          ...task,
          assignees: []
        }
      })
    )
    return enrichedData
  }

  return data || []
}

// ==================== BUDGET METRICS ====================

export async function getTotalExpenses(teamId: string, seasonId: string): Promise<number> {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching total expenses:', error)
    return 0
  }

  return data?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0
}

export async function getTotalFundsRaised(teamId: string, seasonId: string): Promise<number> {
  const { data, error } = await supabase
    .from('fundraising')
    .select('amount_received')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching total funds raised:', error)
    return 0
  }

  return data?.reduce((sum, item) => sum + Number(item.amount_received), 0) || 0
}

export async function getBudgetUtilization(teamId: string, seasonId: string): Promise<number> {
  const [expenses, funds] = await Promise.all([
    getTotalExpenses(teamId, seasonId),
    getTotalFundsRaised(teamId, seasonId)
  ])

  if (funds === 0) return 0
  return Math.round((expenses / funds) * 100)
}

export async function getFundraisingByStatus(teamId: string, seasonId: string) {
  const { data, error } = await supabase
    .from('fundraising')
    .select('status, amount_received, amount_committed, amount_requested')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching fundraising by status:', error)
    return []
  }

  // Group by status
  const grouped = data?.reduce((acc, item) => {
    const status = item.status
    if (!acc[status]) {
      acc[status] = {
        status,
        count: 0,
        received: 0,
        committed: 0
      }
    }
    acc[status].count++
    acc[status].received += Number(item.amount_received) || 0
    // For committed/received statuses, use amount_committed
    // For prospecting/pending, use amount_requested as a fallback
    acc[status].committed += Number(item.amount_committed) || Number(item.amount_requested) || 0
    return acc
  }, {} as Record<string, { status: string; count: number; received: number; committed: number }>) || {}

  return Object.values(grouped)
}

// ==================== EVENT METRICS ====================

export async function getUpcomingEvents(teamId: string, seasonId: string, limit: number = 7) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_type, start_date, start_time, location')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching upcoming events:', error)
    return []
  }

  return data || []
}

export async function getCompetitionCount(teamId: string, seasonId: string): Promise<number> {
  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .eq('event_type', 'competition')

  if (error) {
    console.error('Error fetching competition count:', error)
    return 0
  }

  return count || 0
}

export async function getUpcomingEventsCount(teamId: string, seasonId: string, days: number = 30): Promise<number> {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + days)

  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .gte('start_date', today.toISOString().split('T')[0])
    .lte('start_date', futureDate.toISOString().split('T')[0])

  if (error) {
    console.error('Error fetching upcoming events count:', error)
    return 0
  }

  return count || 0
}

// ==================== NOTEBOOK METRICS ====================

export async function getTotalNotebookPages(teamId: string, seasonId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notebook_pages')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching total notebook pages:', error)
    return 0
  }

  return count || 0
}

export async function getRecentNotebookUpdates(teamId: string, seasonId: string, limit: number = 5) {
  const { data, error } = await supabase
    .from('notebook_pages')
    .select(`
      id,
      title,
      updated_at,
      updated_by
    `)
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent notebook updates:', error)
    return []
  }

  // For each notebook page, fetch the team member info
  if (data && data.length > 0) {
    const enrichedData = await Promise.all(
      data.map(async (page) => {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('first_name, last_name')
          .eq('user_id', page.updated_by)
          .eq('team_id', teamId)
          .single()

        return {
          ...page,
          team_members: memberData
        }
      })
    )
    return enrichedData
  }

  return data || []
}

// ==================== MENTORING METRICS ====================

/**
 * Calculate hours between two time strings (HH:MM:SS format)
 */
function calculateHours(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0

  try {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startTotalMinutes = startHour * 60 + startMin
    const endTotalMinutes = endHour * 60 + endMin

    // Handle sessions that cross midnight
    let diffMinutes = endTotalMinutes - startTotalMinutes
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60
    }

    return diffMinutes / 60
  } catch (error) {
    console.error('Error calculating hours:', error)
    return 0
  }
}

export async function getTotalMentoringHours(teamId: string, seasonId: string): Promise<number> {
  const { data, error } = await supabase
    .from('mentoring_sessions')
    .select('start_time, end_time')
    .eq('mentor_team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching total mentoring hours:', error)
    return 0
  }

  return data?.reduce((sum, session) => {
    return sum + calculateHours(session.start_time, session.end_time)
  }, 0) || 0
}

export async function getMentoringHoursByMonth(teamId: string, seasonId: string) {
  const { data, error } = await supabase
    .from('mentoring_sessions')
    .select('session_date, start_time, end_time')
    .eq('mentor_team_id', teamId)
    .eq('season_id', seasonId)
    .order('session_date', { ascending: true })

  if (error) {
    console.error('Error fetching mentoring hours by month:', error)
    return []
  }

  // Group by month
  const monthlyData = data?.reduce((acc, session) => {
    if (!session.session_date) return acc

    const date = new Date(session.session_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        hours: 0
      }
    }

    const hours = calculateHours(session.start_time, session.end_time)
    acc[monthKey].hours += hours
    return acc
  }, {} as Record<string, { month: string; hours: number }>) || {}

  return Object.values(monthlyData)
}
