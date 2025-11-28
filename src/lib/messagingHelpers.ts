// Utilities for message processing and mentions

import React from 'react'

export interface MentionMatch {
  id: string
  text: string
  index: number
}

export interface MentionableUser {
  id: string
  email: string
  full_name?: string
}

/**
 * Parse @mentions from message content
 * Extracts all @username mentions from a string
 */
export function extractMentions(content: string): string[] {
  const mentionPattern = /@([a-zA-Z0-9._-]+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionPattern.exec(content)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Find all mentions in content and return their positions
 */
export function findMentionPositions(content: string): MentionMatch[] {
  const mentionPattern = /@([a-zA-Z0-9._-]+)/g
  const matches: MentionMatch[] = []
  let match

  while ((match = mentionPattern.exec(content)) !== null) {
    matches.push({
      id: match[1],
      text: match[0],
      index: match.index,
    })
  }

  return matches
}

/**
 * Replace mention text with user display names
 */
export function renderMentions(
  content: string,
  users: Map<string, MentionableUser>
): string {
  let result = content
  const mentions = findMentionPositions(content)

  // Sort by index in reverse to avoid offset issues when replacing
  mentions.reverse().forEach((mention) => {
    const user = users.get(mention.id)
    if (user) {
      const displayName = user.full_name || user.email.split('@')[0]
      result = `${result.slice(0, mention.index)}@${displayName}${result.slice(
        mention.index + mention.text.length
      )}`
    }
  })

  return result
}

/**
 * Get matching users for mention autocomplete
 */
export function getMatchingUsers(
  query: string,
  allUsers: MentionableUser[]
): MentionableUser[] {
  if (!query || query.length === 0) {
    return allUsers
  }

  const lowerQuery = query.toLowerCase()
  return allUsers.filter((user) => {
    const name = user.full_name || user.email
    return name.toLowerCase().includes(lowerQuery)
  })
}

/**
 * Get plain text with mentions replaced by display names
 */
export function getDisplayText(
  content: string,
  users: Map<string, MentionableUser>
): string {
  let result = content
  const mentions = findMentionPositions(content)

  // Sort by index in reverse to avoid offset issues when replacing
  mentions.reverse().forEach((mention) => {
    const user = users.get(mention.id)
    if (user) {
      const displayName = user.full_name || user.email.split('@')[0]
      result = `${result.slice(0, mention.index)}@${displayName}${result.slice(
        mention.index + mention.text.length
      )}`
    }
  })

  return result
}

/**
 * Format timestamp for messages
 */
export function formatMessageTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (!d || isNaN(d.getTime())) {
    return "Invalid date"
  }
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return "now"
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return d.toLocaleDateString()
  }
}

/**
 * Check if message has been edited
 */
export function isMessageEdited(message: {
  created_at: string
  edited_at?: string
}): boolean {
  return !!message.edited_at
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Validate file for upload
 */
export function isValidMessageAttachment(file: File): {
  valid: boolean
  error?: string
} {
  const maxSize = 25 * 1024 * 1024 // 25MB
  const allowedTypes = [
    "image/",
    "video/",
    "audio/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument",
  ]

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)} limit`,
    }
  }

  const isAllowed = allowedTypes.some((type) => file.type.startsWith(type))
  if (!isAllowed) {
    return {
      valid: false,
      error: "File type not supported",
    }
  }

  return { valid: true }
}
