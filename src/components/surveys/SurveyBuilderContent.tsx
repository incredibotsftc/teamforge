'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { QuestionEditor } from './QuestionEditor'
import { SurveyQuestion } from '@/types/surveys'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getSurveyQuestions, createSurveyQuestion, deleteSurveyQuestion } from '@/lib/surveys'

interface SurveyBuilderContentProps {
  surveyId: string
}

export function SurveyBuilderContent({ surveyId }: SurveyBuilderContentProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading) {
    return <div className="text-center py-8">Loading questions...</div>
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 && !isAdding && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No questions yet. Add your first question to get started.</p>
        </Card>
      )}

      {questions.map((question, index) => (
        <Card key={question.id} className="p-4">
          <div className="flex items-start gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {isAdding ? (
        <QuestionEditor
          onSave={handleAddQuestion}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Question
        </Button>
      )}
    </div>
  )
}
