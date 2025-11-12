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
  ChevronLeft,
  Printer,
  Type,
  CheckSquare,
  AlignLeft,
  Sliders,
  ListTodo,
  Eye,
  EyeOff,
  Download,
  DownloadCloud,
  MoreVertical,
  Copy
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { getOrCreateDefaultFolder } from '@/lib/notebookHelpers'

type QuestionType = 'text' | 'number' | 'multiple-choice' | 'checkbox' | 'scale' | 'long-text'

interface Question {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  scaleMin?: number
  scaleMax?: number
}

export default function ScoutingSheetPage() {
  const router = useRouter()
  const { team, currentSeason } = useAppData()
  const { user } = useAuth()

  const storageKey = `scouting_sheet_questions_${team?.team_number || 'anonymous'}`
  const templatesKey = `scouting_sheet_templates_${team?.team_number || 'anonymous'}`

  const [questions, setQuestions] = useState<Question[]>([])
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState<string>('')
  const [templates, setTemplates] = useState<Array<{id:string,name:string,questions:Question[]}>>([])
  const [previewMode, setPreviewMode] = useState(false)
  const [showQuestionType, setShowQuestionType] = useState(false)
  const [fillMode, setFillMode] = useState(false)
  const [fillingTeamNumber, setFillingTeamNumber] = useState<string>(team?.team_number ? String(team.team_number) : '')
  const [responses, setResponses] = useState<Record<string, any>>({})

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        setQuestions(JSON.parse(raw))
      } else {
        // start with example questions
        setQuestions([
          { id: crypto?.randomUUID?.() || String(Date.now()), text: 'Team Number', type: 'number' },
          { id: crypto?.randomUUID?.() || String(Date.now()+1), text: 'Notes / Observations', type: 'long-text' }
        ])
      }
    } catch (err) {
      console.error('Failed to load scouting sheet from storage', err)
    }
    // load saved templates from localStorage
    try {
      const rawTemplates = localStorage.getItem(templatesKey)
      if (rawTemplates) setTemplates(JSON.parse(rawTemplates))
    } catch (err) {
      console.error('Failed to load templates', err)
    }
  }, [storageKey, templatesKey])

  const addQuestion = (type: QuestionType = 'text') => {
    setQuestions(prev => [...prev, { id: crypto?.randomUUID?.() || String(Date.now()), text: '', type, options: type === 'multiple-choice' ? [''] : undefined }])
    setShowQuestionType(false)
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const duplicateQuestion = (id: string) => {
    const q = questions.find(x => x.id === id)
    if (q) {
      const newQ = { ...q, id: crypto?.randomUUID?.() || String(Date.now()) }
      setQuestions(prev => [...prev, newQ])
    }
  }

  const save = () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(questions))
      setSavedMessage('✓ Saved')
      setTimeout(() => setSavedMessage(null), 2000)
    } catch (err) {
      console.error('Failed to save scouting sheet', err)
      setSavedMessage('Failed to save')
    }
  }

  const saveTemplate = () => {
    if (!templateName.trim()) {
      setSavedMessage('Please enter a template name')
      setTimeout(() => setSavedMessage(null), 2000)
      return
    }

    const newTemplate = { id: crypto?.randomUUID?.() || String(Date.now()), name: templateName.trim(), questions }
    const updated = [...templates.filter(t => t.name !== newTemplate.name), newTemplate]
    try {
      localStorage.setItem(templatesKey, JSON.stringify(updated))
      setTemplates(updated)
      setSavedMessage('✓ Template saved')
      setTimeout(() => setSavedMessage(null), 2000)
    } catch (err) {
      console.error('Failed to save template', err)
      setSavedMessage('Failed to save template')
    }

    // Persist template to notebook
    try {
      if (team?.team_number && team.id && currentSeason?.id && user?.id) {
        ;(async () => {
          try {
            const folder = await getOrCreateDefaultFolder(team.id, currentSeason.id, 'Scouting', user.id)
            if (!folder) {
              console.error('Failed to get or create Scouting folder')
              return
            }

            const { data: existingPages, error: findError } = await supabase
              .from('notebook_pages')
              .select('id')
              .eq('team_id', team.id)
              .eq('season_id', currentSeason.id)
              .eq('linked_entity_type', 'scouting_team')
              .eq('linked_entity_id', String(team.team_number))
              .maybeSingle()

            if (findError) {
              console.error('Error checking for existing scouting page:', findError)
              return
            }

            const templateData = { templateName: templateName.trim(), questions }

            if (existingPages?.id) {
              await supabase
                .from('notebook_pages')
                .update({
                  title: `Scouting Sheet - Team ${team.team_number}`,
                  content_text: JSON.stringify(templateData),
                  updated_at: new Date().toISOString(),
                  updated_by: user.id
                })
                .eq('id', existingPages.id)
            } else {
              await supabase
                .from('notebook_pages')
                .insert({
                  team_id: team.id,
                  season_id: currentSeason.id,
                  folder_id: folder.id,
                  title: `Scouting Sheet - Team ${team.team_number}`,
                  content_text: JSON.stringify(templateData),
                  linked_entity_type: 'scouting_team',
                  linked_entity_id: String(team.team_number),
                  created_by: user.id,
                  updated_by: user.id
                })
            }
          } catch (err) {
            console.error('Failed to persist template to notebook:', err)
          }
        })()
      }
    } catch (err) {
      console.error('Error in template persistence setup:', err)
    }
  }

  const loadTemplate = (id: string) => {
    const t = templates.find(x => x.id === id)
    if (t) {
      setQuestions(t.questions)
      setTemplateName(t.name)
      setSavedMessage('Template loaded')
      setTimeout(() => setSavedMessage(null), 1500)
    }
  }

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    try {
      localStorage.setItem(templatesKey, JSON.stringify(updated))
      setTemplates(updated)
      setSavedMessage('Template deleted')
      setTimeout(() => setSavedMessage(null), 1500)
    } catch (err) {
      console.error('Failed to delete template', err)
      setSavedMessage('Failed to delete template')
    }
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ team: team?.team_number || null, questions }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scouting_sheet_${team?.team_number || 'team'}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printPreviewKey = `scouting_sheet_print_preview_${team?.team_number || 'anonymous'}`

  const openPrintPreview = () => {
    try {
      localStorage.setItem(printPreviewKey, JSON.stringify({ templateName, questions, team: team?.team_number || null }))
      window.open('/scouting/sheet/print', '_blank')
    } catch (err) {
      console.error('Failed to open print preview', err)
      setSavedMessage('Failed to open print preview')
      setTimeout(() => setSavedMessage(null), 2000)
    }
  }

  // Fill mode helpers: load/save responses for a filling team
  const responsesKeyFor = (filler: string) => `scouting_sheet_responses_${filler || 'anonymous'}`

  // Load saved responses when entering fill mode or when filling team changes
  useEffect(() => {
    if (!fillMode) return
    const key = responsesKeyFor(fillingTeamNumber)
    try {
      const raw = localStorage.getItem(key)
      if (raw) setResponses(JSON.parse(raw))
      else setResponses({})
    } catch (err) {
      console.error('Failed to load saved responses', err)
      setResponses({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillMode, fillingTeamNumber])

  const setResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  const saveResponses = () => {
    if (!fillingTeamNumber) {
      setSavedMessage('Enter your team number before saving responses')
      setTimeout(() => setSavedMessage(null), 2000)
      return
    }
    try {
      const key = responsesKeyFor(fillingTeamNumber)
      localStorage.setItem(key, JSON.stringify(responses))
      setSavedMessage('✓ Responses saved')
      setTimeout(() => setSavedMessage(null), 2000)
    } catch (err) {
      console.error('Failed to save responses', err)
      setSavedMessage('Failed to save responses')
      setTimeout(() => setSavedMessage(null), 2000)
    }
  }

  const exportResponses = () => {
    const payload = {
      fillerTeam: fillingTeamNumber || null,
      templateName: templateName || null,
      questions,
      responses,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scouting_responses_${fillingTeamNumber || 'anon'}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />
      case 'number': return <Type className="h-4 w-4" />
      case 'long-text': return <AlignLeft className="h-4 w-4" />
      case 'multiple-choice': return <CheckSquare className="h-4 w-4" />
      case 'checkbox': return <ListTodo className="h-4 w-4" />
      case 'scale': return <Sliders className="h-4 w-4" />
      default: return <Type className="h-4 w-4" />
    }
  }

  const getQuestionTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'text': return 'Short Text'
      case 'number': return 'Number'
      case 'long-text': return 'Long Text'
      case 'multiple-choice': return 'Multiple Choice'
      case 'checkbox': return 'Checkboxes'
      case 'scale': return 'Rating Scale'
      default: return 'Text'
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout pageTitle="Scouting Sheet" pageIcon={FileText}>
        <div className="space-y-4">
          {/* Top Toolbar */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Template Name and Controls */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/scouting')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold">Scouting Sheet Builder</h1>
                  </div>
                  <p className="text-sm text-muted-foreground ml-10">
                    Create a custom scouting template for your team
                  </p>
                </div>

                {/* Template Management Section */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Template Management</h3>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      placeholder="Template name (e.g., Regional 2025)"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={saveTemplate} className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                  </div>

                  {templates.length > 0 && (
                    <div>
                      <Label className="text-xs mb-2 block">Load Template</Label>
                      <select
                        aria-label="Load template"
                        className="w-full border rounded-md bg-background px-3 py-2 text-sm border-input"
                        onChange={(e) => loadTemplate(e.target.value)}
                        defaultValue=""
                      >
                        <option value="">Select a template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => { setPreviewMode(p => !p); setFillMode(false) }}
                    variant={previewMode ? "default" : "outline"}
                    className="gap-2"
                  >
                    {previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {previewMode ? 'Edit Mode' : 'Preview'}
                  </Button>

                  <Button onClick={save} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Save Sheet
                  </Button>

                  <Button onClick={exportJSON} variant="outline" className="gap-2">
                    <DownloadCloud className="h-4 w-4" />
                    Export JSON
                  </Button>

                  <Button onClick={openPrintPreview} variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print / PDF
                  </Button>

                  {/* Fill mode toggle */}
                  <Button
                    onClick={() => { setFillMode(f => !f); setPreviewMode(false) }}
                    variant={fillMode ? 'default' : 'outline'}
                    className="gap-2 ml-auto"
                  >
                    <Copy className="h-4 w-4" />
                    {fillMode ? 'Exit Fill' : 'Fill Sheet'}
                  </Button>

                  {/* Save / Export responses when in fill mode */}
                  {fillMode && (
                    <>
                      <Input placeholder="Your team number" value={fillingTeamNumber} onChange={(e) => setFillingTeamNumber(e.target.value)} className="w-40" />
                      <Button onClick={saveResponses} variant="outline">Save Responses</Button>
                      <Button onClick={exportResponses} variant="outline">Export Responses</Button>
                    </>
                  )}

                  {/* Add Question Dropdown */}
                  <DropdownMenu open={showQuestionType} onOpenChange={setShowQuestionType}>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
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
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {savedMessage && (
                    <div className="ml-auto text-sm font-medium text-green-600 flex items-center gap-1">
                      {savedMessage}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Section */}
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
              ) : fillMode ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Label className="text-sm">Filling as team #</Label>
                    <Input value={fillingTeamNumber} onChange={(e) => setFillingTeamNumber(e.target.value)} placeholder="Your team number" className="w-40" />
                    <Button onClick={saveResponses} variant="outline" className="ml-2">Save Responses</Button>
                    <Button onClick={exportResponses} variant="outline">Export Responses</Button>
                  </div>
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-3">
                      <div className="font-semibold text-base">
                        {idx + 1}. {q.text || `Question ${idx + 1}`}
                      </div>
                      {q.type === 'text' && (
                        <Input placeholder="Answer" value={responses[q.id] || ''} onChange={(e) => setResponse(q.id, e.target.value)} />
                      )}
                      {q.type === 'number' && (
                        <Input type="number" placeholder="0" value={responses[q.id] ?? ''} onChange={(e) => setResponse(q.id, e.target.value ? Number(e.target.value) : '')} />
                      )}
                      {q.type === 'long-text' && (
                        <Textarea placeholder="Your answer here..." rows={4} value={responses[q.id] || ''} onChange={(e) => setResponse(q.id, e.target.value)} />
                      )}
                      {q.type === 'multiple-choice' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" name={`mc-${q.id}`} checked={responses[q.id] === opt} onChange={() => setResponse(q.id, opt)} />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'checkbox' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="checkbox" checked={Array.isArray(responses[q.id]) ? responses[q.id].includes(opt) : false} onChange={(e) => {
                                const prev = Array.isArray(responses[q.id]) ? responses[q.id] : []
                                if (e.target.checked) setResponse(q.id, [...prev, opt])
                                else setResponse(q.id, prev.filter((x: string) => x !== opt))
                              }} />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="flex gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <label key={n} className={`inline-flex items-center p-1 rounded ${responses[q.id] === n ? 'bg-primary/10' : ''}`}>
                              <input type="radio" name={`scale-${q.id}`} checked={responses[q.id] === n} onChange={() => setResponse(q.id, n)} />
                              <span className="ml-2 text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : previewMode ? (
                <div className="space-y-6">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-3">
                      <div className="font-semibold text-base">
                        {idx + 1}. {q.text || `Question ${idx + 1}`}
                      </div>
                      {q.type === 'text' && (
                        <Input placeholder="Answer" value={responses[q.id] || ''} onChange={(e) => setResponse(q.id, e.target.value)} />
                      )}
                      {q.type === 'number' && (
                        <Input type="number" placeholder="0" value={responses[q.id] ?? ''} onChange={(e) => setResponse(q.id, e.target.value ? Number(e.target.value) : '')} />
                      )}
                      {q.type === 'long-text' && (
                        <Textarea placeholder="Your answer here..." rows={4} value={responses[q.id] || ''} onChange={(e) => setResponse(q.id, e.target.value)} />
                      )}
                      {q.type === 'multiple-choice' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" name={`preview-mc-${q.id}`} checked={responses[q.id] === opt} onChange={() => setResponse(q.id, opt)} />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'checkbox' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="checkbox" checked={Array.isArray(responses[q.id]) ? responses[q.id].includes(opt) : false} onChange={(e) => {
                                const prev = Array.isArray(responses[q.id]) ? responses[q.id] : []
                                if ((e.target as HTMLInputElement).checked) setResponse(q.id, [...prev, opt])
                                else setResponse(q.id, prev.filter((x: string) => x !== opt))
                              }} />
                              <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'scale' && (
                        <div className="flex gap-2">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <label key={n} className={`inline-flex items-center p-1 rounded ${responses[q.id] === n ? 'bg-primary/10' : ''}`}>
                              <input type="radio" name={`preview-scale-${q.id}`} checked={responses[q.id] === n} onChange={() => setResponse(q.id, n)} />
                              <span className="ml-2 text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-6">{idx + 1}.</span>
                            <Input
                              value={q.text}
                              onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                              placeholder="Question text..."
                              className="font-medium"
                            />
                            <Select value={q.type} onValueChange={(type) => updateQuestion(q.id, { type: type as QuestionType })}>
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="long-text">Long Text</SelectItem>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="checkbox">Checkboxes</SelectItem>
                                <SelectItem value="scale">Rating Scale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Options for multiple-choice and checkbox types */}
                          {(q.type === 'multiple-choice' || q.type === 'checkbox') && (
                            <div className="ml-6 space-y-2 border-l-2 border-muted pl-3">
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
                                    className="text-sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newOpts = (q.options || []).filter((_, idx) => idx !== i)
                                      updateQuestion(q.id, { options: newOpts })
                                    }}
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

                        {/* Action Buttons */}
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
