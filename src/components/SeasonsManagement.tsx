'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/components/AppDataProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trophy, Loader2, AlertCircle, CheckCircle, Edit } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface Season {
  id: string
  name: string
  start_year: number
  end_year: number
  is_current_season: boolean
  created_at: string
  updated_at: string
}

interface SeasonsManagementProps {
  isAdmin: boolean
}

export function SeasonsManagement({ isAdmin }: SeasonsManagementProps) {
  const { refetch: refetchAppData } = useAppData()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const [newSeason, setNewSeason] = useState({
    name: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 1
  })

  const [editSeason, setEditSeason] = useState<Season | null>(null)

  const fetchSeasons = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('seasons')
        .select('*')
        .order('is_current_season', { ascending: false })
        .order('start_year', { ascending: false })

      if (fetchError) {
        throw new Error(`Failed to fetch seasons: ${fetchError.message}`)
      }

      setSeasons(data || [])
    } catch (err) {
      console.error('Error fetching seasons:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch seasons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  const handleCreateSeason = async () => {
    if (!newSeason.name.trim()) {
      setError('Please enter a season name')
      return
    }

    if (newSeason.end_year <= newSeason.start_year) {
      setError('End year must be after start year')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const { error: createError } = await supabase
        .from('seasons')
        .insert([{
          name: newSeason.name.trim(),
          start_year: newSeason.start_year,
          end_year: newSeason.end_year,
          is_current_season: false // New seasons are not current by default
        }])

      if (createError) {
        throw new Error(`Failed to create season: ${createError.message}`)
      }

      // Reset form and close modal
      setNewSeason({
        name: '',
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear() + 1
      })
      setCreateModalOpen(false)

      // Refresh seasons list
      await fetchSeasons()
    } catch (err) {
      console.error('Error creating season:', err)
      setError(err instanceof Error ? err.message : 'Failed to create season')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditSeason = async () => {
    if (!editSeason) return

    if (!editSeason.name.trim()) {
      setError('Please enter a season name')
      return
    }

    if (editSeason.end_year <= editSeason.start_year) {
      setError('End year must be after start year')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('seasons')
        .update({
          name: editSeason.name.trim(),
          start_year: editSeason.start_year,
          end_year: editSeason.end_year,
          updated_at: new Date().toISOString()
        })
        .eq('id', editSeason.id)

      if (updateError) {
        throw new Error(`Failed to update season: ${updateError.message}`)
      }

      setEditModalOpen(false)
      setEditSeason(null)

      // Refresh seasons list
      await fetchSeasons()
    } catch (err) {
      console.error('Error updating season:', err)
      setError(err instanceof Error ? err.message : 'Failed to update season')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleCurrentSeason = async (seasonId: string, currentValue: boolean) => {
    try {
      // If trying to turn OFF current season, prevent it (at least one must be current)
      if (currentValue) {
        setError('At least one season must be marked as current. Please select another season as current first.')
        return
      }

      // Clear any previous errors
      setError(null)

      // Optimistically update the UI immediately
      setSeasons(prevSeasons =>
        prevSeasons.map(season => ({
          ...season,
          is_current_season: season.id === seasonId
        }))
      )

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call API route to update current season
      const response = await fetch('/api/seasons/set-current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ seasonId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update current season')

        // Revert optimistic update on error
        await fetchSeasons()
      }

      // Success - the UI is already updated optimistically
      // Now update the AppDataProvider to refresh the current season in the navbar
      await refetchAppData()
    } catch (err) {
      console.error('Error toggling current season:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle current season')

      // Revert optimistic update on error
      await fetchSeasons()
    }
  }

  const openEditModal = (season: Season) => {
    setEditSeason(season)
    setEditModalOpen(true)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading seasons...</p>
        </div>
      </div>
    )
  }

  if (error && seasons.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchSeasons} className="btn-accent">Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      {isAdmin && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Seasons</h2>
            <p className="text-sm text-muted-foreground">
              Manage your team&apos;s competition seasons
            </p>
          </div>
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="btn-accent">
                <Plus className="w-4 h-4 mr-2" />
                Create Season
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
                <DialogDescription>
                  Add a new competition season for your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="seasonName">Season Name *</Label>
                  <Input
                    id="seasonName"
                    type="text"
                    placeholder="e.g., 2024-2025 INTO THE DEEP"
                    value={newSeason.name}
                    onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startYear">Start Year *</Label>
                    <Input
                      id="startYear"
                      type="number"
                      min="2020"
                      max="2030"
                      value={newSeason.start_year}
                      onChange={(e) => setNewSeason({ ...newSeason, start_year: parseInt(e.target.value) || new Date().getFullYear() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endYear">End Year *</Label>
                    <Input
                      id="endYear"
                      type="number"
                      min="2021"
                      max="2031"
                      value={newSeason.end_year}
                      onChange={(e) => setNewSeason({ ...newSeason, end_year: parseInt(e.target.value) || new Date().getFullYear() + 1 })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSeason} disabled={isCreating} className="btn-accent">
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Season'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Error Alert */}
      {error && seasons.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Seasons List */}
      <div className="space-y-4">
        {seasons.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Seasons Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first season to get started
            </p>
            {isAdmin && (
              <Button onClick={() => setCreateModalOpen(true)} className="btn-accent">
                <Plus className="w-4 h-4 mr-2" />
                Create Season
              </Button>
            )}
          </div>
        ) : (
          seasons.map((season) => (
            <div key={season.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{season.name}</h3>
                    {season.is_current_season && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Current Season
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {season.start_year} - {season.end_year}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`current-${season.id}`} className="text-sm">
                        Current
                      </Label>
                      <Switch
                        id={`current-${season.id}`}
                        checked={season.is_current_season}
                        onCheckedChange={() => handleToggleCurrentSeason(season.id, season.is_current_season)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(season)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Season Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Season</DialogTitle>
            <DialogDescription>
              Update season information
            </DialogDescription>
          </DialogHeader>
          {editSeason && (
            <div className="space-y-4 pt-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="editSeasonName">Season Name *</Label>
                <Input
                  id="editSeasonName"
                  type="text"
                  placeholder="e.g., 2024-2025 INTO THE DEEP"
                  value={editSeason.name}
                  onChange={(e) => setEditSeason({ ...editSeason, name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editStartYear">Start Year *</Label>
                  <Input
                    id="editStartYear"
                    type="number"
                    min="2020"
                    max="2030"
                    value={editSeason.start_year}
                    onChange={(e) => setEditSeason({ ...editSeason, start_year: parseInt(e.target.value) || new Date().getFullYear() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEndYear">End Year *</Label>
                  <Input
                    id="editEndYear"
                    type="number"
                    min="2021"
                    max="2031"
                    value={editSeason.end_year}
                    onChange={(e) => setEditSeason({ ...editSeason, end_year: parseInt(e.target.value) || new Date().getFullYear() + 1 })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false)
                    setEditSeason(null)
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditSeason} disabled={isCreating} className="btn-accent">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
