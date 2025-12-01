import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/AuthProvider'
import { MessageChannel, Message } from '@/types/messaging'

export function useMessagingChannels(teamId: string | undefined) {
  const { user, session } = useAuth()

  return useQuery({
    queryKey: ['messaging-channels', teamId],
    queryFn: async () => {
      if (!teamId || !user || !session) return []

      const response = await fetch(`/api/messaging/${teamId}/channels`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch channels')
      const data = await response.json()
      return data.channels as MessageChannel[]
    },
    enabled: !!teamId && !!user && !!session,
  })
}

export function useCreateChannel(teamId: string | undefined) {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!teamId || !user || !session) throw new Error('Missing team ID, user, or session')

      console.log('Creating channel with:', { teamId, userId: user.id, input })
      const response = await fetch(`/api/messaging/${teamId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(input),
      })
      console.log('Channel creation response status:', response.status, response.statusText)

      if (!response.ok) {
        const text = await response.text()
        console.error('Channel creation error:', { 
          status: response.status, 
          statusText: response.statusText,
          body: text,
          contentType: response.headers.get('content-type')
        })
        let errorMessage = `Failed to create channel (${response.status})`
        try {
          const errorData = JSON.parse(text)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = text || errorMessage
        }
        throw new Error(errorMessage)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels', teamId] })
    },
  })
}

export function useMessages(teamId: string | undefined, channelId: string | undefined) {
  const { user, session } = useAuth()

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      if (!teamId || !channelId || !user || !session) return []

      const response = await fetch(
        `/api/messaging/${teamId}/${channelId}/messages?limit=50&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      return data.messages as Message[]
    },
    enabled: !!teamId && !!channelId && !!user && !!session,
  })
}

export function useSendMessage(teamId: string | undefined, channelId: string | undefined) {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { content: string; mentionedUserIds?: string[] }) => {
      if (!teamId || !channelId || !user || !session) throw new Error('Missing required data')

      // Optimistically update the cache
      const tempMessage = {
        id: `temp-${Date.now()}`,
        content: input.content,
        created_at: new Date().toISOString(),
        user_id: user.id,
        mentionedUserIds: input.mentionedUserIds || [],
      }

      queryClient.setQueryData(['messages', channelId], (oldMessages: any) => {
        return oldMessages ? [tempMessage, ...oldMessages] : [tempMessage]
      })

      const response = await fetch(
        `/api/messaging/${teamId}/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(input),
        }
      )

      if (!response.ok) throw new Error('Failed to send message')
      const newMessage = await response.json()

      // Replace the temporary message with the real one
      queryClient.setQueryData(['messages', channelId], (oldMessages: any) => {
        return oldMessages.map((msg: any) =>
          msg.id === tempMessage.id ? newMessage : msg
        )
      })

      return newMessage
    },
    onError: () => {
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })
}

export function useAddReaction(teamId: string | undefined, channelId: string | undefined) {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { messageId: string; emoji: string }) => {
      if (!teamId || !channelId || !user || !session) throw new Error('Missing required data')

      const response = await fetch(
        `/api/messaging/${teamId}/${channelId}/${input.messageId}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ emoji: input.emoji }),
        }
      )

      if (!response.ok) throw new Error('Failed to add reaction')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })
}

export function useUploadAttachment(
  teamId: string | undefined,
  channelId: string | undefined,
  messageId: string | undefined
) {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!teamId || !channelId || !messageId || !user || !session) {
        throw new Error('Missing required data')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `/api/messaging/${teamId}/${channelId}/${messageId}/attachments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      )

      if (!response.ok) throw new Error('Failed to upload attachment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })
}
