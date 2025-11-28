import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { Message } from '@/types/messaging'

export function useMessagesRealtime(
  channelId: string | undefined,
  onNewMessage?: (message: Message) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!channelId) return

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: any) => {
          // Fetch the complete message with relationships
          const { data: message, error } = await supabase
            .from('messages')
            .select(`
              *,
              author:user_id(
                id,
                email,
                user_metadata
              ),
              attachments:message_attachments(*),
              mentions:message_mentions(
                *,
                user:mentioned_user_id(
                  id,
                  email,
                  user_metadata
                )
              ),
              reactions:message_reactions(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && message) {
            onNewMessage?.(message)
            // Invalidate messages query to trigger a refetch
            queryClient.invalidateQueries({
              queryKey: ['messages', channelId],
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          // Invalidate messages query on update
          queryClient.invalidateQueries({
            queryKey: ['messages', channelId],
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          // Invalidate messages query on delete
          queryClient.invalidateQueries({
            queryKey: ['messages', channelId],
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [channelId, queryClient, onNewMessage])
}

export function useChannelsRealtime(teamId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!teamId) return

    // Subscribe to channel changes
    const subscription = supabase
      .channel(`channels:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_channels',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          // Invalidate channels query
          queryClient.invalidateQueries({
            queryKey: ['messaging-channels', teamId],
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_channels',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          // Invalidate channels query
          queryClient.invalidateQueries({
            queryKey: ['messaging-channels', teamId],
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [teamId, queryClient])
}

export function useReactionsRealtime(channelId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!channelId) return

    // Subscribe to reaction changes
    const subscription = supabase
      .channel(`reactions:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          // Invalidate messages query
          queryClient.invalidateQueries({
            queryKey: ['messages', channelId],
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          // Invalidate messages query
          queryClient.invalidateQueries({
            queryKey: ['messages', channelId],
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [channelId, queryClient])
}
