'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { Loader2, Upload, Save } from 'lucide-react'

interface TeamSettingsProps {
  onSettingsUpdated?: () => void
}

export function TeamSettings({ onSettingsUpdated }: TeamSettingsProps) {
  const { user } = useAuth()
  const { team, refetch } = useAppData()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [teamName, setTeamName] = useState(team?.team_name || '')
  const [teamNumber, setTeamNumber] = useState(team?.team_number?.toString() || '')
  const [schoolName, setSchoolName] = useState(team?.school_name || '')
  const [state, setState] = useState(team?.state || '')
  const [country, setCountry] = useState(team?.country || '')
  const [logoUrl, setLogoUrl] = useState(team?.logo_url || '')

  // Update state when team data changes
  useEffect(() => {
    if (team) {
      setTeamName(team.team_name || '')
      setTeamNumber(team.team_number?.toString() || '')
      setSchoolName(team.school_name || '')
      setState(team.state || '')
      setCountry(team.country || '')
      setLogoUrl(team.logo_url || '')
    }
  }, [team])

  const handleTeamInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !team) return

    // Validate team number
    const teamNum = parseInt(teamNumber)
    if (!teamNumber.trim() || isNaN(teamNum) || teamNum <= 0) {
      alert('Please enter a valid team number')
      return
    }

    setIsLoading(true)
    try {
      const updateData = {
        team_name: teamName.trim() || null,
        team_number: teamNum,
        school_name: schoolName.trim() || null,
        state: state.trim() || null,
        country: country.trim() || null
      }

      const { error } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', team.id)

      if (error) throw error

      await refetch()
      onSettingsUpdated?.()
    } catch (error) {
      console.error('Error updating team information:', error)
      if (error instanceof Error && error.message.includes('duplicate')) {
        alert('This team number is already taken. Please choose a different number.')
      } else {
        alert('Failed to update team information')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !team) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    setUploadingLogo(true)
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `team-${team.team_number}-logo-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(uploadData.path)

      const publicUrl = urlData.publicUrl

      // Update team with new logo URL
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', team.id)

      if (updateError) throw updateError

      setLogoUrl(publicUrl)
      await refetch()
      onSettingsUpdated?.()
    } catch (error) {
      console.error('Error uploading logo:', error)
      if (error instanceof Error && error.message.includes('Bucket not found')) {
        alert('Storage bucket not set up yet. Please contact your administrator to set up team logo storage.')
      } else {
        alert('Failed to upload logo')
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!user || !team || !logoUrl) return

    if (!confirm('Are you sure you want to remove the team logo?')) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: null })
        .eq('id', team.id)

      if (error) throw error

      setLogoUrl('')
      await refetch()
      onSettingsUpdated?.()
    } catch (error) {
      console.error('Error removing logo:', error)
      alert('Failed to remove logo')
    } finally {
      setIsLoading(false)
    }
  }

  if (!team) return null

  return (
    <form onSubmit={handleTeamInfoSubmit} className="space-y-6">
      {/* Responsive 2-column layout on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Team Information */}
        <div className="space-y-4">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-base font-medium">
              Team Name
            </Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              disabled={isLoading}
              required
            />
          </div>

          {/* Team Number */}
          <div className="space-y-2">
            <Label htmlFor="team-number" className="text-base font-medium">
              Team Number
            </Label>
            <Input
              id="team-number"
              type="number"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              placeholder="Enter team number"
              disabled={isLoading}
              min="1"
              required
            />
          </div>

          {/* School Name */}
          <div className="space-y-2">
            <Label htmlFor="school-name" className="text-base font-medium">
              School Name
            </Label>
            <Input
              id="school-name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name"
              disabled={isLoading}
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="state" className="text-base font-medium">
                State/Province
              </Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State/Province"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-base font-medium">
                Country
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Team Logo */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Team Logo</Label>
          <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <Avatar className="w-24 h-24">
              {logoUrl ? (
                <AvatarImage src={logoUrl} alt="Team logo" />
              ) : (
                <AvatarFallback className="text-xl">
                  {teamNumber || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="text-center space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" disabled={uploadingLogo} asChild>
                    <span>
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </span>
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
                {logoUrl && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveLogo}
                    disabled={isLoading}
                    type="button"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a team logo (PNG, JPG, max 2MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  )
}