'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Task {
  id: string
  title: string
  due_date: string
  priority?: string
  status: string
  assignees?: Array<{ first_name: string; last_name: string }>
}

interface TasksDueSoonListProps {
  tasks: Task[]
}

export function TasksDueSoonList({ tasks }: TasksDueSoonListProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No tasks due soon
      </div>
    )
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getAssigneeNames = (assignees?: Array<{ first_name: string; last_name: string }>) => {
    if (!assignees || assignees.length === 0) return 'Unassigned'
    return assignees.map(a => `${a.first_name} ${a.last_name}`).join(', ')
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tasks?taskId=${task.id}`}
          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer block"
        >
          <div className="flex-shrink-0 mt-1">
            {getStatusIcon(task.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{task.title}</p>
              {task.priority && (
                <Badge className={getPriorityColor(task.priority)} variant="secondary">
                  {task.priority}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Due: {formatDate(task.due_date)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {getAssigneeNames(task.assignees)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
