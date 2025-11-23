'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Survey } from '@/types/surveys'
import { getSurvey, getSurveyResponses } from '@/lib/surveys'

function Page() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responseCount, setResponseCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [loadedSurvey, responses] = await Promise.all([
        getSurvey(surveyId),
        getSurveyResponses(surveyId)
      ])

      setSurvey(loadedSurvey)
      setResponseCount(responses?.length || 0)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `survey-responses-${surveyId}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting responses:', error)
      alert('Failed to export responses')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!survey) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Survey not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/surveys/${surveyId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Survey Responses</h1>
            <p className="text-muted-foreground">{survey.title}</p>
          </div>
          {responseCount > 0 && (
            <Button onClick={handleExport} className="btn-accent">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Response Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-5xl font-bold text-primary">{responseCount}</div>
              <p className="text-muted-foreground mt-2">
                {responseCount === 1 ? 'Response' : 'Responses'}
              </p>
              {responseCount === 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  No responses yet. Share your survey to start collecting responses.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default Page
