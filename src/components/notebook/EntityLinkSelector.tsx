'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/components/AppDataProvider'
import { LinkedEntityType } from '@/types/notebook'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EntityLinkSelectorProps {
  linkedEntityType?: LinkedEntityType
  linkedEntityId?: string
  onLinkChange: (entityType?: LinkedEntityType, entityId?: string) => void
}

interface Event {
  id: string
  title: string
  start_date: string
  event_type: string
}

interface MentoringSession {
  id: string
  team_name: string
  session_date: string
}

interface MentoringSessionRaw {
  id: string
  session_date: string
  mentoring_teams: { team_name: string } | { team_name: string }[] | null
}

interface Task {
  id: string
  title: string
  status: string
  category: string
}

export function EntityLinkSelector({ linkedEntityType, linkedEntityId, onLinkChange }: EntityLinkSelectorProps) {
  const { team, currentSeason } = useAppData()
  const [entityType, setEntityType] = useState<LinkedEntityType | ''>( linkedEntityType || '')
  const [selectedId, setSelectedId] = useState<string>(linkedEntityId || '')

  const [events, setEvents] = useState<Event[]>([])
  const [sessions, setSessions] = useState<MentoringSession[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  const [loading, setLoading] = useState(false)
  const [scoutingTeamInput, setScoutingTeamInput] = useState('')

  // Check if this is an existing linked page (immutable)
  const isExistingLink = linkedEntityType !== undefined && linkedEntityId !== undefined

  // Sync local state with props when they change
  useEffect(() => {
    if (linkedEntityType !== undefined && linkedEntityType !== entityType) {
      setEntityType(linkedEntityType || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedEntityType])

  useEffect(() => {
    if (linkedEntityId !== undefined && linkedEntityId !== selectedId) {
      setSelectedId(linkedEntityId || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedEntityId])

  // Fetch entities when entity type changes
  useEffect(() => {
    if (!team || !currentSeason) return

    const fetchEntities = async () => {
      setLoading(true)

      if (entityType === 'event') {
        const { data } = await supabase
          .from('events')
          .select('id, title, start_date, event_type')
          .eq('team_id', team.id)
          .eq('season_id', currentSeason.id)
          .order('start_date', { ascending: false })
          .limit(50)
        setEvents(data || [])
      } else if (entityType === 'mentoring_session') {
        const { data } = await supabase
          .from('mentoring_sessions')
          .select('id, session_date, mentoring_teams!mentored_team_id(team_name)')
          .eq('mentor_team_id', team.id)
          .eq('season_id', currentSeason.id)
          .order('session_date', { ascending: false })
          .limit(50)

        // Transform the data to flatten the nested team_name
        const transformedData = (data as MentoringSessionRaw[])?.map(session => {
          const teams = session.mentoring_teams
          const teamName = teams
            ? (Array.isArray(teams) ? teams[0]?.team_name : teams.team_name)
            : 'Unknown Team'
          return {
            id: session.id,
            session_date: session.session_date,
            team_name: teamName || 'Unknown Team'
          }
        }) || []

        setSessions(transformedData)
      } else if (entityType === 'task') {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, status, category')
          .eq('team_id', team.id)
          .eq('season_id', currentSeason.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setTasks(data || [])
      } else if (entityType === 'scouting_team') {
        // For scouting teams, we don't fetch a list - user will enter team number
        // Load the selected team if there's already a selection
        if (selectedId) {
          try {
            const response = await fetch(`/api/scouting/search?query=${selectedId}&type=team`)
            const data = await response.json()
            // Data is fetched but not currently used in the UI
            if (data.success && data.matches.length > 0) {
              // Future: Display scouting team data if needed
            }
          } catch (error) {
            console.error('Error fetching scouting team:', error)
          }
        }
      }

      setLoading(false)
    }

    if (entityType && entityType !== 'scouting_team') {
      fetchEntities()
    } else if (entityType === 'scouting_team' && selectedId) {
      fetchEntities()
    }
  }, [entityType, team, currentSeason, selectedId])

  const handleEntityTypeChange = (type: LinkedEntityType | '') => {
    setEntityType(type)
    setSelectedId('')
    setScoutingTeamInput('')
    if (!type) {
      onLinkChange(undefined, undefined)
    }
  }

  const handleEntityIdChange = (id: string) => {
    setSelectedId(id)
    if (entityType && id) {
      onLinkChange(entityType as LinkedEntityType, id)
    }
  }

  const clearLink = () => {
    setEntityType('')
    setSelectedId('')
    setScoutingTeamInput('')
    onLinkChange(undefined, undefined)
  }

  // If this is an existing linked page, show read-only display
  if (isExistingLink) {
    const getEntityTypeLabel = () => {
      switch (linkedEntityType) {
        case 'event': return '📅 Team Event'
        case 'mentoring_session': return '👥 Mentoring Session'
        case 'task': return '📋 Project Task'
        case 'scouting_team': return '🔍 Scouting Team'
        default: return 'Entity'
      }
    }

    const getEntityIdDisplay = () => {
      if (linkedEntityType === 'scouting_team') {
        return `Team #${linkedEntityId}`
      }
      return linkedEntityId
    }

    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Linked to Entity</label>
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
          <span className="text-sm font-medium">{getEntityTypeLabel()}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">{getEntityIdDisplay()}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          This notebook is linked to {linkedEntityType === 'scouting_team' ? 'a scouting team' : 'an entity'} and cannot be changed.
        </p>
      </div>
    )
  }

  // Otherwise, show editable dropdowns for creating new links
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">Link to Entity</label>
        {(linkedEntityType || entityType) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearLink}
            className="h-6 px-2 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Select
          value={entityType}
          onValueChange={(value) => handleEntityTypeChange(value as LinkedEntityType | '')}
        >
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">📅 Team Event</SelectItem>
            <SelectItem value="mentoring_session">👥 Mentoring Session</SelectItem>
            <SelectItem value="task">📋 Project Task</SelectItem>
            <SelectItem value="scouting_team">🔍 Scouting Team</SelectItem>
          </SelectContent>
        </Select>

        {entityType === 'scouting_team' ? (
          <div className="flex-1 flex gap-2">
            <Input
              type="number"
              placeholder="Team number..."
              value={scoutingTeamInput}
              onChange={(e) => setScoutingTeamInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && scoutingTeamInput) {
                  handleEntityIdChange(scoutingTeamInput)
                }
              }}
              className="flex-1 h-8 text-xs"
            />
            <Button
              size="sm"
              onClick={() => scoutingTeamInput && handleEntityIdChange(scoutingTeamInput)}
              disabled={!scoutingTeamInput}
              className="h-8 px-2"
            >
              Link
            </Button>
          </div>
        ) : entityType && (
          <>
            {loading ? (
              <div className="flex-1 border rounded-md px-3 py-1.5 text-xs text-muted-foreground bg-muted h-8 flex items-center">
                Loading...
              </div>
            ) : (
              <Select
                key={`${entityType}-${sessions.length}-${events.length}-${tasks.length}`}
                value={selectedId}
                onValueChange={(value) => handleEntityIdChange(value)}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue
                    placeholder={`Select ${entityType === 'event' ? 'an event' : entityType === 'mentoring_session' ? 'a session' : 'a task'}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {entityType === 'event' && events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} - {new Date(event.start_date).toLocaleDateString()}
                    </SelectItem>
                  ))}

                  {entityType === 'mentoring_session' && sessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.team_name} - {session.session_date ? new Date(session.session_date).toLocaleDateString() : 'No date'}
                    </SelectItem>
                  ))}

                  {entityType === 'task' && tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title} ({task.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>

      {entityType && entityType !== 'scouting_team' && (
        <>
          {entityType === 'event' && events.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">No events found. Create an event in the Calendar first.</p>
          )}
          {entityType === 'mentoring_session' && sessions.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">No mentoring sessions found. Create a session in Mentoring first.</p>
          )}
          {entityType === 'task' && tasks.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">No tasks found. Create a task in Projects first.</p>
          )}
        </>
      )}
      {entityType === 'scouting_team' && selectedId && (
        <p className="text-xs text-muted-foreground mt-2">
          Linked to Team #{selectedId}. Enter a different team number to change.
        </p>
      )}
    </div>
  )
}
