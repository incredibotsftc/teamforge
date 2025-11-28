'use client'

import React from 'react'
import { Message as MessageType, MessageAttachment } from '@/types/messaging'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatMessageTime, isMessageEdited, formatFileSize } from '@/lib/messagingHelpers'
import { Download, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider';

interface MessageProps {
  message: MessageType
  isConsecutive?: boolean
  onReply?: (message: MessageType) => void
  onReact?: (messageId: string, emoji: string) => void
}

export function Message({
  message,
  isConsecutive = false,
  onReply,
  onReact,
}: MessageProps) {
  const { user } = useAuth();

  const authorName = message.author?.user_metadata?.full_name || 
    message.author?.email?.split('@')[0] || 
    'Unknown User'
  const avatarUrl = message.author?.user_metadata?.avatar_url
  const avatarInitials = authorName.charAt(0).toUpperCase()

  const handleEmojiReaction = () => {
    if (onReact) {
      onReact(message.id, '👍')
    }
  }

  const isCurrentUser = user ? message.user_id === user.id : false;

  return (
    <div
      className={`flex gap-3 px-4 py-2 hover:bg-muted/50 transition-colors group ${
        isCurrentUser ? 'justify-end text-right' : 'justify-start text-left'
      }`}
    >
      {!isConsecutive && !isCurrentUser && (
        <Avatar className="w-10 h-10 mt-0.5 flex-shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={authorName} />}
          <AvatarFallback className="text-xs font-semibold">
            {avatarInitials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        {!isConsecutive && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.created_at)}
            </span>
            {isMessageEdited(message) && (
              <span className="text-xs text-muted-foreground italic">(edited)</span>
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="text-sm break-words bg-muted p-2 rounded-lg">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <MessageAttachmentComponent
                key={attachment.id}
                attachment={attachment}
              />
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {aggregateReactions(message.reactions).map((reaction) => (
              <div
                key={reaction.emoji}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs hover:bg-muted/80 cursor-pointer transition-colors"
                onClick={handleEmojiReaction}
              >
                <span>{reaction.emoji}</span>
                <span className="text-muted-foreground">{reaction.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add Reaction Button */}
        <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEmojiReaction}
            className="p-1 rounded hover:bg-muted text-xs"
            title="Add reaction"
          >
            😊
          </button>
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded hover:bg-muted text-xs"
              title="Reply"
            >
              ↩️
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface MessageAttachmentComponentProps {
  attachment: MessageAttachment
}

function MessageAttachmentComponent({ attachment }: MessageAttachmentComponentProps) {
  const isImage = attachment.file_type?.startsWith('image/')
  const isVideo = attachment.file_type?.startsWith('video/')

  return (
    <div className="border rounded-lg overflow-hidden bg-muted p-2 max-w-md">
      {isImage && (
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="max-h-64 rounded cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(attachment.file_url, '_blank')}
        />
      )}
      {isVideo && (
        <video
          src={attachment.file_url}
          className="max-h-64 rounded cursor-pointer"
          controls
        />
      )}
      {!isImage && !isVideo && (
        <div className="flex items-center gap-2 p-1">
          <FileIcon className="w-6 h-6 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{attachment.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {attachment.file_size ? formatFileSize(attachment.file_size) : 'Unknown size'}
            </p>
          </div>
          <a
            href={attachment.file_url}
            download={attachment.file_name}
            className="p-1 hover:bg-background rounded transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}

// Helper function to aggregate reactions
function aggregateReactions(
  reactions: Array<{ emoji: string }>
): Array<{ emoji: string; count: number }> {
  const aggregated: Record<string, number> = {}

  reactions.forEach((reaction) => {
    aggregated[reaction.emoji] = (aggregated[reaction.emoji] || 0) + 1
  })

  return Object.entries(aggregated).map(([emoji, count]) => ({
    emoji,
    count,
  }))
}
