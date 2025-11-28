'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { extractMentions, getMatchingUsers } from '@/lib/messagingHelpers'
import { MentionableUser } from '@/lib/messagingHelpers'
import { Message } from '@/types/messaging'

interface MessageInputProps {
  onSend: (content: string, mentionedUserIds: string[], attachmentFiles?: File[]) => Promise<void>
  onAttach?: (files: File[]) => Promise<void>
  disabled?: boolean
  placeholder?: string
  teamMembers?: MentionableUser[]
}

export function MessageInput({
  onSend,
  onAttach,
  disabled = false,
  placeholder = 'Message #channel...',
  teamMembers = [],
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [attachments, setAttachments] = useState<File[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)

  const matchingUsers = getMatchingUsers(mentionQuery, teamMembers)

  // Handle @mention detection
  useEffect(() => {
    if (!textareaRef.current) return

    const text = content
    const pos = textareaRef.current.selectionStart

    // Find if we're in a mention (word starting with @)
    let mentionStart = pos - 1
    while (mentionStart >= 0 && /[@a-zA-Z0-9._-]/.test(text[mentionStart])) {
      mentionStart--
    }
    mentionStart++

    if (mentionStart < pos && text[mentionStart] === '@') {
      const query = text.substring(mentionStart + 1, pos)
      setMentionQuery(query)
      setShowMentions(query.length > 0)
      setSelectedMentionIndex(0)
    } else {
      setShowMentions(false)
    }
  }, [content, cursorPosition])

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return

    setIsLoading(true)
    try {
      const mentionedUserIds = extractMentions(content).map((username) => {
        const user = teamMembers.find(
          (u) =>
            (u.full_name || u.email.split('@')[0]).toLowerCase() ===
            username.toLowerCase()
        )
        return user?.id || ''
      })

      await onSend(content, mentionedUserIds.filter(Boolean), attachments)
      setContent('')
      setAttachments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectMention = (user: MentionableUser) => {
    if (!textareaRef.current) return

    const text = content
    const pos = textareaRef.current.selectionStart

    // Find mention start
    let mentionStart = pos - 1
    while (mentionStart >= 0 && /[@a-zA-Z0-9._-]/.test(text[mentionStart])) {
      mentionStart--
    }
    mentionStart++

    const before = text.substring(0, mentionStart)
    const after = text.substring(pos)
    const userName = user.full_name || user.email.split('@')[0]
    const newText = `${before}@${userName} ${after}`

    setContent(newText)
    setShowMentions(false)

    // Move cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + userName.length + 2
        textareaRef.current.setSelectionRange(newPos, newPos)
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && matchingUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) =>
          prev < matchingUsers.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelectMention(matchingUsers[selectedMentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments([...attachments, ...files])

    if (onAttach) {
      await onAttach(files)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleReply = (message: Message) => {
    setReplyTo(message)
  }

  const clearReply = () => {
    setReplyTo(null)
  }

  return (
    <div className="border-t p-4 space-y-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <span className="font-medium">Replying to:</span>{' '}
          <span>{replyTo.content}</span>
          <button
            onClick={clearReply}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm"
            >
              <span className="truncate max-w-xs">{file.name}</span>
              <button
                onClick={() =>
                  setAttachments(attachments.filter((_, i) => i !== idx))
                }
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="relative flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleAttachmentSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="flex-shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setCursorPosition(e.target.selectionStart)
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
            onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="resize-none"
            rows={3}
          />

          {/* Mention suggestions */}
          {showMentions && matchingUsers.length > 0 && (
            <div
              ref={mentionListRef}
              className="absolute bottom-full left-0 mb-2 w-full bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              {matchingUsers.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectMention(user)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                    index === selectedMentionIndex ? 'bg-muted' : ''
                  }`}
                >
                  <div className="font-medium">
                    {user.full_name || user.email.split('@')[0]}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || isLoading || (!content.trim() && attachments.length === 0)}
          className="flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Type @ to mention someone • Enter to send
      </div>
    </div>
  )
}
