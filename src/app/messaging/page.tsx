'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ChannelList } from '@/components/messaging/ChannelList'
import { MessageList } from '@/components/messaging/MessageList'
import { MessageInput } from '@/components/messaging/MessageInput'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import {
  useMessagingChannels,
  useCreateChannel,
  useMessages,
  useSendMessage,
  useAddReaction,
} from '@/hooks/useMessaging'
import {
  useMessagesRealtime,
  useChannelsRealtime,
  useReactionsRealtime,
} from '@/hooks/useMessagingRealtime'
import { Message as MessageType, MessageChannel } from '@/types/messaging'
import { MessageSquare, ChevronLeft } from 'lucide-react'
import { MentionableUser } from '@/lib/messagingHelpers'
import { Button } from '@/components/ui/button'

export default function MessagingPage() {
  const router = useRouter()
  const { team, teamMembers } = useAppData()
  const { user } = useAuth()
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>()
  const [defaultChannelCreated, setDefaultChannelCreated] = useState(false)
  const [showChannelList, setShowChannelList] = useState(true)

  // Fetch channels
  const {
    data: channels = [],
    isLoading: channelsLoading,
    refetch: refetchChannels,
  } = useMessagingChannels(team?.id)

  // Create channel mutation
  const createChannelMutation = useCreateChannel(team?.id)

  // Fetch messages
  const {
    data: messages = [],
    isLoading: messagesLoading,
  } = useMessages(team?.id, selectedChannelId)

  // Send message mutation
  const sendMessageMutation = useSendMessage(team?.id, selectedChannelId)

  // Add reaction mutation
  const addReactionMutation = useAddReaction(team?.id, selectedChannelId)

  // Real-time subscriptions
  useChannelsRealtime(team?.id)
  useMessagesRealtime(selectedChannelId)
  useReactionsRealtime(selectedChannelId)

  // Select first channel when available
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id)
    }
  }, [channels])

  // Create default "general" channel if none exist
  useEffect(() => {
    if (
      channels.length === 0 &&
      !channelsLoading &&
      !defaultChannelCreated &&
      team?.id
    ) {
      createChannelMutation.mutate(
        {
          name: 'general',
          description: 'General discussion for the team',
        },
        {
          onSuccess: () => {
            setDefaultChannelCreated(true)
            refetchChannels()
          },
        }
      )
    }
  }, [channels.length, channelsLoading, defaultChannelCreated, team?.id])

  const handleCreateChannel = async (name: string, description?: string) => {
    return new Promise<void>((resolve, reject) => {
      createChannelMutation.mutate(
        { name, description },
        {
          onSuccess: () => {
            refetchChannels()
            resolve()
          },
          onError: (error) => {
            console.error('Failed to create channel:', error)
            reject(error)
          },
        }
      )
    })
  }

  const handleSendMessage = async (content: string, mentionedUserIds: string[], attachmentFiles?: File[]) => {
    if (!selectedChannelId) return

    return new Promise<void>(async (resolve, reject) => {
      try {
        // First, send the message
        sendMessageMutation.mutate(
          { content, mentionedUserIds },
          {
            onSuccess: async (data) => {
              // If there are attachments, upload them
              if (attachmentFiles && attachmentFiles.length > 0) {
                const messageId = data.message.id
                for (const file of attachmentFiles) {
                  try {
                    // Note: In production, you'd want to upload files directly to storage
                    // For now, we'll just mark success since the message is sent
                    await fetch(
                      `/api/messaging/${team?.id}/${selectedChannelId}/${messageId}/attachments`,
                      {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${user?.id}`,
                        },
                        body: (() => {
                          const fd = new FormData()
                          fd.append('file', file)
                          return fd
                        })(),
                      }
                    )
                  } catch (err) {
                    console.error('Failed to upload attachment:', err)
                  }
                }
              }
              resolve()
            },
            onError: () => {
              reject(new Error('Failed to send message'))
            },
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!selectedChannelId) return

    return new Promise<void>((resolve, reject) => {
      addReactionMutation.mutate(
        { messageId, emoji },
        {
          onSuccess: () => {
            resolve()
          },
          onError: () => {
            reject(new Error('Failed to add reaction'))
          },
        }
      )
    })
  }

  // Convert team members to MentionableUser
  const mentionableUsers: MentionableUser[] = teamMembers.map((member) => ({
    id: member.id,
    email: member.email,
    full_name: `${member.first_name} ${member.last_name}`.trim(),
  }))

  if (!team) {
    return (
      <DashboardLayout pageTitle="Messaging" pageIcon={MessageSquare}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No team selected</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      pageTitle="Messaging"
      pageIcon={MessageSquare}
      disableContentScroll
    >
      <div className="flex h-full w-full bg-background">
        {/* Channels Sidebar */}
        {(showChannelList || !selectedChannelId) && (
          <div className="w-64 h-full hidden lg:flex flex-col bg-muted/20">
            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={(channelId) => {
                setSelectedChannelId(channelId)
                setShowChannelList(false)
              }}
              onCreateChannel={handleCreateChannel}
              isLoading={channelsLoading}
            />
          </div>
        )}

        {/* Mobile channel selector */}
        {!selectedChannelId && (
          <div className="lg:hidden w-full">
            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={(channelId) => {
                setSelectedChannelId(channelId)
                setShowChannelList(false)
              }}
              onCreateChannel={handleCreateChannel}
              isLoading={channelsLoading}
            />
          </div>
        )}

        {/* Main Chat Area */}
        {selectedChannelId && (
          <div className="flex-1 flex flex-col h-full">
            {/* Channel Header */}
            {channels.length > 0 && (
              <div className="border-b p-4 bg-muted/20 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setShowChannelList(true)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <h1 className="font-semibold">
                      {channels.find((c) => c.id === selectedChannelId)?.name}
                    </h1>
                  </div>
                  {channels.find((c) => c.id === selectedChannelId)?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {channels.find((c) => c.id === selectedChannelId)?.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <MessageList
              messages={messages}
              isLoading={messagesLoading}
              onReact={handleAddReaction}
            />

            {/* Message Input */}
            <MessageInput
              onSend={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              placeholder={`Message ${
                channels.find((c) => c.id === selectedChannelId)?.name || 'channel'
              }...`}
              teamMembers={mentionableUsers}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
