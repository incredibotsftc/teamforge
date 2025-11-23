'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { QuestionEditor } from './QuestionEditor'
import { SurveyQuestion } from '@/types/surveys'
import { Plus, Trash2, GripVertical, Edit2, ChevronUp, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  getSurveyQuestions,
  createSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
  updateQuestionOrders
} from '@/lib/surveys'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'

interface QuestionItemProps {
  question: SurveyQuestion
  index: number
  onEdit: (question: SurveyQuestion) => void
  onDelete: (questionId: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  isDraggable?: boolean
}

function QuestionItem({
  question,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isDraggable = true
}: QuestionItemProps) {
  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      short_answer: 'Short Answer',
      long_answer: 'Long Answer',
      multiple_choice: 'Multiple Choice',
      dropdown: 'Dropdown',
      checkboxes: 'Checkboxes'
    }
    return labels[type] || type
  }

  const content = (
    <div className="flex items-start gap-3">
      {isDraggable && (
        <div className="cursor-move mt-1">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium">
              {index + 1}. {question.question_text}
              {question.is_required && <span className="text-destructive ml-1">*</span>}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {getQuestionTypeLabel(question.question_type)}
            </p>
            {question.options && question.options.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {question.options.map((option, i) => (
                  <li key={i}>• {option}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveUp()}
              disabled={isFirst}
              title="Move Up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveDown()}
              disabled={isLast}
              title="Move Down"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(question)}
              title="Edit Question"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(question.id)}
              title="Delete Question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (!isDraggable) {
    return <Card className="p-4">{content}</Card>
  }

  return (
    <Draggable draggableId={question.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-4 ${snapshot.isDragging ? 'opacity-50' : ''}`}
          style={provided.draggableProps.style}
        >
          {content}
        </Card>
      )}
    </Draggable>
  )
}

interface SurveyBuilderContentProps {
  surveyId: string
}

export function SurveyBuilderContent({ surveyId }: SurveyBuilderContentProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadQuestions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  const loadQuestions = async () => {
    try {
      setIsLoading(true)
      const loadedQuestions = await getSurveyQuestions(surveyId)
      setQuestions(loadedQuestions)
    } catch (error) {
      console.error('Failed to load questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddQuestion = async (questionData: {
    question_text: string
    question_type: string
    options?: string[]
    is_required: boolean
  }) => {
    try {
      await createSurveyQuestion(surveyId, {
        ...questionData,
        sort_order: questions.length
      })
      await loadQuestions()
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to add question:', error)
      alert('Failed to add question')
    }
  }

  const handleUpdateQuestion = async (questionData: {
    question_text: string
    question_type: string
    options?: string[]
    is_required: boolean
  }) => {
    if (!editingQuestion) return

    try {
      await updateSurveyQuestion(editingQuestion.id, questionData)
      await loadQuestions()
      setEditingQuestion(null)
    } catch (error) {
      console.error('Failed to update question:', error)
      alert('Failed to update question')
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      await deleteSurveyQuestion(questionId)
      await loadQuestions()
    } catch (error) {
      console.error('Failed to delete question:', error)
      alert('Failed to delete question')
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      return
    }

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) {
      return
    }

    // Reorder the questions array
    const newQuestions = Array.from(questions)
    const [removed] = newQuestions.splice(sourceIndex, 1)
    newQuestions.splice(destinationIndex, 0, removed)

    // Optimistically update the UI
    setQuestions(newQuestions)

    // Update sort_order for all affected questions
    try {
      setIsSaving(true)
      const updates = newQuestions.map((q, index) => ({
        id: q.id,
        sort_order: index
      }))
      await updateQuestionOrders(updates)
    } catch (error) {
      console.error('Failed to reorder questions:', error)
      // Revert on error
      await loadQuestions()
      alert('Failed to reorder questions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= questions.length) return

    // Reorder the questions array
    const newQuestions = Array.from(questions)
    const [removed] = newQuestions.splice(index, 1)
    newQuestions.splice(newIndex, 0, removed)

    // Optimistically update the UI
    setQuestions(newQuestions)

    // Update sort_order for all affected questions
    try {
      setIsSaving(true)
      const updates = newQuestions.map((q, idx) => ({
        id: q.id,
        sort_order: idx
      }))
      await updateQuestionOrders(updates)
    } catch (error) {
      console.error('Failed to reorder questions:', error)
      // Revert on error
      await loadQuestions()
      alert('Failed to reorder questions')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading questions...</div>
  }

  // Show editor if adding or editing
  if (isAdding || editingQuestion) {
    return (
      <QuestionEditor
        onSave={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
        onCancel={() => {
          setIsAdding(false)
          setEditingQuestion(null)
        }}
        initialData={editingQuestion ? {
          question_text: editingQuestion.question_text,
          question_type: editingQuestion.question_type as any,
          options: editingQuestion.options,
          is_required: editingQuestion.is_required
        } : undefined}
        mode={editingQuestion ? 'edit' : 'add'}
      />
    )
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No questions yet. Add your first question to get started.</p>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {questions.map((question, index) => (
                  <QuestionItem
                    key={`${question.id}-${index}`}
                    question={question}
                    index={index}
                    onEdit={setEditingQuestion}
                    onDelete={handleDeleteQuestion}
                    onMoveUp={() => handleMoveQuestion(index, 'up')}
                    onMoveDown={() => handleMoveQuestion(index, 'down')}
                    isFirst={index === 0}
                    isLast={index === questions.length - 1}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Button
        onClick={() => setIsAdding(true)}
        variant="outline"
        className="w-full"
        disabled={isSaving}
      >
        <Plus className="h-4 w-4 mr-2" /> Add Question
      </Button>

      {isSaving && (
        <div className="text-center text-sm text-muted-foreground">
          Saving changes...
        </div>
      )}
    </div>
  )
}