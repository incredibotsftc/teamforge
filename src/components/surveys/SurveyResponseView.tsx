'use client'

import React, { useState, useEffect } from 'react'
import { SurveyResponse, SurveyWithQuestions } from '@/types/surveys'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface SurveyResponseViewProps {
  surveyId: string
  responseId: string
}

interface ResponseWithAnswers extends SurveyResponse {
  survey_answers?: Array<{
    id: string
    answer_text?: string
    answer_options?: string[]
    survey_questions?: {
      question_text: string
      sort_order: number
    }
  }>
}

export function SurveyResponseView({ surveyId, responseId }: SurveyResponseViewProps) {
  const [response, setResponse] = useState<ResponseWithAnswers | null>(null)
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, responseId])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Load survey details with template
      const timestamp = new Date().getTime()
      const surveyRes = await fetch(`/api/public/surveys/${surveyId}?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (surveyRes.ok) {
        const { survey: loadedSurvey } = await surveyRes.json()
        setSurvey(loadedSurvey)
      }

      // Load response data (public endpoint, no auth needed)
      const responseRes = await fetch(`/api/surveys/${surveyId}/responses/${responseId}`)
      if (responseRes.ok) {
        const { response: loadedResponse } = await responseRes.json()
        setResponse(loadedResponse)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
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

  if (!response || !survey) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Response not found.</p>
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

        <div className="max-w-2xl mx-auto space-y-6 px-6 pt-6 pb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
            <p className="text-muted-foreground mt-2">
              Your response has been recorded successfully.
            </p>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Your Responses</h3>
            <div className="space-y-4">
              {response.survey_answers && response.survey_answers.length > 0 ? (
                response.survey_answers.map((answer, index: number) => (
                  <div key={answer.id} className="space-y-2">
                    <p className="font-medium text-sm">
                      {index + 1}. {answer.survey_questions?.question_text || 'Question not found'}
                    </p>
                    <p className="text-muted-foreground pl-4">
                      {answer.answer_text || (answer.answer_options && Array.isArray(answer.answer_options) ? answer.answer_options.join(', ') : '—')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">No responses recorded</p>
              )}
            </div>
          </Card>

          <p className="text-sm text-muted-foreground text-center">
            Submitted on {new Date(response.submitted_at).toLocaleString()}
          </p>
        </div>

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
