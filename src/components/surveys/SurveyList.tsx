'use client'

import type { Survey } from '@/types/surveys'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, BarChart3 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface SurveyListProps {
  surveys: Survey[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewResponses: (id: string) => void
  searchQuery: string
}

export function SurveyList({ surveys, onEdit, onDelete, onViewResponses, searchQuery }: SurveyListProps) {
  // Filter surveys based on search query
  const filteredSurveys = surveys.filter((survey) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const title = survey.title.toLowerCase()
    const description = (survey.description || '').toLowerCase()

    return (
      title.includes(searchLower) ||
      description.includes(searchLower)
    )
  })

  if (surveys.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No surveys created yet. Click &quot;Create Survey&quot; to get started.
      </p>
    )
  }

  if (filteredSurveys.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No surveys match your search.
      </p>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'published':
        return <Badge variant="default" className="bg-green-600">Published</Badge>
      case 'closed':
        return <Badge variant="outline">Closed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Questions</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredSurveys.map((survey) => (
          <TableRow
            key={survey.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={(e) => {
              // Don't navigate if clicking on action buttons
              const target = e.target as HTMLElement
              if (target.closest('button')) return

              // Navigate based on survey status
              if (survey.status === 'published' || survey.status === 'closed') {
                onViewResponses(survey.id)
              } else {
                onEdit(survey.id)
              }
            }}
          >
            <TableCell>
              <div>
                <div className="font-medium">{survey.title}</div>
                {survey.description && (
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {survey.description}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(survey.status)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {survey.question_count || 0} questions
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(survey.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(survey.id)
                  }}
                  title="Edit survey"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewResponses(survey.id)
                  }}
                  title="View responses"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(survey.id)
                  }}
                  title="Delete survey"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
