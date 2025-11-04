'use client'

import Link from 'next/link'
import { FileText, User } from 'lucide-react'

interface NotebookPage {
  id: string
  title: string
  updated_at: string
  updated_by: string
  team_members?: { first_name: string; last_name: string }
}

interface RecentNotebookListProps {
  pages: NotebookPage[]
}

export function RecentNotebookList({ pages }: RecentNotebookListProps) {
  if (!pages || pages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No recent notebook updates
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getUpdatedBy = (page: NotebookPage) => {
    if (page.team_members) {
      return `${page.team_members.first_name} ${page.team_members.last_name}`
    }
    return 'Unknown'
  }

  return (
    <div className="space-y-3">
      {pages.map((page) => (
        <Link
          key={page.id}
          href={`/notebook/${page.id}`}
          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer block"
        >
          <div className="flex-shrink-0 mt-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate mb-1">{page.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{getUpdatedBy(page)}</span>
              <span>•</span>
              <span>{formatDate(page.updated_at)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
