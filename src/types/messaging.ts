// Types for the messaging system

export interface MessageChannel {
  id: string
  team_id: string
  name: string
  description?: string
  is_direct_message: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  edited_at?: string
  deleted_at?: string
  created_at: string
  author?: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  }
  attachments?: MessageAttachment[]
  mentions?: MessageMention[]
  reactions?: MessageReaction[]
}

export interface MessageAttachment {
  id: string
  message_id: string
  file_url: string
  file_name: string
  file_type?: string
  file_size?: number
  created_at: string
}

export interface MessageMention {
  id: string
  message_id: string
  mentioned_user_id: string
  is_read: boolean
  created_at: string
  user?: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface ChannelMember {
  id: string
  channel_id: string
  user_id: string
  last_read_message_id?: string
  last_read_at: string
  created_at: string
}

export interface MessageInput {
  content: string
  attachments: File[]
  mentions: string[] // User IDs that are mentioned
}
