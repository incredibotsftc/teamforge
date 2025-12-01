'use client'

import React, { useState } from 'react'
import { useAccentColorContext } from '@/components/AccentColorProvider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  GripVertical, Trash2, Plus, Eye, X,
  Star, Palette, Undo, Redo, MoreVertical, Copy,
  Image as ImageIcon, Type as TypeIcon, SplitSquareVertical,
  CheckSquare, Circle, AlignLeft, AlignJustify, FileInput, Video,
  ChevronDown
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

type QuestionType = 'short' | 'paragraph' | 'multiple' | 'checkboxes' | 'rating' | 'title' | 'image' | 'video' | 'section'

type Question = {
  id: string
  text: string
  type: QuestionType
  options: string[]
  required?: boolean
  description?: string // For title/description blocks
  imageUrl?: string // For image blocks
  videoUrl?: string // For video blocks
}

type Survey = {
  id: string
  title: string
  description?: string
  questions: Question[]
  createdAt: number
}

export default function SurveyBuilder({ onClose }: { onClose?: () => void }) {
  const { accentColor } = useAccentColorContext()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)

  // Default to purple if no accent color is set
  const primaryColor = accentColor || '#6366f1'

  const addQuestion = (type: QuestionType = 'multiple') => {
    const q: Question = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      text: '',
      type,
      options: type === 'multiple' || type === 'checkboxes' ? ['Option 1'] : [],
      required: false,
    }
    setQuestions((s) => [...s, q])
    setActiveQuestionId(q.id)
  }

  const duplicateQuestion = (questionId: string) => {
    const q = questions.find(q => q.id === questionId)
    if (!q) return
    const newQ = { ...q, id: Date.now().toString() + Math.random().toString(36).slice(2, 8) }
    const idx = questions.findIndex(q => q.id === questionId)
    setQuestions(s => {
      const copy = [...s]
      copy.splice(idx + 1, 0, newQ)
      return copy
    })
    setActiveQuestionId(newQ.id)
  }

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((s) => s.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => {
    setQuestions((s) => s.filter((q) => q.id !== id))
    if (activeQuestionId === id) setActiveQuestionId(null)
  }

  const addOption = (questionId: string) => {
    setQuestions((s) => s.map((q) => q.id === questionId ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q))
  }

  const updateOption = (questionId: string, idx: number, value: string) => {
    setQuestions((s) => s.map((q) => {
      if (q.id !== questionId) return q
      const options = [...q.options]
      options[idx] = value
      return { ...q, options }
    }))
  }

  const removeOption = (questionId: string, idx: number) => {
    setQuestions((s) => s.map((q) => {
      if (q.id !== questionId) return q
      const options = q.options.filter((_, i) => i !== idx)
      return { ...q, options }
    }))
  }

  const saveSurvey = () => {
    const survey: Survey = {
      id: Date.now().toString(),
      title: title || 'Untitled survey',
      description,
      questions,
      createdAt: Date.now(),
    }

    try {
      const raw = localStorage.getItem('teamforge-surveys')
      const arr: Survey[] = raw ? JSON.parse(raw) : []
      arr.push(survey)
      localStorage.setItem('teamforge-surveys', JSON.stringify(arr))
      if (onClose) onClose()
    } catch (e) {
      console.error('Failed to save survey', e)
      alert('Failed to save survey to localStorage')
    }
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result
    if (!destination) return
    if (destination.index === source.index) return
    setQuestions((prev) => {
      const copy = Array.from(prev)
      const [moved] = copy.splice(source.index, 1)
      copy.splice(destination.index, 0, moved)
      return copy
    })
  }

  const getIconForType = (type: QuestionType) => {
    switch (type) {
      case 'short': return <AlignLeft className="w-5 h-5 text-gray-500" />
      case 'paragraph': return <AlignJustify className="w-5 h-5 text-gray-500" />
      case 'multiple': return <Circle className="w-5 h-5 text-gray-500" />
      case 'checkboxes': return <CheckSquare className="w-5 h-5 text-gray-500" />
      case 'rating': return <Star className="w-5 h-5 text-gray-500" />
      default: return <Circle className="w-5 h-5 text-gray-500" />
    }
  }

  const getLabelForType = (type: QuestionType) => {
    switch (type) {
      case 'short': return 'Short answer'
      case 'paragraph': return 'Paragraph'
      case 'multiple': return 'Multiple choice'
      case 'checkboxes': return 'Checkboxes'
      case 'rating': return 'Star rating'
      default: return 'Multiple choice'
    }
  }

  return (
    <div
      className="w-full h-full flex flex-col bg-[#f0ebf8]"
      style={{ '--accent-color': primaryColor } as React.CSSProperties}
    >
      {/* Top Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0 z-20 relative">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded-full">
            <div className="w-6 h-6 rounded text-white flex items-center justify-center text-xs font-bold bg-[var(--accent-color)]">F</div>
          </div>
          <div className="flex items-center gap-3">
            <input
              className="text-lg font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--accent-color)] outline-none px-1 py-0.5 transition-colors"
              placeholder="Untitled form"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Star className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-600">
            <Palette className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600">
            <Eye className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600">
            <Undo className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600">
            <Redo className="w-5 h-5" />
          </Button>
          <Button onClick={saveSurvey} className="text-white px-6 ml-2 bg-[var(--accent-color)] hover:opacity-90">
            Publish
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 ml-1">
            <MoreVertical className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full text-white flex items-center justify-center ml-2 text-sm font-medium bg-[var(--accent-color)]">
            I
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6 flex-shrink-0 shadow-sm z-10 relative">
        <div className="flex justify-center gap-8">
          <button className="py-3 px-4 border-b-[3px] font-medium text-sm border-[var(--accent-color)] text-[var(--accent-color)]">
            Questions
          </button>
          <button className="py-3 px-4 text-gray-600 font-medium text-sm hover:bg-gray-50 rounded-t">
            Responses
          </button>
          <button className="py-3 px-4 text-gray-600 font-medium text-sm hover:bg-gray-50 rounded-t">
            Settings
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 relative min-h-0">
        <div className="max-w-[770px] mx-auto space-y-4 px-4 pb-24">

          {/* Form Header Card */}
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative group"
            onClick={() => setActiveQuestionId(null)}
          >
            <div className="h-2.5 absolute top-0 left-0 right-0 bg-[var(--accent-color)]" />
            <div className="h-2.5 absolute top-0 left-0 right-0" /> {/* Spacer */}
            <div className="p-6 pt-8">
              <input
                className="w-full text-[32px] leading-tight font-normal border-b border-gray-100 focus:border-[var(--accent-color)] outline-none pb-2 mb-4 placeholder:text-gray-400 text-gray-900 transition-colors"
                placeholder="Untitled form"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className="w-full text-sm border-b border-gray-100 focus:border-[var(--accent-color)] outline-none pb-2 placeholder:text-gray-500 text-gray-900 transition-colors"
                placeholder="Form description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Questions */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="questions">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                  {questions.map((q, qi) => {
                    const isActive = activeQuestionId === q.id

                    // Render different blocks based on type
                    if (q.type === 'title') {
                      return (
                        <Draggable key={q.id} draggableId={q.id} index={qi}>
                          {(prov, snapshot) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`bg-white rounded-lg shadow-sm border border-gray-200 relative transition-all ${isActive ? 'border-l-4 ring-1 ring-gray-200' : 'hover:shadow-md'}`}
                              style={isActive ? { borderLeftColor: primaryColor } : {}}
                              onClick={() => setActiveQuestionId(q.id)}
                            >
                              {/* Drag Handle */}
                              <div
                                {...prov.dragHandleProps}
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-move opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                              >
                                <div className="flex gap-0.5">
                                  {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />)}
                                </div>
                              </div>

                              <div className="p-6">
                                <input
                                  className="w-full text-xl font-normal border-b border-transparent hover:border-gray-200 focus:border-[var(--accent-color)] outline-none pb-2 mb-2 placeholder:text-gray-500 text-gray-900"
                                  value={q.text}
                                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                  placeholder="Untitled title"
                                />
                                <input
                                  className="w-full text-sm border-b border-transparent hover:border-gray-200 focus:border-[var(--accent-color)] outline-none pb-2 placeholder:text-gray-500 text-gray-900"
                                  value={q.description || ''}
                                  onChange={(e) => updateQuestion(q.id, { description: e.target.value })}
                                  placeholder="Description (optional)"
                                />
                              </div>

                              {isActive && (
                                <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => duplicateQuestion(q.id)}><Copy className="w-5 h-5 text-gray-600" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}><Trash2 className="w-5 h-5 text-gray-600" /></Button>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      )
                    }

                    if (q.type === 'section') {
                      return (
                        <Draggable key={q.id} draggableId={q.id} index={qi}>
                          {(prov, snapshot) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`bg-white rounded-lg shadow-sm border border-gray-200 relative mt-8 mb-4 ${isActive ? 'border-l-4 ring-1 ring-gray-200' : 'hover:shadow-md'}`}
                              style={isActive ? { borderLeftColor: primaryColor } : {}}
                              onClick={() => setActiveQuestionId(q.id)}
                            >
                              {/* Drag Handle */}
                              <div
                                {...prov.dragHandleProps}
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-move opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                              >
                                <div className="flex gap-0.5">
                                  {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />)}
                                </div>
                              </div>

                              <div className="bg-[var(--accent-color)] text-white px-4 py-2 rounded-t-lg text-sm font-medium">
                                Section {questions.filter((qu, i) => i <= qi && qu.type === 'section').length + 1} of {questions.filter(qu => qu.type === 'section').length + 1}
                              </div>
                              <div className="p-6">
                                <input
                                  className="w-full text-2xl font-normal border-b border-transparent hover:border-gray-200 focus:border-[var(--accent-color)] outline-none pb-2 mb-2 placeholder:text-gray-500 text-gray-900"
                                  value={q.text}
                                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                  placeholder="Untitled Section"
                                />
                                <input
                                  className="w-full text-sm border-b border-transparent hover:border-gray-200 focus:border-[var(--accent-color)] outline-none pb-2 placeholder:text-gray-500 text-gray-900"
                                  value={q.description || ''}
                                  onChange={(e) => updateQuestion(q.id, { description: e.target.value })}
                                  placeholder="Description (optional)"
                                />
                              </div>
                              {isActive && (
                                <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => duplicateQuestion(q.id)}><Copy className="w-5 h-5 text-gray-600" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}><Trash2 className="w-5 h-5 text-gray-600" /></Button>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      )
                    }

                    // Standard Question Block
                    return (
                      <Draggable key={q.id} draggableId={q.id} index={qi}>
                        {(prov, snapshot) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={`bg-white rounded-lg shadow-sm border border-gray-200 relative transition-all ${isActive ? 'border-l-4 ring-1 ring-gray-200' : 'hover:shadow-md'}`}
                            style={isActive ? { borderLeftColor: primaryColor } : {}}
                            onClick={() => setActiveQuestionId(q.id)}
                          >
                            {/* Drag Handle */}
                            <div
                              {...prov.dragHandleProps}
                              className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-move opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                            >
                              <div className="flex gap-0.5">
                                {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />)}
                              </div>
                            </div>

                            <div className="p-6">
                              <div className="flex flex-col md:flex-row gap-6 mb-4">
                                {/* Question Input Area */}
                                <div className="flex-1 bg-gray-50 border-b border-gray-300 focus-within:border-[var(--accent-color)] focus-within:bg-gray-100 transition-colors rounded-t-sm px-4 py-3">
                                  <input
                                    className="w-full bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-500"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                    placeholder="Question"
                                  />
                                </div>

                                {/* Type Selector */}
                                <div className="w-full md:w-[220px] relative">
                                  <div className="border border-gray-300 rounded px-3 py-3 flex items-center gap-3 bg-white cursor-pointer hover:bg-gray-50">
                                    {getIconForType(q.type)}
                                    <span className="text-sm text-gray-700 flex-1">{getLabelForType(q.type)}</span>
                                    <ChevronDown className="w-4 h-4 text-gray-500" />

                                    {/* Invisible Select Overlay */}
                                    <select
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      value={q.type}
                                      onChange={(e) => {
                                        const v = e.target.value as QuestionType
                                        updateQuestion(q.id, {
                                          type: v,
                                          options: v === 'multiple' || v === 'checkboxes' ? (q.options.length ? q.options : ['Option 1']) : []
                                        })
                                      }}
                                    >
                                      <option value="short">Short answer</option>
                                      <option value="paragraph">Paragraph</option>
                                      <option value="multiple">Multiple choice</option>
                                      <option value="checkboxes">Checkboxes</option>
                                      <option value="rating">Star rating</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Options Area */}
                              <div className="space-y-2">
                                {(q.type === 'multiple' || q.type === 'checkboxes') && (
                                  <div className="space-y-3">
                                    {q.options.map((opt, idx) => (
                                      <div key={idx} className="flex items-center gap-3 group/option">
                                        {q.type === 'multiple' ? (
                                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                        ) : (
                                          <div className="w-5 h-5 rounded border-2 border-gray-300" />
                                        )}
                                        <input
                                          className="flex-1 text-sm text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-[var(--accent-color)] outline-none py-1 placeholder:text-gray-500"
                                          value={opt}
                                          onChange={(e) => updateOption(q.id, idx, e.target.value)}
                                          placeholder={`Option ${idx + 1}`}
                                        />
                                        {q.options.length > 1 && (
                                          <button
                                            onClick={() => removeOption(q.id, idx)}
                                            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover/option:opacity-100 transition-opacity p-1"
                                          >
                                            <X className="w-5 h-5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <div className="flex items-center gap-3">
                                      {q.type === 'multiple' ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                      ) : (
                                        <div className="w-5 h-5 rounded border-2 border-gray-300" />
                                      )}
                                      <button
                                        onClick={() => addOption(q.id)}
                                        className="text-sm text-gray-500 hover:text-gray-800 font-normal py-1"
                                      >
                                        Add option <span className="text-blue-600 font-medium hover:text-blue-700 ml-1">or add "Other"</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {q.type === 'short' && (
                                  <div className="text-sm text-gray-400 border-b border-dotted border-gray-300 pb-2 w-1/2">
                                    Short answer text
                                  </div>
                                )}

                                {q.type === 'paragraph' && (
                                  <div className="text-sm text-gray-400 border-b border-dotted border-gray-300 pb-2 w-3/4">
                                    Long answer text
                                  </div>
                                )}

                                {q.type === 'rating' && (
                                  <div className="flex items-center gap-2 py-2">
                                    {[1, 2, 3, 4, 5].map((starNum) => (
                                      <Star
                                        key={starNum}
                                        className="w-8 h-8 text-gray-300 cursor-default"
                                        fill="none"
                                        strokeWidth={2}
                                      />
                                    ))}
                                    <span className="text-sm text-gray-500 ml-2">
                                      (Preview - respondents will be able to select a rating)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Question Footer */}
                            <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-end gap-2 mt-4">
                              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100" onClick={() => duplicateQuestion(q.id)} title="Duplicate">
                                <Copy className="w-5 h-5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100" onClick={() => removeQuestion(q.id)} title="Delete">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                              <div className="w-px h-6 bg-gray-300 mx-2" />
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-700">Required</span>
                                <Checkbox
                                  checked={!!q.required}
                                  onCheckedChange={(v) => updateQuestion(q.id, { required: !!v })}
                                  className="data-[state=checked]:bg-[var(--accent-color)] data-[state=checked]:border-[var(--accent-color)]"
                                />
                              </div>
                              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 ml-2">
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {questions.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center text-gray-500">
              <p className="text-lg mb-2">Your survey is empty</p>
              <p className="text-sm">Click the + button on the right to add your first question</p>
            </div>
          )}
        </div>

        {/* Floating Toolbar - Fixed to the right of the content column */}
        <div
          className="fixed top-1/2 -translate-y-1/2 flex flex-col bg-white shadow-md rounded-lg border border-gray-200 py-2 z-50 transition-all duration-300"
          style={{
            left: 'calc(50% + 385px + 16px + 8rem)', // Center + half width of container + gap + sidebar offset correction
            left: 'calc(50vw + 8rem + 385px + 16px)'
          }}
        >
          <button onClick={() => addQuestion('multiple')} className="p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors relative group" title="Add question">
            <Plus className="w-6 h-6" />
          </button>
          <button onClick={() => alert('Import feature coming soon')} className="p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" title="Import questions">
            <FileInput className="w-5 h-5" />
          </button>
          <button onClick={() => addQuestion('title')} className="p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" title="Add title and description">
            <TypeIcon className="w-6 h-6" />
          </button>
          <button onClick={() => addQuestion('image')} className="p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" title="Add image">
            <ImageIcon className="w-5 h-5" />
          </button>
          <button onClick={() => addQuestion('video')} className="p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" title="Add video">
            <Video className="w-5 h-5" />
          </button>
          <button onClick={() => addQuestion('section')} className="p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" title="Add section">
            <SplitSquareVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
