'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Copy, Eye } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SurveyBuilderContent } from '@/components/surveys/SurveyBuilderContent'
import { SurveyFormContent } from '@/components/surveys/SurveyFormContent'
import type { Survey } from '@/types/surveys'
import { Badge } from '@/components/ui/badge'
import { getSurvey } from '@/lib/surveys'

function Page() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSurvey()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  const loadSurvey = async () => {
    try {
      setIsLoading(true)
      const loadedSurvey = await getSurvey(surveyId)
      setSurvey(loadedSurvey)
    } catch (error) {
      console.error('Error loading survey:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/s/${surveyId}`
    navigator.clipboard.writeText(link)
    alert('Survey link copied to clipboard!')
  }

  const handlePreview = () => {
    window.open(`/s/${surveyId}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'published':
        return <Badge variant="default" className="bg-green-600">Published</Badge>
      case 'closed':
        return <Badge variant="outline">Closed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading survey...</p>
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
            onClick={() => router.push('/surveys')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{survey.title}</h1>
              {getStatusBadge(survey.status)}
            </div>
            {survey.description && (
              <p className="text-muted-foreground">{survey.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            {survey.status === 'published' && (
              <Button onClick={handleCopyLink} className="btn-accent">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <SurveyBuilderContent surveyId={surveyId} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Survey Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <SurveyFormContent
                  surveyId={surveyId}
                  mode="edit"
                  onSuccess={loadSurvey}
                />
              </CardContent>
            </Card>

            {survey.status === 'published' && (
              <Card>
                <CardHeader>
                  <CardTitle>Share</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Share this link with respondents:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/s/${surveyId}`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button size="icon" variant="outline" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Page
