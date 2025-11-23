'use client'

import React, { useState, useEffect } from 'react'
import { SurveyResponse } from '@/types/surveys'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface SurveyResponseViewProps {
  surveyId: string
  responseId: string
}

export function SurveyResponseView({ surveyId, responseId }: SurveyResponseViewProps) {
  const [response, setResponse] = useState<SurveyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadResponse()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, responseId])

  const loadResponse = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/surveys/${surveyId}/responses/${responseId}`)
      if (res.ok) {
        const { response: loadedResponse } = await res.json()
        setResponse(loadedResponse)
      }
    } catch (error) {
      console.error('Failed to load response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!response) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Response not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-600">Thank You!</h1>
        <p className="text-muted-foreground mt-2">
          Your response has been recorded successfully.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Your Responses</h2>
        <div className="space-y-4">
          {response.survey_answers?.map((answer, index) => (
            <div key={answer.id} className="space-y-2">
              <p className="font-medium text-sm">
                {index + 1}. {answer.question?.question_text}
              </p>
              <p className="text-muted-foreground pl-4">
                {answer.answer_text || answer.answer_options?.join(', ') || '—'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Submitted on {new Date(response.submitted_at).toLocaleString()}
      </p>
    </div>
  )
}
