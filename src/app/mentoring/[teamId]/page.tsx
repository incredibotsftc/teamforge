"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Upload, Image as ImageIcon, Save, Trash2, X, Plus, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface TeamImage {
  id: string
  storage_path: string
  file_name: string
  caption: string | null
  session_id: string | null
  created_at: string
  publicUrl?: string
}

interface MentoringSession {
  id: string
  session_date: string | null
  timeslot: string | null
  start_time: string | null
  end_time: string | null
}

interface TeamNote {
  id: string
  content: string
  created_at: string
  updated_at: string
}

interface TeamData {
  id: string
  team_name: string
  team_number: number | null
  school: string | null
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const teamId = params.teamId as string

  const [team, setTeam] = useState<TeamData | null>(null)
  const [images, setImages] = useState<TeamImage[]>([])
  const [notes, setNotes] = useState<TeamNote[]>([])
  const [sessions, setSessions] = useState<MentoringSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all')
  const [noteContent, setNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<TeamImage | null>(null)
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSessionDate, setNewSessionDate] = useState('')
  const [newSessionStart, setNewSessionStart] = useState('')
  const [newSessionEnd, setNewSessionEnd] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load team data
  useEffect(() => {
    if (!teamId || !user) return

    async function loadTeamData() {
      try {
        // Load team details - try with school first, fallback without it
        let teamData: TeamData | null = null
        let teamError: unknown = null

        // Try loading with school column
        const result = await supabase
          .from('mentoring_teams')
          .select('id, team_name, team_number, school')
          .eq('id', teamId)
          .eq('mentor_id', user!.id)
          .single()

        if (result.error && result.error.code === '42703') {
          // Column doesn't exist, try without school
          const fallbackResult = await supabase
            .from('mentoring_teams')
            .select('id, team_name, team_number')
            .eq('id', teamId)
            .eq('mentor_id', user!.id)
            .single()

          teamData = fallbackResult.data as TeamData
          teamError = fallbackResult.error
        } else {
          teamData = result.data as TeamData
          teamError = result.error
        }

        if (teamError) {
          console.error('Failed to load team:', teamError)
          return
        }

        setTeam(teamData)

        // Load mentoring sessions for this team
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('mentoring_sessions')
          .select('id, session_date, timeslot, start_time, end_time')
          .eq('team_id', teamId)
          .order('session_date', { ascending: false })

        if (sessionsError) {
          console.error('Failed to load sessions:', sessionsError)
        } else {
          setSessions(sessionsData as MentoringSession[])
        }

        // Load images
        const { data: imagesData, error: imagesError } = await supabase
          .from('team_images')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })

        if (imagesError) {
          console.error('Failed to load images:', imagesError)
        } else {
          // Get signed URLs for images (valid for 1 hour)
          const imagesWithUrls = await Promise.all(
            (imagesData as TeamImage[]).map(async (img) => {
              const { data, error } = await supabase.storage
                .from('mentoring-team-images')
                .createSignedUrl(img.storage_path, 3600) // 1 hour expiry

              if (error) {
                console.error('Failed to create signed URL:', error)
                return { ...img, publicUrl: '' }
              }

              return {
                ...img,
                publicUrl: data.signedUrl
              }
            })
          )
          setImages(imagesWithUrls)
        }

        // Load notes
        const { data: notesData, error: notesError } = await supabase
          .from('team_notes')
          .select('*')
          .eq('team_id', teamId)
          .eq('mentor_id', user!.id)
          .order('updated_at', { ascending: false })

        if (notesError) {
          console.error('Failed to load notes:', notesError)
        } else {
          setNotes(notesData as TeamNote[])
          // Set the latest note as editable
          if (notesData && notesData.length > 0) {
            setNoteContent((notesData[0] as TeamNote).content)
            setEditingNoteId((notesData[0] as TeamNote).id)
          }
        }
      } catch (err) {
        console.error('Error loading team data:', err)
      }
    }

    loadTeamData()
  }, [teamId, user])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`)
          continue
        }

        // Validate file size (10 MB)
        if (file.size > 10485760) {
          alert(`${file.name} is too large. Max size is 10 MB`)
          continue
        }

        // Create unique file path
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const storagePath = `${user.id}/${teamId}/${fileName}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('mentoring-team-images')
          .upload(storagePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        // Save metadata to database
        const sessionIdToSave = (selectedSessionId === 'all' || selectedSessionId === 'none') ? null : selectedSessionId
        const { data: imageData, error: dbError } = await supabase
          .from('team_images')
          .insert([{
            team_id: teamId,
            session_id: sessionIdToSave,
            storage_path: storagePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          }])
          .select()
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          alert(`Failed to save ${file.name} metadata: ${dbError.message || JSON.stringify(dbError)}`)
          continue
        }

        // Get signed URL (valid for 1 hour)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('mentoring-team-images')
          .createSignedUrl(storagePath, 3600)

        if (urlError) {
          console.error('Failed to create signed URL:', urlError)
        }

        // Add to images list
        setImages(prev => [{
          ...(imageData as TeamImage),
          publicUrl: urlData?.signedUrl || ''
        }, ...prev])
      }
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Failed to upload images')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteImage = async (image: TeamImage) => {
    if (!confirm(`Delete ${image.file_name}?`)) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('mentoring-team-images')
        .remove([image.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('team_images')
        .delete()
        .eq('id', image.id)

      if (dbError) {
        console.error('Database delete error:', dbError)
        alert('Failed to delete image')
        return
      }

      // Remove from state
      setImages(prev => prev.filter(img => img.id !== image.id))
      if (selectedImage?.id === image.id) {
        setSelectedImage(null)
      }
    } catch (err) {
      console.error('Error deleting image:', err)
      alert('Failed to delete image')
    }
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !user) return

    try {
      if (editingNoteId) {
        // Update existing note
        const { error } = await supabase
          .from('team_notes')
          .update({
            content: noteContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNoteId)
          .eq('mentor_id', user.id)

        if (error) {
          console.error('Failed to update note:', error)
          alert('Failed to save note')
          return
        }

        // Update in state
        setNotes(prev => prev.map(note =>
          note.id === editingNoteId
            ? { ...note, content: noteContent, updated_at: new Date().toISOString() }
            : note
        ))
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('team_notes')
          .insert([{
            team_id: teamId,
            mentor_id: user.id,
            content: noteContent
          }])
          .select()
          .single()

        if (error) {
          console.error('Failed to create note:', error)
          alert('Failed to save note')
          return
        }

        // Add to state
        setNotes(prev => [data as TeamNote, ...prev])
        setEditingNoteId((data as TeamNote).id)
      }

      alert('Note saved successfully')
    } catch (err) {
      console.error('Error saving note:', err)
      alert('Failed to save note')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return

    try {
      const { error } = await supabase
        .from('team_notes')
        .delete()
        .eq('id', noteId)
        .eq('mentor_id', user!.id)

      if (error) {
        console.error('Failed to delete note:', error)
        alert('Failed to delete note')
        return
      }

      // Remove from state
      setNotes(prev => prev.filter(note => note.id !== noteId))

      // Clear editor if deleting current note
      if (editingNoteId === noteId) {
        setEditingNoteId(null)
        setNoteContent('')
      }
    } catch (err) {
      console.error('Error deleting note:', err)
      alert('Failed to delete note')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeStr: string) => {
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

  const handleAddSession = async () => {
    if (!newSessionDate || !user) {
      alert('Please select a date')
      return
    }

    try {
      const startLabel = formatTime(newSessionStart)
      const endLabel = formatTime(newSessionEnd)
      const timeslot = newSessionStart && newSessionEnd ? `${startLabel} - ${endLabel}` : 'TBD'

      const { data, error } = await supabase
        .from('mentoring_sessions')
        .insert([{
          team_id: teamId,
          team_name: team?.team_name,
          session_date: newSessionDate,
          start_time: newSessionStart || null,
          end_time: newSessionEnd || null,
          timeslot,
          created_by: user.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Failed to create session:', error)
        alert(`Failed to create session: ${error.message}`)
        return
      }

      // Add to sessions list
      setSessions(prev => [data as MentoringSession, ...prev])

      // Clear form and close dialog
      setNewSessionDate('')
      setNewSessionStart('')
      setNewSessionEnd('')
      setShowAddSession(false)

      alert('Session created successfully!')
    } catch (err) {
      console.error('Error creating session:', err)
      alert('Failed to create session')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session? Images associated with it will not be deleted.')) return

    try {
      const { error } = await supabase
        .from('mentoring_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to delete session:', error)
        alert('Failed to delete session')
        return
      }

      // Remove from sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionId))

      // If this was the selected session, reset to 'all'
      if (selectedSessionId === sessionId) {
        setSelectedSessionId('all')
      }
    } catch (err) {
      console.error('Error deleting session:', err)
      alert('Failed to delete session')
    }
  }

  if (!team) {
    return (
      <DashboardLayout pageTitle="Team Details" pageIcon={ImageIcon}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading team data...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle={team.team_name} pageIcon={ImageIcon}>
      <div className="h-full flex flex-col gap-4">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/mentoring')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Mentoring
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{team.team_name}</h2>
            <p className="text-sm text-muted-foreground">
              Team #{team.team_number}
              {team.school && ` • ${team.school}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Images Section */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Images ({images.filter(img => selectedSessionId === 'all' || img.session_id === selectedSessionId || (selectedSessionId === 'none' && !img.session_id)).length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground shrink-0">Filter:</label>
                  <select
                    value={selectedSessionId || 'all'}
                    onChange={(e) => setSelectedSessionId(e.target.value === 'all' ? 'all' : e.target.value === 'none' ? 'none' : e.target.value)}
                    className="flex-1 rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="all">All Sessions</option>
                    <option value="none">No Session</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.session_date || 'TBD'} - {session.timeslot || 'No time'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddSession(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Session
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {(() => {
                const filteredImages = images.filter(img =>
                  selectedSessionId === 'all' ||
                  img.session_id === selectedSessionId ||
                  (selectedSessionId === 'none' && !img.session_id)
                )

                if (filteredImages.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {images.length === 0 ? 'No images uploaded yet' : 'No images for this session'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedSessionId === 'all' || selectedSessionId === 'none'
                          ? 'Click Upload to add images'
                          : 'Select this session from the dropdown above and upload images'
                        }
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredImages.filter(img => img.publicUrl).map((image) => (
                    <div
                      key={image.id}
                      className="relative group aspect-square rounded-md overflow-hidden bg-muted cursor-pointer border hover:border-primary transition-colors"
                      onClick={() => setSelectedImage(image)}
                    >
                      <Image
                        src={image.publicUrl!}
                        alt={image.file_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteImage(image)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white truncate">
                          {image.file_name}
                        </p>
                      </div>
                    </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
              {/* Note Editor */}
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Write your notes about this team..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveNote} disabled={!noteContent.trim()}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingNoteId ? 'Update Note' : 'Save Note'}
                  </Button>
                  {editingNoteId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingNoteId(null)
                        setNoteContent('')
                      }}
                    >
                      New Note
                    </Button>
                  )}
                </div>
              </div>

              {/* Previous Notes */}
              <div className="flex-1 overflow-auto">
                <h4 className="text-sm font-medium mb-2">Previous Notes</h4>
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-md border ${
                          editingNoteId === note.id
                            ? 'border-primary bg-primary/5'
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(note.updated_at)}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingNoteId(note.id)
                                setNoteContent(note.content)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sessions Section */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sessions ({sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &ldquo;+ Session&rdquo; above to add one
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {session.session_date ? new Date(session.session_date).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'TBD'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.timeslot || 'No time set'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {images.filter(img => img.session_id === session.id).length} image(s)
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSessionId(session.id)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Session Dialog */}
      <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Mentoring Session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time</label>
                <Input
                  type="time"
                  value={newSessionStart}
                  onChange={(e) => setNewSessionStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Time</label>
                <Input
                  type="time"
                  value={newSessionEnd}
                  onChange={(e) => setNewSessionEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSession(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSession}>
              Add Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedImage.file_name}</span>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </DialogClose>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center relative w-full h-[70vh]">
              <Image
                src={selectedImage.publicUrl || ''}
                alt={selectedImage.file_name}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Uploaded {formatDate(selectedImage.created_at)}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleDeleteImage(selectedImage)
                  setSelectedImage(null)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}
