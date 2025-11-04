'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddMemberForm } from '@/components/AddMemberForm'
import { CreateInviteButton } from '@/components/CreateInviteButton'
import { TeamSettings } from '@/components/TeamSettings'
import { SeasonsManagement } from '@/components/SeasonsManagement'
import { InvitesManagement } from '@/components/InvitesManagement'
import { supabase } from '@/lib/supabase'
import { formatRole, formatDate, getInitials, getRoleColor } from '@/lib/format-utils'
import {
  UsersRound,
  Plus,
  Shield,
  User,
  Trash2,
  UserPlus,
  Loader2,
  AlertCircle,
  Settings,
  Trophy,
  Link2
} from 'lucide-react'

interface TeamMember {
  id: string
  user_id: string
  role: 'admin' | 'mentor' | 'student' | 'guest'
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  joined_at: string
}

export default function TeamPage() {
  const { user } = useAuth()
  const { refetch: fetchAppData } = useAppData()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<{ id: string, name: string } | null>(null)

  // Check if current user is admin
  const isAdmin = currentUserRole === 'admin'

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setLoading(false)
        return
      }

      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Authentication required')
        return
      }

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('role', { ascending: true })
        .order('first_name', { ascending: true })

      if (membersError) {
        throw new Error(`Failed to fetch team members: ${membersError.message}`)
      }

      setMembers(membersData || [])

      // Find current user's role
      const currentMember = membersData?.find(member => member.user_id === user.id)
      setCurrentUserRole(currentMember?.role || null)

    } catch (err) {
      console.error('Error fetching team members:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch team members')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Memoize member statistics to prevent unnecessary recalculations
  const memberStats = useMemo(() => ({
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    mentors: members.filter(m => m.role === 'mentor').length,
    students: members.filter(m => m.role === 'student').length
  }), [members])

  useEffect(() => {
    // Only fetch team members when user is authenticated
    if (user) {
      fetchTeamMembers()
    }
  }, [user, fetchTeamMembers])

  // Keep getRoleIcon since it's not in shared utils
  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'mentor': return <UserPlus className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }, [])

  const handleDeleteMember = async (memberId: string) => {
    setDeletingMemberId(memberId)

    try {
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Authentication required')
      }

      // Delete the team member from the database
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        throw new Error(`Failed to remove team member: ${error.message}`)
      }

      // Refresh the members list
      await fetchTeamMembers()
      await fetchAppData() // Update app data to reflect changes

    } catch (err) {
      console.error('Error deleting member:', err)
      alert(`Failed to remove team member: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingMemberId(null)
      setMemberToDelete(null)
    }
  }

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      handleDeleteMember(memberToDelete.id)
    }
  }

  const handleMakeAdmin = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to make ${memberName} an admin? They will have full access to manage the team.`)) {
      return
    }

    try {
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Authentication required')
      }

      // Update the team member's role to admin
      const { error } = await supabase
        .from('team_members')
        .update({ role: 'admin' })
        .eq('id', memberId)

      if (error) {
        throw new Error(`Failed to promote team member: ${error.message}`)
      }

      // Refresh the members list
      await fetchTeamMembers()

    } catch (err) {
      console.error('Error promoting member:', err)
      alert(`Failed to promote team member: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Show loading state while user authentication is being checked or data is loading
  if (!user || loading) {
    return (
      <DashboardLayout pageTitle="Team" pageIcon={UsersRound}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {!user ? 'Loading...' : 'Loading team members...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Team" pageIcon={UsersRound}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchTeamMembers} className="btn-accent">Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      pageTitle="Team"
      pageIcon={UsersRound}
      actions={
        isAdmin ? (
          <div className="flex gap-2">
            <CreateInviteButton
              onMemberAdded={() => {
                fetchTeamMembers()
                fetchAppData()
              }}
            />
            <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
              <DialogTrigger asChild>
                <Button className="btn-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Add a new member to your team directly
                  </DialogDescription>
                </DialogHeader>
                <AddMemberForm
                  onMemberAdded={() => {
                    setAddMemberModalOpen(false)
                    fetchTeamMembers()
                    fetchAppData() // Refresh app data to show updated member count
                  }}
                  onCancel={() => setAddMemberModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : undefined
      }
    >
      <div className="container mx-auto py-6">
        {isAdmin ? (
          <Tabs defaultValue="members" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="members" className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                <span className="hidden sm:inline">Team Members</span>
                <span className="sm:hidden">Members</span>
                <Badge variant="secondary" className="ml-1">
                  {memberStats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Invites</span>
                <span className="sm:hidden">Invites</span>
              </TabsTrigger>
              <TabsTrigger value="seasons" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Seasons</span>
                <span className="sm:hidden">Seasons</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Team Settings</span>
                <span className="sm:hidden">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-6">
              <div className="space-y-6">
                {/* Member Counts Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{memberStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {memberStats.admins}
                    </div>
                    <div className="text-sm text-muted-foreground">Admins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {memberStats.mentors}
                    </div>
                    <div className="text-sm text-muted-foreground">Mentors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {memberStats.students}
                    </div>
                    <div className="text-sm text-muted-foreground">Students</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t"></div>

                {/* Members List */}
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      {/* Desktop Layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(member.first_name, member.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">
                                {member.first_name} {member.last_name}
                              </h3>
                              {member.user_id === user?.id && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined {formatDate(member.joined_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getRoleColor(member.role)} variant="secondary">
                            <span className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              {formatRole(member.role)}
                            </span>
                          </Badge>
                          {isAdmin && member.user_id !== user?.id && (
                            <div className="flex items-center gap-1">
                              {member.role !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMakeAdmin(member.id, `${member.first_name} ${member.last_name}`)}
                                  title="Make Admin"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberToDelete({ id: member.id, name: `${member.first_name} ${member.last_name}` })}
                                disabled={deletingMemberId === member.id}
                                title="Remove Member"
                              >
                                {deletingMemberId === member.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(member.first_name, member.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium">
                                {member.first_name} {member.last_name}
                              </h3>
                              {member.user_id === user?.id && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined {formatDate(member.joined_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge className={getRoleColor(member.role)} variant="secondary">
                            <span className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              {formatRole(member.role)}
                            </span>
                          </Badge>
                          {isAdmin && member.user_id !== user?.id && (
                            <div className="flex items-center gap-2">
                              {member.role !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMakeAdmin(member.id, `${member.first_name} ${member.last_name}`)}
                                  title="Make Admin"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberToDelete({ id: member.id, name: `${member.first_name} ${member.last_name}` })}
                                disabled={deletingMemberId === member.id}
                                title="Remove Member"
                              >
                                {deletingMemberId === member.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="invites" className="space-y-6">
              <InvitesManagement />
            </TabsContent>

            <TabsContent value="seasons" className="space-y-6">
              <SeasonsManagement isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <TeamSettings />
            </TabsContent>
          </Tabs>
        ) : (
          // Non-admin view - just show members list
          <div className="space-y-6">
            {/* Member Counts Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{memberStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {memberStats.admins}
                </div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {memberStats.mentors}
                </div>
                <div className="text-sm text-muted-foreground">Mentors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {memberStats.students}
                </div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Members List */}
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="border rounded-lg p-4">
                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {member.first_name} {member.last_name}
                          </h3>
                          {member.user_id === user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDate(member.joined_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleColor(member.role)} variant="secondary">
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {formatRole(member.role)}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">
                            {member.first_name} {member.last_name}
                          </h3>
                          {member.user_id === user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDate(member.joined_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={getRoleColor(member.role)} variant="secondary">
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {formatRole(member.role)}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={memberToDelete !== null} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from the team?
              This will permanently delete them from the team. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberToDelete(null)}
              disabled={deletingMemberId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMember}
              disabled={deletingMemberId !== null}
            >
              {deletingMemberId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}