'use client'

import React, { useState } from 'react'
import { MessageChannel } from '@/types/messaging'
import { Plus, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ChannelListProps {
  channels: MessageChannel[]
  selectedChannelId?: string
  onSelectChannel: (channelId: string) => void
  onCreateChannel?: (name: string, description?: string) => Promise<void>
  isLoading?: boolean
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  isLoading = false,
}: ChannelListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDescription, setNewChannelDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !onCreateChannel) return

    setIsCreating(true)
    try {
      await onCreateChannel(newChannelName, newChannelDescription)
      setNewChannelName('')
      setNewChannelDescription('')
      setShowCreateDialog(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Channels</h2>
          {onCreateChannel && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowCreateDialog(true)}
              className="h-7 w-7"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading channels...
          </div>
        ) : channels.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No channels yet
          </div>
        ) : (
          <nav className="space-y-1 px-2 py-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription>
              Create a new channel for your team to communicate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Channel Name</label>
              <Input
                placeholder="e.g., general"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="What is this channel about?"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Channel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
