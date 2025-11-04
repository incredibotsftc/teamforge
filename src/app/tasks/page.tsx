'use client'


import { useEffect, useState } from "react"
import { Trash2, Pencil, CalendarIcon, Clock, FileText, MoreVertical, Search, X } from "lucide-react"
import { useAppData } from "@/components/AppDataProvider"
import { supabase } from "@/lib/supabase"
import { EntityNotebookSidebar } from '@/components/notebook/EntityNotebookSidebar'
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, FolderKanban } from "lucide-react"
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


const STATUS_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
]

const CATEGORIES = [
  "outreach",
  "mentoring",
  "fundraising",
  "robot_building",
  "programming",
  "documentation",
]

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
}

type TaskFormProps = {
  onCreate: () => void,
  onClose: () => void,
  teamId: string,
  seasonId: string,
  members: TeamMember[],
  initialTask?: Task,
  isEdit?: boolean
}

function TaskForm({ onCreate, onClose, teamId, seasonId, members, initialTask, isEdit }: TaskFormProps) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  // If editing, use initialTask values, else defaults
  const now = new Date()
  const initialDue = initialTask?.due_date ? new Date(initialTask.due_date) : now
  const [title, setTitle] = useState(initialTask?.title || "")
  const [description, setDescription] = useState(initialTask?.description || "")
  const [category, setCategory] = useState(initialTask?.category || CATEGORIES[0])
  const [status, setStatus] = useState(initialTask?.status || "todo")
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialTask?.assignee_ids || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDue)
  const [dueTime, setDueTime] = useState(`${pad(initialDue.getHours())}:${pad(initialDue.getMinutes())}`)

  const handleToggleAssignee = (id: string) => {
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id])
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    // Prevent submitting if no assignees selected
    if (assigneeIds.length === 0) {
      setError("Please assign the task to at least one team member.")
      setLoading(false)
      return
    }
    if (!dueDate) {
      setError("Please select a due date.")
      setLoading(false)
      return
    }
    try {
      // Compose due date string in ISO format
      const dueDateStr = `${format(dueDate, 'yyyy-MM-dd')}T${dueTime}:00`
      if (isEdit && initialTask) {
        // Update existing task
        const payload = {
          title,
          description,
          category,
          status,
          assignee_ids: assigneeIds,
          due_date: dueDateStr,
        }
        const { error: updateError } = await supabase
          .from("tasks")
          .update(payload)
          .eq("id", initialTask.id)
        if (updateError) {
          setError(updateError.message || "Failed to update task")
          setLoading(false)
          return
        }
        onCreate()
        onClose()
      } else {
        // Create new task
        const payload = {
          team_id: teamId,
          season_id: seasonId,
          title,
          description,
          category,
          status: "todo",
          assignee_ids: assigneeIds,
          due_date: dueDateStr,
        }
        const result = await supabase.from("tasks").insert(payload).select()
        const { error: insertError, data } = result
        if (insertError) {
          setError(insertError.message || "Failed to create task")
          setLoading(false)
          return
        }
        if (!data || data.length === 0) {
          setError("Task was not saved. Please check your Supabase Row Level Security (RLS) policies and table permissions.")
          setLoading(false)
          return
        }
        onCreate()
        onClose()
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save task")
    } finally {
      setLoading(false)
    }
  }

  // Split members by role
  const mentorsAndAdmins = members.filter(m => ["mentor", "admin"].includes(m.role.toLowerCase()))
  const students = members.filter(m => !["mentor", "admin"].includes(m.role.toLowerCase()))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isEdit && (
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_COLUMNS.map(col => (
                <SelectItem key={col.key} value={col.key}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Due Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueTime">Due Time</Label>
        <div className="relative">
          <Input
            id="dueTime"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
          <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Assign to:</label>
        <div className="mb-2">
          <div className="font-semibold text-xs mb-2">Mentors / Admins</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {mentorsAndAdmins.length === 0 && <span className="text-gray-400 text-xs">No mentors/admins</span>}
            {mentorsAndAdmins.map(member => {
              const selected = assigneeIds.includes(member.id)
              return (
                <button
                  type="button"
                  key={member.id}
                  className={`px-3 py-1 rounded border text-sm focus:outline-none transition ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'}`}
                  onClick={() => handleToggleAssignee(member.id)}
                >
                  {member.first_name} {member.last_name} <span className={`text-xs ${selected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>({member.role})</span>
                </button>
              )
            })}
          </div>
          <div className="font-semibold text-xs mb-2">Students</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {students.length === 0 && <span className="text-gray-400 text-xs">No students</span>}
            {students.map(member => {
              const selected = assigneeIds.includes(member.id)
              return (
                <button
                  type="button"
                  key={member.id}
                  className={`px-3 py-1 rounded border text-sm focus:outline-none transition ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'}`}
                  onClick={() => handleToggleAssignee(member.id)}
                >
                  {member.first_name} {member.last_name} <span className={`text-xs ${selected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>({member.role})</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit" className="btn-accent" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? "Update Task" : "Create Task")}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

interface Task {
  id: string
  title: string
  description: string
  category: string
  status: string
  assignee_ids?: string[] | null
  due_date?: string | Date | null
}

// Draggable TaskCard component
function DraggableTaskCard({ task, index, onStatusChange, onDelete, onEdit, onNotebook, members }: {
  task: Task,
  index: number,
  onStatusChange: (task: Task) => void,
  onDelete: (task: Task) => void,
  onEdit: (task: Task) => void,
  onNotebook: (task: Task) => void,
  members: TeamMember[],
}) {
  const assignees = (task.assignee_ids || []).map(id => members.find(m => m.id === id)).filter(Boolean)

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2"
        >
          <Card className={cn(
            "cursor-grab active:cursor-grabbing transition-shadow",
            snapshot.isDragging && "shadow-xl"
          )}>
            <CardHeader className="py-1.5 px-2.5 md:py-2.5 md:px-4">
              <div className="flex items-center gap-2 min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="text-sm md:text-base font-semibold truncate flex-1 min-w-0 cursor-default">
                        {task.title}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{task.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Below xl: Dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 flex-shrink-0 xl:hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onNotebook(task)}>
                      <FileText className="mr-2 h-4 w-4 text-purple-500" />
                      View Notes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                      Edit Task
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* xl and above: Inline buttons */}
                <div className="hidden xl:flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onNotebook(task)} title="View Task Notes">
                    <FileText className="w-3.5 h-3.5 text-purple-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(task)} title="Edit Task">
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(task)} title="Delete Task">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
              {assignees.length > 0 && (
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1 truncate">
                  <span className="font-normal text-muted-foreground">Assigned:</span> {assignees.map(a => `${a!.first_name} ${a!.last_name}`).join(", ")}
                </div>
              )}
              {assignees.length === 0 && (
                <div className="text-xs text-muted-foreground mt-1 italic">
                  Unassigned
                </div>
              )}
            </CardHeader>
            <CardContent className="py-1.5 px-2.5 md:py-2 md:px-4 space-y-1.5">
              <div className="text-xs text-gray-500 capitalize">{task.category.replace("_", " ")}</div>
              <div className="text-sm mb-2 hidden md:block">{task.description}</div>
              {task.status !== "done" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onStatusChange(task)}
                  className="text-xs h-7 md:h-8"
                >
                  Mark as {task.status === "todo" ? "In Progress" : "Done"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

// Droppable column component
function DroppableColumn({
  id,
  title,
  tasks,
  members,
  onStatusChange,
  onDelete,
  onEdit,
  onNotebook
}: {
  id: string
  title: string
  tasks: Task[]
  members: TeamMember[]
  onStatusChange: (task: Task) => void
  onDelete: (task: Task) => void
  onEdit: (task: Task) => void
  onNotebook: (task: Task) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[200px] rounded-lg bg-muted/20 p-2 transition-colors",
              snapshot.isDraggingOver && "bg-muted/40 ring-2 ring-primary"
            )}
          >
            {tasks.length === 0 && (
              <div className="text-gray-400 text-sm p-2">No tasks</div>
            )}
            {tasks.map((task, index) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                index={index}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onEdit={onEdit}
                onNotebook={onNotebook}
                members={members}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default function ProjectBoardPage() {
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task)
  }

  const confirmDelete = async () => {
    if (!taskToDelete) return
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskToDelete.id)
    if (!error) fetchTasks()
    setTaskToDelete(null)
  }

  const { team, currentSeason, loading: appLoading } = useAppData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // Notebook sidebar state
  const [isNotebookOpen, setIsNotebookOpen] = useState(false)
  const [notebookTaskId, setNotebookTaskId] = useState<string | null>(null)
  const [notebookTaskTitle, setNotebookTaskTitle] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Search and filter state
  const [searchText, setSearchText] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const fetchTasks = async (teamOverride?: typeof team) => {
    const activeTeam = teamOverride || team
    if (!activeTeam || !currentSeason) {
      // Don't clear tasks if team or season is not loaded
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("team_id", activeTeam.id)
      .eq("season_id", currentSeason.id)
      .order("created_at", { ascending: false })
    setTasks((data as Task[]) || [])
    setLoading(false)
  }

  const fetchMembers = async () => {
    if (!team) return
    const { data } = await supabase
      .from("team_members")
      .select("id, first_name, last_name, email, role, is_active")
      .eq("team_id", team.id)
      .eq("is_active", true)
      .order("role", { ascending: true })
      .order("first_name", { ascending: true })
    setMembers((data as TeamMember[]) || [])
  }

  useEffect(() => {
    if (team && currentSeason) {
      fetchTasks(team)
      fetchMembers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, currentSeason])

  const handleStatusChange = async (task: Task) => {
    const newStatus = task.status === "todo" ? "in_progress" : "done"
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id)
    if (!error) fetchTasks()
  }

  const handleOpenNotebook = (task: Task) => {
    setNotebookTaskId(task.id)
    setNotebookTaskTitle(task.title)
    setIsNotebookOpen(true)
  }

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result

    // If no destination or dropped in same position, do nothing
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const taskId = draggableId
    const newStatus = destination.droppableId

    // Find the task being dragged
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistically reorder the tasks array
    setTasks(prev => {
      // Create a copy of the tasks array
      const newTasks = [...prev]

      // Remove the dragged task from its source position
      const taskIndex = newTasks.findIndex(t => t.id === taskId)
      const [movedTask] = newTasks.splice(taskIndex, 1)

      // Update the task's status
      movedTask.status = newStatus

      // Find where to insert the task in the destination column
      const destColumn = newTasks.filter(t => t.status === destination.droppableId)

      // Calculate the insertion index in the full tasks array
      let insertIndex = 0
      if (destColumn.length === 0) {
        // If destination column is empty, insert after all tasks with earlier statuses
        insertIndex = newTasks.findIndex(t => {
          const statusOrder = ['todo', 'in_progress', 'done']
          return statusOrder.indexOf(t.status) > statusOrder.indexOf(destination.droppableId)
        })
        if (insertIndex === -1) insertIndex = newTasks.length
      } else if (destination.index >= destColumn.length) {
        // Insert at the end of the destination column
        const lastTaskInDest = destColumn[destColumn.length - 1]
        insertIndex = newTasks.findIndex(t => t.id === lastTaskInDest.id) + 1
      } else {
        // Insert at the specified index within the destination column
        const taskAtDestIndex = destColumn[destination.index]
        insertIndex = newTasks.findIndex(t => t.id === taskAtDestIndex.id)
      }

      // Insert the task at the new position
      newTasks.splice(insertIndex, 0, movedTask)

      return newTasks
    })

    // Update in database
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)

    if (error) {
      console.error('Failed to update task status:', error)
      // Revert on error
      fetchTasks()
    }
  }

  const actions = (
    <Button className="btn-accent" onClick={() => setShowForm(true)}>
      <Plus className="mr-2" /> New Task
    </Button>
  )

  // Filter tasks based on search criteria
  const visibleTasks = tasks.filter(task => {
    // Search by title or description
    const searchLower = searchText.toLowerCase()
    const matchesSearch = searchText === '' ||
      task.title.toLowerCase().includes(searchLower) ||
      (task.description && task.description.toLowerCase().includes(searchLower))

    // Filter by assignee
    const matchesAssignee = selectedAssignee === 'all' ||
      (task.assignee_ids && task.assignee_ids.includes(selectedAssignee)) ||
      (selectedAssignee === 'unassigned' && (!task.assignee_ids || task.assignee_ids.length === 0))

    // Filter by category
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory

    return matchesSearch && matchesAssignee && matchesCategory
  })

  let content
  if (appLoading || loading) {
    content = <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin" /></div>
  } else if (!team) {
    content = <div className="text-center text-gray-500">You must be a member of a team to view project tasks.</div>
  } else {
    content = (
      <>
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
            <SheetHeader className="p-0 mb-4">
              <SheetTitle>New Task</SheetTitle>
            </SheetHeader>
            <TaskForm
              teamId={team.id}
              seasonId={currentSeason!.id}
              onCreate={fetchTasks}
              onClose={() => setShowForm(false)}
              members={members}
            />
          </SheetContent>
        </Sheet>
        {editTask && (
          <Sheet open={!!editTask} onOpenChange={open => !open && setEditTask(null)}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
              <SheetHeader className="p-0 mb-4">
                <SheetTitle>Edit Task</SheetTitle>
              </SheetHeader>
              <TaskForm
                teamId={team.id}
                seasonId={currentSeason!.id}
                onCreate={fetchTasks}
                onClose={() => setEditTask(null)}
                members={members}
                initialTask={editTask}
                isEdit
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Assignee filter */}
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="min-w-[140px]">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="min-w-[140px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters button */}
            {(searchText || selectedAssignee !== 'all' || selectedCategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchText('')
                  setSelectedAssignee('all')
                  setSelectedCategory('all')
                }}
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500">
            Showing {visibleTasks.length} of {tasks.length} tasks
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATUS_COLUMNS.map(col => (
              <DroppableColumn
                key={col.key}
                id={col.key}
                title={col.label}
                tasks={visibleTasks.filter(t => t.status === col.key)}
                members={members}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                onEdit={setEditTask}
                onNotebook={handleOpenNotebook}
              />
            ))}
          </div>
        </DragDropContext>
      </>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Tasks"
        pageIcon={FolderKanban}
        actions={actions}
      >
        {content}

        {/* Entity Notebook Sidebar - only render if we have a task ID */}
        {notebookTaskId && (
          <EntityNotebookSidebar
            isOpen={isNotebookOpen}
            onClose={() => {
              setIsNotebookOpen(false)
              setNotebookTaskId(null)
              setNotebookTaskTitle('')
            }}
            entityType="task"
            entityId={notebookTaskId}
            entityTitle={notebookTaskTitle}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{taskToDelete?.title}&rdquo;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}