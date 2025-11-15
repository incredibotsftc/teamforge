"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Type,
  CheckSquare,
  AlignLeft,
  Sliders,
  ListTodo,
  Eye,
  EyeOff,
  MoreVertical,
  Copy,
  Image,
  GripVertical,
  Download,
  Upload,
  ChevronLeft,
  Save
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

type QuestionType = 'text' | 'number' | 'multiple-choice' | 'checkbox' | 'scale' | 'long-text' | 'image' | 'field'

interface Question {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  scaleMin?: number
  scaleMax?: number
  mandatory?: boolean  // New field to mark mandatory questions
}

export default function ScoutingSheetPage() {
  const router = useRouter()
  const { team, currentSeason } = useAppData()
  const { user } = useAuth()

  const storageKey = `scouting_sheet_questions_${team?.team_number || 'anonymous'}`

  const [questions, setQuestions] = useState<Question[]>([])
  const [previewMode, setPreviewMode] = useState(false)
  const [showQuestionType, setShowQuestionType] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [saving, setSaving] = useState(false)
  const initialLoadRef = React.useRef(true)

  // Load questions on mount - prioritize database, then sessionStorage, then defaults
  useEffect(() => {
    const loadTemplate = async () => {
      const mandatoryFields = [
        { id: 'mandatory-team-name', text: 'Team Name', type: 'text' as QuestionType, mandatory: true },
        { id: 'mandatory-team-number', text: 'Team Number', type: 'number' as QuestionType, mandatory: true },
        { id: 'mandatory-event-name', text: 'Event Name', type: 'text' as QuestionType, mandatory: true }
      ]

      try {
        // First, try to load from database
        if (team?.id && currentSeason?.id) {
          const { data: template, error } = await supabase
            .from('scouting_templates')
            .select('content')
            .eq('team_id', team.id)
            .eq('season_id', currentSeason.id)
            .maybeSingle()

          if (!error && template?.content?.questions) {
            // Database has template - use it
            const customQuestions = template.content.questions.filter((q: Question) => !q.mandatory)
            setQuestions([...mandatoryFields, ...customQuestions])
            // Also update sessionStorage to sync
            sessionStorage.setItem(storageKey, JSON.stringify([...mandatoryFields, ...customQuestions]))
            return
          } else {
            // Database has no template - clear sessionStorage to prevent showing stale data
            sessionStorage.removeItem(storageKey)
            setQuestions(mandatoryFields)
            return
          }
        }

        // Second, try sessionStorage (migration path for old templates when team/season not available)
        const raw = sessionStorage.getItem(storageKey)
        if (raw) {
          const savedQuestions = JSON.parse(raw)
          const customQuestions = savedQuestions.filter((q: Question) => !q.mandatory)
          setQuestions([...mandatoryFields, ...customQuestions])
          return
        }

        // Finally, default to mandatory fields only
        setQuestions(mandatoryFields)
      } catch (err) {
        console.error('Failed to load template:', err)
        // Fallback to mandatory fields on error
        setQuestions(mandatoryFields)
      }
    }

    loadTemplate()
    // After initial load, mark the ref as false
    initialLoadRef.current = false
  }, [storageKey, team?.id, currentSeason?.id])

  const validateQuestions = (): string | null => {
    // Check for blank question text
    const blankQuestion = questions.find((q) => !q.mandatory && !q.text.trim())
    if (blankQuestion) {
      const idx = questions.findIndex(q => q.id === blankQuestion.id)
      return `Question ${idx + 1} is blank. Please enter question text.`
    }

    // Check for multiple choice/checkbox with no options
    const invalidOptions = questions.find(q =>
      (q.type === 'multiple-choice' || q.type === 'checkbox') &&
      (!q.options || q.options.filter(o => o.trim()).length === 0)
    )
    if (invalidOptions) {
      const idx = questions.findIndex(q => q.id === invalidOptions.id)
      return `Question ${idx + 1} needs at least one option.`
    }

    return null
  }

  const handleSave = async () => {
    // Validate questions
    const validationError = validateQuestions()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      // Save to sessionStorage
      sessionStorage.setItem(storageKey, JSON.stringify(questions))

      // Save to database if team and season are available
      if (team?.id && currentSeason?.id) {
        const customQuestions = questions.filter(q => !q.mandatory)

        const { error } = await supabase
          .from('scouting_templates')
          .upsert({
            team_id: team.id,
            season_id: currentSeason.id,
            name: `${currentSeason.start_year}-${currentSeason.end_year} Scouting Template`,
            content: { questions: customQuestions },
            created_by: user?.id,
            updated_by: user?.id
          }, {
            onConflict: 'team_id,season_id'
          })

        if (error) {
          console.error('Failed to save template:', error)
          toast.error('Failed to save template')
          return
        }
      }

      setHasUnsavedChanges(false)
      toast.success('Template saved successfully')
    } catch (err) {
      console.error('Failed to save template:', err)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = (type: QuestionType = 'text') => {
    setQuestions(prev => [...prev, { id: crypto?.randomUUID?.() || String(Date.now()), text: '', type, options: type === 'multiple-choice' ? [''] : undefined }])
    setShowQuestionType(false)
    if (!initialLoadRef.current) setHasUnsavedChanges(true)
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => {
      // Prevent updating mandatory fields' text and type
      if (q.id === id && q.mandatory) {
        // Only allow updates to non-protected fields (if any in future)
        return q
      }
      return q.id === id ? { ...q, ...updates } : q
    }))
    if (!initialLoadRef.current) setHasUnsavedChanges(true)
  }

  const removeQuestion = (id: string) => {
    // Prevent deletion of mandatory fields
    setQuestions(prev => prev.filter(q => q.id !== id || q.mandatory))
    if (!initialLoadRef.current) setHasUnsavedChanges(true)
  }

  const duplicateQuestion = (id: string) => {
    const q = questions.find(x => x.id === id)
    if (q) {
      const newQ = { ...q, id: crypto?.randomUUID?.() || String(Date.now()) }
      setQuestions(prev => [...prev, newQ])
    }
    if (!initialLoadRef.current) setHasUnsavedChanges(true)
  }

  const handleNavigationAttempt = (navigationFn: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navigationFn)
      setShowUnsavedDialog(true)
    } else {
      navigationFn()
    }
  }

  const handleSaveAndNavigate = async () => {
    await handleSave()
    setShowUnsavedDialog(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  const handleNavigateWithoutSaving = () => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  // Drag and drop handlers for reordering questions
  const handleDragStart = (index: number) => {
    // Only allow dragging non-mandatory questions
    if (!questions[index].mandatory) {
      setDraggedIndex(index)
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    // Don't allow dropping in mandatory fields area
    if (questions[index].mandatory) return

    if (draggedIndex !== null && draggedIndex !== index) {
      const newQuestions = [...questions]
      const draggedItem = newQuestions[draggedIndex]

      // Remove from old position
      newQuestions.splice(draggedIndex, 1)
      // Insert at new position
      newQuestions.splice(index, 0, draggedItem)

      setQuestions(newQuestions)
      setDraggedIndex(index)
      if (!initialLoadRef.current) setHasUnsavedChanges(true)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Auto-save removed - now using manual save button

  const printPreviewKey = `scouting_sheet_print_preview_${team?.team_number || 'anonymous'}`

  const openPrintPreview = () => {
    try {
      localStorage.setItem(printPreviewKey, JSON.stringify({ questions, team: team?.team_number || null }))
      window.open('/scouting/template/print', '_blank')
    } catch (err) {
      console.error('Failed to open print preview', err)
    }
  }

  const exportTemplate = () => {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        teamNumber: team?.team_number || null,
        questions: questions.filter(q => !q.mandatory) // Only export custom questions
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scouting_template_${team?.team_number || 'team'}_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export template', err)
    }
  }

  const importTemplate = () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json,.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        try {
          const text = await file.text()
          const importedData = JSON.parse(text)

          // Validate imported data
          if (!importedData.questions || !Array.isArray(importedData.questions)) {
            alert('Invalid template file: missing questions array')
            return
          }

          // Merge mandatory fields with imported custom questions
          const mandatoryFields = [
            { id: 'mandatory-team-name', text: 'Team Name', type: 'text' as QuestionType, mandatory: true },
            { id: 'mandatory-team-number', text: 'Team Number', type: 'number' as QuestionType, mandatory: true },
            { id: 'mandatory-event-name', text: 'Event Name', type: 'text' as QuestionType, mandatory: true }
          ]

          setQuestions([...mandatoryFields, ...importedData.questions])
        } catch (err) {
          console.error('Failed to parse template file', err)
          alert('Failed to import template: Invalid JSON file')
        }
      }
      input.click()
    } catch (err) {
      console.error('Failed to import template', err)
    }
  }

  const leftActions = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleNavigationAttempt(() => router.push('/scouting'))}
      className="gap-1"
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
  )

  const actions = (
    <div className="flex items-center gap-2">
      {/* Desktop: All buttons visible */}
      <div className="hidden md:flex items-center gap-2">
        <Button onClick={importTemplate} variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>

        <Button onClick={exportTemplate} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>

        <Button
          onClick={() => { setPreviewMode(p => !p) }}
          variant={previewMode ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          {previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {previewMode ? 'Edit Mode' : 'Preview'}
        </Button>

        <Button onClick={openPrintPreview} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print / PDF
        </Button>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || !hasUnsavedChanges}
        size="sm"
        variant="default"
        className="gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save'}
      </Button>

      {/* Add Question Dropdown - Always visible with text */}
      <DropdownMenu open={showQuestionType} onOpenChange={setShowQuestionType}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-2 btn-accent">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2 text-xs font-semibold text-muted-foreground">Question Types</div>
          <DropdownMenuItem onClick={() => addQuestion('text')} className="cursor-pointer gap-2">
            <Type className="h-4 w-4" />
            <div>
              <div className="font-medium">Short Text</div>
              <div className="text-xs text-muted-foreground">Single line response</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('number')} className="cursor-pointer gap-2">
            <Type className="h-4 w-4" />
            <div>
              <div className="font-medium">Number</div>
              <div className="text-xs text-muted-foreground">Numeric input</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('long-text')} className="cursor-pointer gap-2">
            <AlignLeft className="h-4 w-4" />
            <div>
              <div className="font-medium">Long Text</div>
              <div className="text-xs text-muted-foreground">Multi-line response</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('multiple-choice')} className="cursor-pointer gap-2">
            <CheckSquare className="h-4 w-4" />
            <div>
              <div className="font-medium">Multiple Choice</div>
              <div className="text-xs text-muted-foreground">Single selection</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('checkbox')} className="cursor-pointer gap-2">
            <ListTodo className="h-4 w-4" />
            <div>
              <div className="font-medium">Checkboxes</div>
              <div className="text-xs text-muted-foreground">Multiple selections</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('scale')} className="cursor-pointer gap-2">
            <Sliders className="h-4 w-4" />
            <div>
              <div className="font-medium">Rating Scale</div>
              <div className="text-xs text-muted-foreground">1-10 scale</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('image')} className="cursor-pointer gap-2">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-4 w-4" aria-hidden="true" />
            <div>
              <div className="font-medium">Image Upload</div>
              <div className="text-xs text-muted-foreground">Upload a photo</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addQuestion('field')} className="cursor-pointer gap-2">
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <div>
              <div className="font-medium">Field Annotation</div>
              <div className="text-xs text-muted-foreground">Draw on field diagram</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile: More menu to the right of Add Question */}
      <div className="flex md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={importTemplate} className="cursor-pointer gap-2">
              <Upload className="h-4 w-4" />
              Import Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportTemplate} className="cursor-pointer gap-2">
              <Download className="h-4 w-4" />
              Export Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPreviewMode(p => !p)} className="cursor-pointer gap-2">
              {previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {previewMode ? 'Switch to Edit Mode' : 'Preview Template'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openPrintPreview} className="cursor-pointer gap-2">
              <Printer className="h-4 w-4" />
              Print / PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <ProtectedRoute>
      <DashboardLayout pageTitle="Scouting Template" pageIcon={FileText} leftActions={leftActions} actions={actions}>
        <div className="space-y-4">

          {/* Questions Section */}
          <div className="max-w-5xl md:mx-auto">
            {/* Desktop: Card wrapper, Mobile: No wrapper */}
            <div className="hidden md:block">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Questions ({questions.length})</CardTitle>
                  <CardDescription>
                    {previewMode ? 'Preview how your scouting sheet will look' : 'Edit your scouting questions'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-muted-foreground mb-4">No questions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Add your first question using the button above</p>
                </div>
              ) : previewMode ? (
                <div className="space-y-6">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-3">
                      <div className="font-semibold text-base">
                        {idx + 1}. {q.text || `Question ${idx + 1}`}
                      </div>
                      {q.type === 'text' && (
                        <Input placeholder="Answer" disabled />
                      )}
                      {q.type === 'number' && (
                        <Input type="number" placeholder="0" disabled />
                      )}
                      {q.type === 'long-text' && (
                        <Textarea placeholder="Your answer here..." rows={4} disabled />
                      )}
                      {q.type === 'multiple-choice' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" name={`preview-mc-${q.id}`} disabled />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'checkbox' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="checkbox" disabled />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="flex gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <label key={n} className="inline-flex items-center p-1 rounded">
                              <input type="radio" name={`preview-scale-${q.id}`} disabled />
                              <span className="ml-2 text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === 'image' && (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          {/* eslint-disable-next-line jsx-a11y/alt-text */}
                          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
                          <p className="text-sm text-muted-foreground">Image upload placeholder</p>
                        </div>
                      )}
                      {q.type === 'field' && (
                        <div className="border rounded-lg overflow-hidden max-w-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/field.png" alt="Field diagram" className="w-full h-auto" />
                          <p className="text-xs text-muted-foreground text-center p-2">Field annotation - draw and annotate when filling sheet</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`border rounded-lg p-4 space-y-3 ${q.mandatory ? 'bg-muted/50 border-primary/30' : 'bg-card hover:bg-muted/30'} transition-colors ${draggedIndex === idx ? 'opacity-50' : ''}`}
                      draggable={!q.mandatory}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Drag Handle - only for non-mandatory questions */}
                        {!q.mandatory && (
                          <div className="cursor-grab active:cursor-grabbing pt-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                            {q.mandatory ? (
                              <>
                                <div className="flex-1 font-medium px-3 py-2 bg-background rounded border">
                                  {q.text}
                                </div>
                                <div className="sm:w-40 px-3 py-2 text-sm text-muted-foreground bg-background rounded border">
                                  {q.type === 'text' ? 'Short Text' : q.type === 'number' ? 'Number' : q.type === 'long-text' ? 'Long Text' : q.type}
                                </div>
                                <span className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded w-fit">Required</span>
                              </>
                            ) : (
                              <>
                                <Input
                                  value={q.text}
                                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                  placeholder="Question text..."
                                  className="font-medium"
                                />
                                <Select value={q.type} onValueChange={(type) => updateQuestion(q.id, { type: type as QuestionType })}>
                                  <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Short Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="long-text">Long Text</SelectItem>
                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                                    <SelectItem value="scale">Rating Scale</SelectItem>
                                    <SelectItem value="image">Image Upload</SelectItem>
                                    <SelectItem value="field">Field Annotation</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>

                          {/* Options for multiple-choice and checkbox types */}
                          {(q.type === 'multiple-choice' || q.type === 'checkbox') && (
                            <div className="ml-0 sm:ml-6 space-y-2 border-l-2 border-muted pl-3">
                              <Label className="text-xs font-medium">Options</Label>
                              {(q.options || []).map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Input
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])]
                                      newOpts[i] = e.target.value
                                      updateQuestion(q.id, { options: newOpts })
                                    }}
                                    placeholder={`Option ${i + 1}`}
                                    className="text-sm flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newOpts = (q.options || []).filter((_, idx) => idx !== i)
                                      updateQuestion(q.id, { options: newOpts })
                                    }}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOpts = [...(q.options || []), '']
                                  updateQuestion(q.id, { options: newOpts })
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons - only show for non-mandatory fields */}
                        {!q.mandatory && (
                          <div className="flex items-start gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => duplicateQuestion(q.id)} className="cursor-pointer gap-2">
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => removeQuestion(q.id)} className="cursor-pointer gap-2 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </CardContent>
              </Card>
            </div>

            {/* Mobile: No card wrapper */}
            <div className="block md:hidden">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
                <p className="text-sm text-muted-foreground">
                  {previewMode ? 'Preview how your scouting sheet will look' : 'Edit your scouting questions'}
                </p>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-muted-foreground mb-4">No questions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Add your first question using the button above</p>
                </div>
              ) : previewMode ? (
                <div className="space-y-6">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-3">
                      <div className="font-semibold text-base">
                        {idx + 1}. {q.text || `Question ${idx + 1}`}
                      </div>
                      {q.type === 'text' && (
                        <Input placeholder="Answer" disabled />
                      )}
                      {q.type === 'number' && (
                        <Input type="number" placeholder="0" disabled />
                      )}
                      {q.type === 'long-text' && (
                        <Textarea placeholder="Your answer here..." rows={4} disabled />
                      )}
                      {q.type === 'multiple-choice' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" name={`preview-mc-${q.id}`} disabled />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'checkbox' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="checkbox" disabled />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="flex gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <label key={n} className="inline-flex items-center p-1 rounded">
                              <input type="radio" name={`preview-scale-${q.id}`} disabled />
                              <span className="ml-2 text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {q.type === 'image' && (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          {/* eslint-disable-next-line jsx-a11y/alt-text */}
                          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
                          <p className="text-sm text-muted-foreground">Image upload placeholder</p>
                        </div>
                      )}
                      {q.type === 'field' && (
                        <div className="border rounded-lg overflow-hidden max-w-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/field.png" alt="Field diagram" className="w-full h-auto" />
                          <p className="text-xs text-muted-foreground text-center p-2">Field annotation - draw and annotate when filling sheet</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`border rounded-lg p-4 space-y-3 ${q.mandatory ? 'bg-muted/50 border-primary/30' : 'bg-card hover:bg-muted/30'} transition-colors ${draggedIndex === idx ? 'opacity-50' : ''}`}
                      draggable={!q.mandatory}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {!q.mandatory && (
                          <div className="cursor-grab active:cursor-grabbing pt-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                            {q.mandatory ? (
                              <>
                                <div className="flex-1 font-medium px-3 py-2 bg-background rounded border">
                                  {q.text}
                                </div>
                                <div className="sm:w-40 px-3 py-2 text-sm text-muted-foreground bg-background rounded border">
                                  {q.type === 'text' ? 'Short Text' : q.type === 'number' ? 'Number' : q.type === 'long-text' ? 'Long Text' : q.type}
                                </div>
                                <span className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded w-fit">Required</span>
                              </>
                            ) : (
                              <>
                                <Input
                                  value={q.text}
                                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                  placeholder="Question text..."
                                  className="font-medium"
                                />
                                <Select value={q.type} onValueChange={(type) => updateQuestion(q.id, { type: type as QuestionType })}>
                                  <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Short Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="long-text">Long Text</SelectItem>
                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                                    <SelectItem value="scale">Rating Scale</SelectItem>
                                    <SelectItem value="image">Image Upload</SelectItem>
                                    <SelectItem value="field">Field Annotation</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>

                          {(q.type === 'multiple-choice' || q.type === 'checkbox') && (
                            <div className="ml-0 sm:ml-6 space-y-2 border-l-2 border-muted pl-3">
                              <Label className="text-xs font-medium">Options</Label>
                              {(q.options || []).map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Input
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])]
                                      newOpts[i] = e.target.value
                                      updateQuestion(q.id, { options: newOpts })
                                    }}
                                    placeholder={`Option ${i + 1}`}
                                    className="text-sm flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newOpts = (q.options || []).filter((_, idx) => idx !== i)
                                      updateQuestion(q.id, { options: newOpts })
                                    }}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOpts = [...(q.options || []), '']
                                  updateQuestion(q.id, { options: newOpts })
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          )}
                        </div>

                        {!q.mandatory && (
                          <div className="flex items-start gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => duplicateQuestion(q.id)} className="cursor-pointer gap-2">
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => removeQuestion(q.id)} className="cursor-pointer gap-2 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to your scouting template. Do you want to save before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNavigation}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleNavigateWithoutSaving}>
              Don&apos;t Save
            </Button>
            <Button onClick={handleSaveAndNavigate} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
