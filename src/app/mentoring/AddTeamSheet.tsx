import React, { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

// Generate years array once
const generateYearsArray = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear; year >= currentYear - 20; year--) {
    years.push(year)
  }
  return years
}

const YEARS_ARRAY = generateYearsArray()

interface AddTeamSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTeam: { id: string; name: string; number?: number; mentoring_since?: number } | null
  teamId: string
  seasonId: string
  userId: string
  onSuccess: () => void
}

export function AddTeamSheet({
  open,
  onOpenChange,
  editingTeam,
  teamId,
  seasonId,
  userId,
  onSuccess
}: AddTeamSheetProps) {
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamNumber, setNewTeamNumber] = useState('')
  const [newTeamMentoringSince, setNewTeamMentoringSince] = useState('')

  // Update form when editingTeam changes
  React.useEffect(() => {
    if (editingTeam) {
      setNewTeamName(editingTeam.name)
      setNewTeamNumber(editingTeam.number?.toString() || '')
      setNewTeamMentoringSince(editingTeam.mentoring_since?.toString() || '')
    } else {
      setNewTeamName('')
      setNewTeamNumber('')
      setNewTeamMentoringSince('')
    }
  }, [editingTeam])

  const handleSave = async () => {
    const num = parseInt(newTeamNumber) || Math.floor(Math.random() * 9000) + 100
    const teamName = newTeamName || `Team ${num}`
    const mentoringSince = newTeamMentoringSince ? parseInt(newTeamMentoringSince) : null

    try {
      if (editingTeam) {
        // Update existing team
        const { error } = await supabase
          .from('mentoring_teams')
          .update({
            team_number: num,
            team_name: teamName,
            mentoring_since: mentoringSince
          })
          .eq('id', editingTeam.id)

        if (error) {
          console.error('Failed to update team', error)
          alert(`Failed to update team: ${error.message}`)
        } else {
          alert('Team updated successfully!')
          onSuccess()
          onOpenChange(false)
        }
      } else {
        // Create new team
        const { error } = await supabase
          .from('mentoring_teams')
          .insert([{
            team_number: num,
            team_name: teamName,
            mentor_team_id: teamId,
            season_id: seasonId,
            mentor_id: userId,
            mentoring_since: mentoringSince
          }])

        if (error) {
          console.error('Failed to create team', error)
          alert(`Failed to create team: ${error.message}`)
        } else {
          onSuccess()
          onOpenChange(false)
        }
      }
    } catch (err) {
      console.error('Error saving team', err)
      alert('Failed to save team')
    }
  }

  if (!open) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
        <SheetHeader className="p-0 mb-4">
          <SheetTitle>{editingTeam ? 'Edit Mentee Team' : 'Add Mentee Team'}</SheetTitle>
          <SheetDescription>
            {editingTeam ? 'Update the details for this mentee team.' : 'Add a new team that your team is mentoring this season.'}
          </SheetDescription>
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
                {YEARS_ARRAY.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="btn-accent" onClick={handleSave}>
            {editingTeam ? 'Save Changes' : 'Add Mentee Team'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
