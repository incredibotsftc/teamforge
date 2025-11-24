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
      // Add cache-busting to ensure we get the latest survey data
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/public/surveys/${surveyId}?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) {
        if (response.status === 403) {
          setError('This survey is not currently available')
        } else {
          setError('Survey not found')
        }
        return
      }
      const { survey: loadedSurvey } = await response.json()
      setSurvey(loadedSurvey)
    } catch {
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

      const response = await fetch(`/api/public/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  if (error || !survey) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'This survey is not currently available.'}</p>
      </div>
    )
  }

  return (
    <div className="w-full py-8 px-4">
      <div className="w-full border rounded-xl shadow-sm bg-card">
        {/* Template Header with Title Overlay */}
        {survey.template?.header_image_url ? (
          <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-t-xl">
            <img
              src={survey.template.header_image_url}
              alt="Survey header"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
              <div className="p-8 w-full">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{survey.title}</h1>
                {survey.description && (
                  <p className="text-white/90 mt-2">{survey.description}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-8 pb-6 px-6">
            <h1 className="text-3xl font-bold text-center">{survey.title}</h1>
            {survey.description && (
              <p className="text-muted-foreground mt-2 text-center">{survey.description}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 px-6 pt-6 pb-8">

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

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

        {/* Template Footer */}
        {survey.template?.footer_html && (
          <div className="max-w-2xl mx-auto px-6 pb-8">
            <div className="p-6 bg-muted/50 rounded-lg">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: survey.template.footer_html }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Powered by Footer */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Powered by{' '}
          <a
            href="https://www.ftcteamforge.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            FTC TeamForge
          </a>
        </p>
      </div>
    </div>
  )
}
