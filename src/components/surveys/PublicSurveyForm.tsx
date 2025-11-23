'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SurveyWithQuestions } from '@/types/surveys'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PublicSurveyFormProps {
  surveyId: string
}

export function PublicSurveyForm({ surveyId }: PublicSurveyFormProps) {
  const router = useRouter()
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null)
  const [answers, setAnswers] = useState<Record<string, { answer_text?: string; answer_options?: string[] }>>({})
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSurvey()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  const loadSurvey = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/surveys/${surveyId}`)
      if (!response.ok) {
        throw new Error('Survey not found')
      }
      const { survey: loadedSurvey } = await response.json()
      setSurvey(loadedSurvey)
    } catch (err) {
      setError('Failed to load survey')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required questions
    const requiredQuestions = survey?.questions.filter(q => q.is_required) || []
    const missingAnswers = requiredQuestions.filter(q => !answers[q.id])

    if (missingAnswers.length > 0) {
      setError('Please answer all required questions')
      return
    }

    try {
      setIsSubmitting(true)

      const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        ...answer
      }))

      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondent_name: respondentName || undefined,
          respondent_email: respondentEmail || undefined,
          answers: answerArray
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit survey')
      }

      const { response_id } = await response.json()
      router.push(`/s/${surveyId}/response/${response_id}`)
    } catch (err) {
      console.error('Error submitting survey:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit survey')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!survey || survey.status !== 'published') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">This survey is not currently available.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{survey.title}</h1>
        {survey.description && (
          <p className="text-muted-foreground mt-2">{survey.description}</p>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="respondentName">Your Name (Optional)</Label>
        <Input
          id="respondentName"
          value={respondentName}
          onChange={(e) => setRespondentName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="respondentEmail">Your Email (Optional)</Label>
        <Input
          id="respondentEmail"
          type="email"
          value={respondentEmail}
          onChange={(e) => setRespondentEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      <hr />

      {survey.questions.map((question, index) => (
        <div key={question.id} className="space-y-3">
          <Label>
            {index + 1}. {question.question_text}
            {question.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {question.question_type === 'short_answer' && (
            <Input
              value={answers[question.id]?.answer_text || ''}
              onChange={(e) => setAnswers({ ...answers, [question.id]: { answer_text: e.target.value } })}
              required={question.is_required}
            />
          )}

          {question.question_type === 'long_answer' && (
            <Textarea
              value={answers[question.id]?.answer_text || ''}
              onChange={(e) => setAnswers({ ...answers, [question.id]: { answer_text: e.target.value } })}
              required={question.is_required}
              rows={4}
            />
          )}

          {question.question_type === 'multiple_choice' && question.options && (
            <RadioGroup
              value={answers[question.id]?.answer_text}
              onValueChange={(value) => setAnswers({ ...answers, [question.id]: { answer_text: value } })}
              required={question.is_required}
            >
              {question.options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                  <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === 'dropdown' && question.options && (
            <Select
              value={answers[question.id]?.answer_text}
              onValueChange={(value) => setAnswers({ ...answers, [question.id]: { answer_text: value } })}
              required={question.is_required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option, i) => (
                  <SelectItem key={i} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {question.question_type === 'checkboxes' && question.options && (
            <div className="space-y-2">
              {question.options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${i}`}
                    checked={answers[question.id]?.answer_options?.includes(option) || false}
                    onCheckedChange={(checked) => {
                      const currentOptions = answers[question.id]?.answer_options || []
                      const newOptions = checked
                        ? [...currentOptions, option]
                        : currentOptions.filter(o => o !== option)
                      setAnswers({ ...answers, [question.id]: { answer_options: newOptions } })
                    }}
                  />
                  <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Button type="submit" disabled={isSubmitting} className="w-full btn-accent">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Survey
      </Button>
    </form>
  )
}
