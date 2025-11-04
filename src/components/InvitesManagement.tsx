'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Link2,
  Calendar,
  Users,
  Ban
} from 'lucide-react'
import { formatRole, formatDate } from '@/lib/format-utils'

interface TeamInvite {
  id: string
  invite_code: string
  default_role: string
  max_uses: number | null
  current_uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  created_by: string
}

export function InvitesManagement() {
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const fetchInvites = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Authentication required')
        return
      }

      const response = await fetch('/api/team/invites', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setInvites(data.invites || [])
      } else {
        setError(data.error || 'Failed to fetch invites')
      }
    } catch (err) {
      console.error('Error fetching invites:', err)
      setError('Failed to fetch invites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const getInviteUrl = (inviteCode: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?code=${inviteCode}`
    }
    return ''
  }

  const copyInviteUrl = async (invite: TeamInvite) => {
    const url = getInviteUrl(invite.invite_code)

    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Failed to copy invite link')
    }
  }

  const deactivateInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to deactivate this invite? It will no longer be usable.')) {
      return
    }

    setDeactivatingId(inviteId)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        alert('Authentication required')
        return
      }

      const { error } = await supabase
        .from('team_invites')
        .update({ is_active: false })
        .eq('id', inviteId)

      if (error) {
        throw new Error(error.message)
      }

      // Refresh the invites list
      await fetchInvites()
    } catch (err) {
      console.error('Error deactivating invite:', err)
      alert(`Failed to deactivate invite: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeactivatingId(null)
    }
  }

  const isInviteValid = (invite: TeamInvite): boolean => {
    if (!invite.is_active) return false

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return false
    }

    // Check max uses
    if (invite.max_uses !== null && invite.current_uses >= invite.max_uses) {
      return false
    }

    return true
  }

  const getStatusBadge = (invite: TeamInvite) => {
    if (!invite.is_active) {
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Deactivated</Badge>
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expired</Badge>
    }

    if (invite.max_uses !== null && invite.current_uses >= invite.max_uses) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Max Uses Reached</Badge>
    }

    return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading invites...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchInvites} className="btn-accent">Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Team Invites
        </CardTitle>
        <CardDescription>
          Manage invite links for new team members
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No invites created yet</p>
            <p className="text-sm text-muted-foreground">
              Click &quot;Create Invite&quot; at the top to generate invite links
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      {getStatusBadge(invite)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{formatRole(invite.default_role)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {invite.current_uses}
                        {invite.max_uses !== null ? ` / ${invite.max_uses}` : ' / ∞'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {invite.expires_at ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(invite.expires_at)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(invite.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteUrl(invite)}
                          disabled={!isInviteValid(invite)}
                          title={isInviteValid(invite) ? "Copy invite link" : "Invite is no longer valid"}
                        >
                          {copiedId === invite.id ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        {invite.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateInvite(invite.id)}
                            disabled={deactivatingId === invite.id}
                            title="Deactivate invite"
                          >
                            {deactivatingId === invite.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Ban className="w-4 h-4 mr-1" />
                                Deactivate
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
