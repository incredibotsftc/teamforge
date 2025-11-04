"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Users, Trash, Edit, Plus, Calendar as CalendarIcon, FileText, CalendarDays, Clock } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { EntityNotebookSidebar } from '@/components/notebook/EntityNotebookSidebar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// DB row types
interface TeamRow {
  id: string
  team_name: string
  team_number: number | null
  mentoring_since?: number | null
}

interface SessionRow {
  id: string
  team_id: string | null
  mentored_team_id: string | null
  session_date: string | null
  start_time: string | null
  end_time: string | null
  attendees: string[] | null
}

interface TeamStats {
  sessionCount: number
  totalHours: number
  lastSessionDate: string | null
  monthlyData: Array<{ month: string; sessions: number; hours: number }>
}

function formatTime(timeStr: string) {
  if (!timeStr) return 'TBD'
  try {
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m || 0, 0, 0)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return timeStr
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'TBD'
  try {
    // Parse YYYY-MM-DD without timezone conversion
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "var(--accent-color)",
  },
  hours: {
    label: "Hours",
    color: "hsl(from var(--accent-color) h s calc(l * 0.7))",
  },
} satisfies ChartConfig

function calculateDuration(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return 'TBD'

  try {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startTotalMinutes = startHour * 60 + startMin
    const endTotalMinutes = endHour * 60 + endMin

    let diffMinutes = endTotalMinutes - startTotalMinutes
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60 // Handle sessions that cross midnight
    }

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    }

    return `${hours}h ${minutes}m`
  } catch {
    return 'TBD'
  }
}

export default function MentoringPage() {
  const { user } = useAuth()
  const { team, teamMembers, currentSeason } = useAppData()
  const [mentoredTeams, setMentoredTeams] = useState<Array<{ id: string; name: string; number?: number; mentoring_since?: number }>>([])
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({})
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teamSessions, setTeamSessions] = useState<SessionRow[]>([])
  const [hasAutoSelected, setHasAutoSelected] = useState(false)


  // Add/Edit Team dialog state
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamNumber, setNewTeamNumber] = useState('')
  const [newTeamMentoringSince, setNewTeamMentoringSince] = useState('')

  // Add Session dialog state
  const [showAddSession, setShowAddSession] = useState(false)
  const [sessionTeamId, setSessionTeamId] = useState<string>('')
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined)
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [addDatePickerOpen, setAddDatePickerOpen] = useState(false)

  // Edit Session dialog state
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null)
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editAttendees, setEditAttendees] = useState<string[]>([])
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; teamId: string | null } | null>(null)

  // Notebook sidebar state
  const [isNotebookOpen, setIsNotebookOpen] = useState(false)
  const [notebookSessionId, setNotebookSessionId] = useState<string | null>(null)
  const [notebookSessionTitle, setNotebookSessionTitle] = useState('')

  // Load team statistics
  const loadTeamStats = useCallback(async (teamIds: string[]) => {
    if (teamIds.length === 0) return

    try {
      // Fetch all sessions for these teams
      const { data: sessions, error } = await supabase
        .from('mentoring_sessions')
        .select('mentored_team_id, session_date, start_time, end_time')
        .in('mentored_team_id', teamIds)
        .eq('season_id', currentSeason!.id)

      if (error) {
        console.error('Failed to load team stats:', error)
      }

      if (!sessions) return

      // Calculate statistics for each team
      const stats: Record<string, TeamStats> = {}

      for (const teamId of teamIds) {
        const teamSessions = sessions.filter(s => s.mentored_team_id === teamId)

        let totalHours = 0
        let lastDate: string | null = null
        const monthlyMap: Record<string, { sessions: number; hours: number }> = {}

        for (const session of teamSessions) {
          // Calculate hours
          let sessionHours = 0
          if (session.start_time && session.end_time) {
            const [startHour, startMin] = session.start_time.split(':').map(Number)
            const [endHour, endMin] = session.end_time.split(':').map(Number)
            const startMinutes = startHour * 60 + startMin
            const endMinutes = endHour * 60 + endMin
            sessionHours = (endMinutes - startMinutes) / 60
            totalHours += sessionHours
          }

          // Track latest session date
          if (session.session_date) {
            if (!lastDate || session.session_date > lastDate) {
              lastDate = session.session_date
            }

            // Group by month for chart data
            const date = new Date(session.session_date + 'T00:00:00')
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            if (!monthlyMap[monthKey]) {
              monthlyMap[monthKey] = { sessions: 0, hours: 0 }
            }
            monthlyMap[monthKey].sessions += 1
            monthlyMap[monthKey].hours += sessionHours
          }
        }

        // Convert monthly map to sorted array
        const monthlyData = Object.entries(monthlyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6) // Last 6 months
          .map(([monthKey, data]) => {
            const [year, month] = monthKey.split('-')
            const date = new Date(parseInt(year), parseInt(month) - 1)
            const monthName = date.toLocaleDateString('en-US', { month: 'short' })
            return {
              month: monthName,
              sessions: data.sessions,
              hours: Math.round(data.hours * 10) / 10
            }
          })

        stats[teamId] = {
          sessionCount: teamSessions.length,
          totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
          lastSessionDate: lastDate,
          monthlyData
        }
      }

      setTeamStats(stats)
    } catch (error) {
      console.error('Failed to load team stats', error)
    }
  }, [currentSeason])

  // Load teams on mount
  useEffect(() => {
    let mounted = true

    async function loadTeams() {
      if (!team?.id || !currentSeason?.id) return

      const teamsResp = await supabase
        .from('mentoring_teams')
        .select('id, team_name, team_number, mentoring_since')
        .eq('mentor_team_id', team.id)
        .eq('season_id', currentSeason.id)
        .order('team_number')
      const teamsData = teamsResp.data as TeamRow[] | null
      const teamsError = teamsResp.error

      if (teamsError) console.error('Failed to load teams', teamsError)
      if (mounted && teamsData) {
        const teams = teamsData.map((t) => ({
          id: t.id,
          name: t.team_name,
          number: t.team_number || undefined,
          mentoring_since: t.mentoring_since || undefined
        }))
        setMentoredTeams(teams)

        // Auto-select first team if not already selected
        if (teams.length > 0 && !hasAutoSelected) {
          setSelectedTeamId(teams[0].id)
          setHasAutoSelected(true)
        }

        // Load statistics for all teams
        loadTeamStats(teams.map(t => t.id))
      }
    }

    loadTeams()
    return () => { mounted = false }
  }, [team?.id, currentSeason?.id, loadTeamStats, hasAutoSelected])

  // Load sessions when team is selected
  useEffect(() => {
    if (!selectedTeamId) {
      setTeamSessions([])
      return
    }

    let mounted = true

    async function loadSessions() {
      if (!currentSeason?.id) return

      const sess = await supabase
        .from('mentoring_sessions')
        .select('*')
        .eq('mentored_team_id', selectedTeamId)
        .eq('season_id', currentSeason.id)
        .order('session_date', { ascending: false })
        .limit(200)

      if (sess.error) {
        console.error('Error loading sessions:', sess.error)
      }

      if (mounted && sess.data) {
        setTeamSessions(sess.data as SessionRow[])
      }
    }

    loadSessions()
    return () => { mounted = false }
  }, [selectedTeamId, currentSeason?.id])

  const handleAddSession = async () => {
    if (!sessionTeamId || !scheduleDate || !user) {
      alert('Please select a team and date')
      return
    }

    const selectedTeam = mentoredTeams.find(t => t.id === sessionTeamId)
    if (!selectedTeam) return

    try {
      // Convert Date to YYYY-MM-DD format (timezone-safe)
      const year = scheduleDate.getFullYear()
      const month = String(scheduleDate.getMonth() + 1).padStart(2, '0')
      const day = String(scheduleDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // Insert session
      const { error: sessionError } = await supabase
        .from('mentoring_sessions')
        .insert([{
          mentored_team_id: sessionTeamId,
          mentor_team_id: team!.id,
          season_id: currentSeason!.id,
          session_date: dateStr,
          start_time: scheduleStart || null,
          end_time: scheduleEnd || null,
          attendees: selectedAttendees
        }])

      if (sessionError) {
        console.error('Failed to insert session', sessionError)
        alert(`Failed to create session: ${sessionError.message}`)
        return
      }

      // Auto-select the team
      setSelectedTeamId(sessionTeamId)

      // Reload sessions for the selected team
      if (currentSeason?.id) {
        const { data: sessions } = await supabase
          .from('mentoring_sessions')
          .select('*')
          .eq('mentored_team_id', sessionTeamId)
          .eq('season_id', currentSeason.id)
          .order('session_date', { ascending: false })
          .limit(200)

        if (sessions) {
          setTeamSessions(sessions as SessionRow[])
        }
      }

      // Reload stats for the team
      loadTeamStats([sessionTeamId])

      // Clear form
      setSessionTeamId('')
      setScheduleDate(undefined)
      setScheduleStart('')
      setScheduleEnd('')
      setSelectedAttendees([])
      setShowAddSession(false)
    } catch (err) {
      console.error('Error creating session', err)
      alert('Failed to create session')
    }
  }

  const handleEditSession = async () => {
    if (!editingSession || !editDate || !user) {
      alert('Please fill in required fields')
      return
    }

    try {
      // Convert Date to YYYY-MM-DD format (timezone-safe)
      const year = editDate.getFullYear()
      const month = String(editDate.getMonth() + 1).padStart(2, '0')
      const day = String(editDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // Update session
      const { error: updateError } = await supabase
        .from('mentoring_sessions')
        .update({
          session_date: dateStr,
          start_time: editStart || null,
          end_time: editEnd || null,
          attendees: editAttendees
        })
        .eq('id', editingSession.id)

      if (updateError) {
        console.error('Failed to update session', updateError)
        alert(`Failed to update session: ${updateError.message}`)
        return
      }

      // Update local state
      setTeamSessions((s) => s.map(sess => sess.id === editingSession.id ? {
        ...sess,
        session_date: dateStr,
        start_time: editStart || null,
        end_time: editEnd || null,
        attendees: editAttendees
      } : sess))

      // Reload stats for the team
      if (editingSession.team_id) {
        loadTeamStats([editingSession.team_id])
      }

      // Close sheet
      setEditingSession(null)
    } catch (err) {
      console.error('Error updating session', err)
      alert('Failed to update session')
    }
  }

  const openDeleteDialog = (sessionId: string, teamId: string | null) => {
    setSessionToDelete({ id: sessionId, teamId })
    setDeleteDialogOpen(true)
  }

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return

    try {
      const { error } = await supabase
        .from('mentoring_sessions')
        .delete()
        .eq('id', sessionToDelete.id)

      if (error) {
        console.error('Failed to delete session', error)
        alert('Failed to delete session')
        return
      }

      setTeamSessions((s) => s.filter((ss) => ss.id !== sessionToDelete.id))

      // Reload stats for the team
      if (sessionToDelete.teamId) {
        loadTeamStats([sessionToDelete.teamId])
      }

      // Close dialog
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    } catch (err) {
      console.error('Error deleting session', err)
      alert('Failed to delete session')
    }
  }

  const openEditDialog = (session: SessionRow) => {
    setEditingSession(session)
    setEditDate(session.session_date ? new Date(session.session_date) : undefined)
    setEditStart(session.start_time || '')
    setEditEnd(session.end_time || '')
    setEditAttendees(session.attendees || [])
  }

  const openNotebook = (session: SessionRow) => {
    // Create a title for the session notebook
    // Get team name from mentoredTeams array using mentored_team_id
    const team = mentoredTeams.find(t => t.id === session.mentored_team_id)
    const title = team
      ? `${team.name} - ${formatDate(session.session_date)}`
      : `Session - ${formatDate(session.session_date)}`
    setNotebookSessionId(session.id)
    setNotebookSessionTitle(title)
    setIsNotebookOpen(true)
  }

  const openTeamDialog = (team?: { id: string; name: string; number?: number; mentoring_since?: number }) => {
    if (team) {
      // Edit mode
      setEditingTeamId(team.id)
      setNewTeamName(team.name)
      setNewTeamNumber(team.number?.toString() || '')
      setNewTeamMentoringSince(team.mentoring_since?.toString() || '')
    } else {
      // Add mode
      setEditingTeamId(null)
      setNewTeamName('')
      setNewTeamNumber('')
      setNewTeamMentoringSince('')
    }
    setShowTeamDialog(true)
  }

  const handleSaveTeam = async () => {
    if (!user) {
      alert('You must be logged in to save a team')
      return
    }

    const num = parseInt(newTeamNumber) || Math.floor(Math.random() * 9000) + 100
    const teamName = newTeamName || `Team ${num}`
    const mentoringSince = newTeamMentoringSince ? parseInt(newTeamMentoringSince) : null

    try {
      if (editingTeamId) {
        // Update existing team
        const { error } = await supabase
          .from('mentoring_teams')
          .update({
            team_number: num,
            team_name: teamName,
            mentoring_since: mentoringSince
          })
          .eq('id', editingTeamId)

        if (error) {
          console.error('Failed to update team', error)
          alert(`Failed to update team: ${error.message}`)
        } else {
          setMentoredTeams((s) => s.map(t => t.id === editingTeamId ? {
            ...t,
            name: teamName,
            number: num,
            mentoring_since: mentoringSince || undefined
          } : t))
          alert('Team updated successfully!')
        }
      } else {
        // Create new team
        const { data, error } = await supabase
          .from('mentoring_teams')
          .insert([{
            team_number: num,
            team_name: teamName,
            mentor_team_id: team!.id,
            season_id: currentSeason!.id,
            mentor_id: user.id,
            mentoring_since: mentoringSince
          }])
          .select()
          .single()

        if (error) {
          console.error('Failed to create team', error)
          alert(`Failed to create team: ${error.message}`)
        } else if (data) {
          setMentoredTeams((s) => [...s, {
            id: data.id,
            name: data.team_name,
            number: data.team_number,
            mentoring_since: data.mentoring_since || undefined
          }])
        }
      }

      // Close dialog and reset form
      setShowTeamDialog(false)
      setEditingTeamId(null)
      setNewTeamName('')
      setNewTeamNumber('')
      setNewTeamMentoringSince('')
    } catch (err) {
      console.error('Error saving team', err)
      alert('Failed to save team')
    }
  }

  const selectedTeam = mentoredTeams.find(t => t.id === selectedTeamId)

  // Action buttons for the top navigation
  const actionButtons = (
    <div className="flex items-center gap-2">
      <Button className="btn-accent" size="sm" onClick={() => openTeamDialog()}>
        <Plus className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Add Mentee Team</span>
        <span className="sm:hidden">Mentee</span>
      </Button>

      {mentoredTeams.length > 0 && (
        <Button
          variant="default"
          size="sm"
          className="btn-accent"
          onClick={() => {
            // Set default team to currently selected team, or first team if none selected
            if (selectedTeamId) {
              setSessionTeamId(selectedTeamId)
            } else if (mentoredTeams.length > 0) {
              setSessionTeamId(mentoredTeams[0].id)
            }
            setShowAddSession(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Session</span>
          <span className="sm:hidden">Session</span>
        </Button>
      )}
    </div>
  )

  return (
    <DashboardLayout pageTitle="Mentoring" pageIcon={Users} actions={actionButtons}>
      <div className="space-y-4">
        {mentoredTeams.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">No teams yet. Click &ldquo;Add Mentee Team&rdquo; to create one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left: Teams Table */}
            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Mentored Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentoredTeams.map((t) => {
                      const stats = teamStats[t.id]
                      return (
                        <TableRow
                          key={t.id}
                          className={`cursor-pointer ${
                            selectedTeamId === t.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedTeamId(t.id)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{t.name}</span>
                              <span className="text-xs text-muted-foreground">#{t.number}</span>
                              {t.mentoring_since && (
                                <span className="text-xs text-muted-foreground">Since {t.mentoring_since}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">{stats?.sessionCount || 0}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openTeamDialog(t)
                              }}
                              title="Edit team"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right: Stats and Chart */}
            {selectedTeamId && selectedTeam && (
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {selectedTeam.name} - Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const stats = teamStats[selectedTeamId]
                    if (!stats) {
                      return (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No session data yet
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-6">
                        {/* Key Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-3xl font-bold text-primary">{stats.sessionCount}</div>
                            <div className="text-sm text-muted-foreground">Sessions</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-3xl font-bold text-primary">{stats.totalHours}h</div>
                            <div className="text-sm text-muted-foreground">Total Hours</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-sm font-semibold text-foreground">
                              {stats.lastSessionDate ? formatDate(stats.lastSessionDate).split(',')[0] : 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Last Session</div>
                          </div>
                        </div>

                        {/* Chart */}
                        {stats.monthlyData && stats.monthlyData.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Activity (Last 6 Months)</h4>
                            <ChartContainer config={chartConfig} className="h-[200px] w-full">
                              <BarChart data={stats.monthlyData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                  dataKey="month"
                                  tickLine={false}
                                  tickMargin={5}
                                  axisLine={false}
                                />
                                <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  width={30}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar
                                  dataKey="sessions"
                                  fill="var(--color-sessions)"
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                  dataKey="hours"
                                  fill="var(--color-hours)"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ChartContainer>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Add/Edit Team Sheet */}
        <Sheet open={showTeamDialog} onOpenChange={(open) => {
          setShowTeamDialog(open)
          if (!open) {
            setEditingTeamId(null)
            setNewTeamName('')
            setNewTeamNumber('')
            setNewTeamMentoringSince('')
          }
        }}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
            <SheetHeader className="p-0 mb-4">
              <SheetTitle>{editingTeamId ? 'Edit Mentee Team' : 'Add Mentee Team'}</SheetTitle>
            </SheetHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-number">Team Number</Label>
                <Input
                  id="team-number"
                  type="number"
                  placeholder="Team number"
                  value={newTeamNumber}
                  onChange={(e) => setNewTeamNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Mentoring Since</Label>
                <Select value={newTeamMentoringSince} onValueChange={setNewTeamMentoringSince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const currentYear = new Date().getFullYear()
                      const years = []
                      for (let year = currentYear; year >= currentYear - 20; year--) {
                        years.push(year)
                      }
                      return years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
                Cancel
              </Button>
              <Button className="btn-accent" onClick={handleSaveTeam}>
                {editingTeamId ? 'Save Changes' : 'Add Mentee Team'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Sessions Section */}
        {selectedTeamId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Sessions for {selectedTeam?.name}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {teamSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Add Session&rdquo; to create one</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Attendees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamSessions.map((session) => {
                      const duration = calculateDuration(session.start_time, session.end_time)
                      const timeRange = session.start_time && session.end_time
                        ? `${formatTime(session.start_time)} - ${formatTime(session.end_time)}`
                        : 'TBD'

                      // Get attendee names
                      const attendeeNames = session.attendees
                        ?.map(attendeeId => {
                          const member = teamMembers.find(m => m.id === attendeeId)
                          return member ? `${member.first_name} ${member.last_name}` : null
                        })
                        .filter(Boolean)
                        .join(', ') || 'None'

                      return (
                        <TableRow key={session.id}>
                          <TableCell
                            className="cursor-pointer hover:text-primary hover:underline transition-colors"
                            onClick={() => openEditDialog(session)}
                            title="Click to edit session"
                          >
                            {formatDate(session.session_date)}
                          </TableCell>
                          <TableCell className="text-sm">{timeRange}</TableCell>
                          <TableCell className="text-sm">{duration}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={attendeeNames}>
                            {attendeeNames}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openNotebook(session)} title="View session notes">
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(session)} title="Edit session">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(session.id, session.team_id)} title="Delete session">
                                <Trash className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Session Sheet */}
        <Sheet open={showAddSession} onOpenChange={(open) => {
          setShowAddSession(open)
          // Set default team to currently selected team, or first team if none selected
          if (open && mentoredTeams.length > 0 && !sessionTeamId) {
            if (selectedTeamId) {
              setSessionTeamId(selectedTeamId)
            } else {
              setSessionTeamId(mentoredTeams[0].id)
            }
          }
        }}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
            <SheetHeader className="p-0 mb-4">
              <SheetTitle>Add Mentoring Session</SheetTitle>
            </SheetHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Mentored Team</Label>
                <Select value={sessionTeamId} onValueChange={setSessionTeamId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mentoredTeams.length === 0 ? (
                      <SelectItem value="" disabled>No teams available</SelectItem>
                    ) : (
                      mentoredTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          Team #{team.number} - {team.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Date</Label>
                <Popover open={addDatePickerOpen} onOpenChange={setAddDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={(date) => {
                        setScheduleDate(date)
                        setAddDatePickerOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <div className="relative">
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                      <Clock className="size-4" />
                    </div>
                    <Input
                      type="time"
                      id="start-time"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className="peer bg-background appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <div className="relative">
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                      <Clock className="size-4" />
                    </div>
                    <Input
                      type="time"
                      id="end-time"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className="peer bg-background appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Who Attended</label>
                <div className="mb-2">
                  {(() => {
                    // Split members by role
                    const mentorsAndAdmins = teamMembers.filter(m => ["mentor", "admin"].includes(m.role.toLowerCase()))
                    const students = teamMembers.filter(m => !["mentor", "admin"].includes(m.role.toLowerCase()))

                    const handleToggleAttendee = (id: string) => {
                      setSelectedAttendees(prev =>
                        prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
                      )
                    }

                    return (
                      <>
                        {mentorsAndAdmins.length > 0 && (
                          <>
                            <div className="font-semibold text-xs mb-1">Mentors / Admins</div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {mentorsAndAdmins.map(member => {
                                const selected = selectedAttendees.includes(member.id)
                                return (
                                  <button
                                    type="button"
                                    key={member.id}
                                    className={`px-3 py-1 rounded border text-sm focus:outline-none transition ${
                                      selected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted text-foreground border-border hover:bg-muted/80'
                                    }`}
                                    onClick={() => handleToggleAttendee(member.id)}
                                  >
                                    {member.first_name} {member.last_name} <span className="text-xs opacity-70">({member.role})</span>
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                        {students.length > 0 && (
                          <>
                            <div className="font-semibold text-xs mb-1">Students</div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {students.map(member => {
                                const selected = selectedAttendees.includes(member.id)
                                return (
                                  <button
                                    type="button"
                                    key={member.id}
                                    className={`px-3 py-1 rounded border text-sm focus:outline-none transition ${
                                      selected
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted text-foreground border-border hover:bg-muted/80'
                                    }`}
                                    onClick={() => handleToggleAttendee(member.id)}
                                  >
                                    {member.first_name} {member.last_name} <span className="text-xs opacity-70">({member.role})</span>
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                        {teamMembers.length === 0 && (
                          <p className="text-sm text-muted-foreground">No team members found</p>
                        )}
                      </>
                    )
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select team members who attended this session
                </p>
              </div>
            </div>

            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowAddSession(false)}>
                Cancel
              </Button>
              <Button className="btn-accent" onClick={handleAddSession}>Add Session</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Edit Session Sheet */}
        {editingSession && (
          <Sheet open={!!editingSession} onOpenChange={(open) => { if (!open) setEditingSession(null) }}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
              <SheetHeader className="p-0 mb-4">
                <SheetTitle>Edit Session</SheetTitle>
              </SheetHeader>

              <div className="grid gap-4">
                <div>
                  <Label className="mb-2 block">Date</Label>
                  <Popover open={editDatePickerOpen} onOpenChange={setEditDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {editDate ? format(editDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editDate}
                        onSelect={(date) => {
                          setEditDate(date)
                          setEditDatePickerOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start-time">Start Time</Label>
                    <div className="relative">
                      <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                        <Clock className="size-4" />
                      </div>
                      <Input
                        type="time"
                        id="edit-start-time"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="peer bg-background appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-end-time">End Time</Label>
                    <div className="relative">
                      <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                        <Clock className="size-4" />
                      </div>
                      <Input
                        type="time"
                        id="edit-end-time"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="peer bg-background appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Attendees Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Attendees</label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                    {(() => {
                      const mentorsAndAdmins = teamMembers.filter(m => ["mentor", "admin"].includes(m.role.toLowerCase()))
                      const students = teamMembers.filter(m => !["mentor", "admin"].includes(m.role.toLowerCase()))

                      const handleToggleEditAttendee = (id: string) => {
                        setEditAttendees(prev =>
                          prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
                        )
                      }

                      return (
                        <div className="space-y-3">
                          {mentorsAndAdmins.length > 0 && (
                            <div>
                              <div className="font-semibold text-xs mb-1">Mentors / Admins</div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {mentorsAndAdmins.map(member => {
                                  const selected = editAttendees.includes(member.id)
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => handleToggleEditAttendee(member.id)}
                                      className={`px-3 py-1 rounded border text-sm focus:outline-none transition ${
                                        selected
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-muted text-foreground border-border hover:bg-muted/80'
                                      }`}
                                    >
                                      {member.first_name} {member.last_name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {students.length > 0 && (
                            <div>
                              <div className="font-semibold text-xs mb-1">Students</div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {students.map(member => {
                                  const selected = editAttendees.includes(member.id)
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => handleToggleEditAttendee(member.id)}
                                      className={`px-3 py-1 rounded border text-sm focus:outline-none transition ${
                                        selected
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-muted text-foreground border-border hover:bg-muted/80'
                                      }`}
                                    >
                                      {member.first_name} {member.last_name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6">
                <Button variant="outline" onClick={() => setEditingSession(null)}>
                  Cancel
                </Button>
                <Button className="btn-accent" onClick={handleEditSession}>Save Changes</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}

        {/* Entity Notebook Sidebar - only render if we have a session ID */}
        {notebookSessionId && (
          <EntityNotebookSidebar
            isOpen={isNotebookOpen}
            onClose={() => {
              setIsNotebookOpen(false)
              setNotebookSessionId(null)
              setNotebookSessionTitle('')
            }}
            entityType="mentoring_session"
            entityId={notebookSessionId}
            entityTitle={notebookSessionTitle}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Session</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this mentoring session? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSessionToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
