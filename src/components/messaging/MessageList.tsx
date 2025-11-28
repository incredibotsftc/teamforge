'use client'

import React, { useEffect, useRef, useLayoutEffect } from 'react'
import { Message as MessageType } from '@/types/messaging'
import { Message } from './Message'
import { Loader2 } from 'lucide-react'

interface MessageListProps {
  messages: MessageType[]
  isLoading?: boolean
  onReply?: (message: MessageType) => void
  onReact?: (messageId: string, emoji: string) => void
}

export function MessageList({
  messages,
  isLoading = false,
  onReply,
  onReact,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const isConsecutive = (current: MessageType, previous?: MessageType): boolean => {
    if (!previous) return false

    // Messages are consecutive if:
    // 1. Same author
    // 2. Within 5 minutes of each other
    const sameAuthor = current.user_id === previous.user_id
    const currentTime = new Date(current.created_at).getTime()
    const previousTime = new Date(previous.created_at).getTime()
    const withinFiveMinutes = currentTime - previousTime < 5 * 60 * 1000

    return sameAuthor && withinFiveMinutes
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto flex flex-col bg-background"
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <Message
              key={`${message.id}-${index}`}
              message={message}
              isConsecutive={isConsecutive(message, messages[index - 1])}
              onReply={onReply}
              onReact={onReact}
            />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  )
}
