'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Link2,
  Copy,
  Loader2,
  AlertCircle,
  Check,
  Users
} from 'lucide-react'
import { formatRole } from '@/lib/format-utils'

interface CreateInviteButtonProps {
  onMemberAdded?: () => void
}

export function CreateInviteButton({ onMemberAdded }: CreateInviteButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [newInvite, setNewInvite] = useState({
    default_role: 'student',
    max_uses: '',
    expires_in_days: ''
  })

  const handleCreateInvite = async () => {
    setCreating(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setError('Authentication required')
        return
      }

      const requestBody = {
        default_role: newInvite.default_role,
        max_uses: newInvite.max_uses ? parseInt(newInvite.max_uses) : null,
        expires_in_days: newInvite.expires_in_days ? parseInt(newInvite.expires_in_days) : null
      }

      const response = await fetch('/api/team/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        const url = `${window.location.origin}/join?code=${data.invite.invite_code}`
        setInviteUrl(url)

        // Auto-copy to clipboard
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 3000)
        } catch (err) {
          console.error('Failed to copy to clipboard:', err)
        }

        // Don't call onMemberAdded here - let user see the invite link first
      } else {
        // Handle specific database errors
        let errorMessage = data.error || 'Failed to create invite'
        if (errorMessage.includes('relation "team_invites" does not exist') ||
            errorMessage.includes('function generate_invite_code() does not exist')) {
          errorMessage = 'Team invites feature not yet set up. Please run the database migration first.'
        }
        setError(errorMessage)
      }
    } catch (err) {
      console.error('Error creating invite:', err)
      setError('Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Failed to copy link to clipboard')
    }
  }

  const handleClose = () => {
    setModalOpen(false)
    setInviteUrl(null)
    setCopied(false)
    setError(null)
    setNewInvite({
      default_role: 'student',
      max_uses: '',
      expires_in_days: ''
    })

    // Call onMemberAdded when user closes the dialog after seeing the invite
    if (onMemberAdded) {
      onMemberAdded()
    }
  }

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose()
      } else {
        setModalOpen(open)
      }
    }}>
      <DialogTrigger asChild>
        <Button className="btn-accent">
          <Link2 className="w-4 h-4 mr-2" />
          Create Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team Invite Link</DialogTitle>
          <DialogDescription>
            Generate a special link that others can use to join your team
          </DialogDescription>
        </DialogHeader>

        {!inviteUrl ? (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Default Role</Label>
              <Select
                value={newInvite.default_role}
                onValueChange={(value) => setNewInvite(prev => ({ ...prev, default_role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                New members will be assigned this role automatically
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_uses">Max Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  placeholder="Unlimited"
                  min="1"
                  value={newInvite.max_uses}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, max_uses: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_in_days">Expires (days)</Label>
                <Input
                  id="expires_in_days"
                  type="number"
                  placeholder="Never"
                  min="1"
                  value={newInvite.expires_in_days}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, expires_in_days: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateInvite} disabled={creating} className="btn-accent">
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invite'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Invite Link Created!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link with people you want to join as <strong>{formatRole(newInvite.default_role)}</strong>
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Invite Link</span>
                  {copied && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Copied!
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}