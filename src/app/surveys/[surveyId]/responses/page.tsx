'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Users, Calendar, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'

interface SurveyResponse {
  id: string
  respondent_name: string | null
  respondent_email: string | null
  submitted_at: string
  answers: {
    id: string
    question_id: string
    answer_text: string | null
    answer_options: string[] | null
  }[]
}

interface Question {
  id: string
  question_text: string
  question_type: string
  options: string[] | null
  is_required: boolean
  sort_order: number
}

interface Survey {
  id: string
  title: string
  description: string | null
  status: string
  questions: Question[]
}

function Page() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [questionStats, setQuestionStats] = useState<Record<string, {
    type?: string
    totalResponses: number
    answered: number
    skipped: number
    percentage: number
    options?: Record<string, number>
    optionCounts?: Record<string, number>
    responses?: string[]
  }>>({})
  const [responseCount, setResponseCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadResponses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  const loadResponses = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('API Error:', response.status, errorData)
        throw new Error(errorData?.error || `Failed to load responses (${response.status})`)
      }

      const data = await response.json()
      setSurvey(data.survey)
      setResponses(data.responses)
      setQuestionStats(data.questionStats)
      setResponseCount(data.responseCount)
    } catch (error) {
      console.error('Error loading responses:', error)
      alert(error instanceof Error ? error.message : 'Failed to load survey responses')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!survey || !responses.length) return

    // Create CSV headers
    const headers = ['Submitted At', 'Name', 'Email']
    survey.questions.forEach(q => {
      headers.push(q.question_text)
    })

    // Create CSV rows
    const rows = responses.map(response => {
      const row = [
        format(new Date(response.submitted_at), 'yyyy-MM-dd HH:mm'),
        response.respondent_name || 'Anonymous',
        response.respondent_email || 'N/A'
      ]

      survey.questions.forEach(question => {
        const answer = response.answers.find(a => a.question_id === question.id)
        if (answer) {
          if (answer.answer_options && answer.answer_options.length > 0) {
            row.push(answer.answer_options.join(', '))
          } else {
            row.push(answer.answer_text || '')
          }
        } else {
          row.push('')
        }
      })

      return row
    })

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${survey.title.replace(/\s+/g, '_')}_responses.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getAnswerDisplay = (question: Question, response: SurveyResponse) => {
    const answer = response.answers.find(a => a.question_id === question.id)
    if (!answer) return <span className="text-muted-foreground">No response</span>

    if (answer.answer_options && answer.answer_options.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {answer.answer_options.map((option, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{option}</Badge>
          ))}
        </div>
      )
    }

    return <span className="text-sm">{answer.answer_text || <span className="text-muted-foreground">No response</span>}</span>
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading responses...</p>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/surveys')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{survey.title} - Responses</h1>
              {survey.description && (
                <p className="text-muted-foreground">{survey.description}</p>
              )}
            </div>
          </div>
          <Button onClick={exportToCSV} disabled={responses.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{responseCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{survey.questions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {responses.length > 0
                  ? format(new Date(responses[0].submitted_at), 'MMM d, yyyy h:mm a')
                  : 'No responses yet'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="individual">Individual Responses</TabsTrigger>
            <TabsTrigger value="summary">Question Summary</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {responses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No responses yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          {survey.questions.slice(0, 3).map((q, index) => (
                            <TableHead key={q.id}>
                              Q{index + 1}: {q.question_text.length > 30
                                ? q.question_text.substring(0, 30) + '...'
                                : q.question_text}
                            </TableHead>
                          ))}
                          {survey.questions.length > 3 && (
                            <TableHead>+{survey.questions.length - 3} more...</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {responses.map((response) => (
                          <TableRow key={response.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(response.submitted_at), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>
                              {response.respondent_name || 'Anonymous'}
                            </TableCell>
                            <TableCell>
                              {response.respondent_email || 'N/A'}
                            </TableCell>
                            {survey.questions.slice(0, 3).map((question) => (
                              <TableCell key={question.id}>
                                {getAnswerDisplay(question, response)}
                              </TableCell>
                            ))}
                            {survey.questions.length > 3 && (
                              <TableCell>
                                <span className="text-muted-foreground text-sm">
                                  View in Individual tab
                                </span>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Individual Responses Tab */}
          <TabsContent value="individual">
            {responses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No responses yet</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {responses.map((response, index) => (
                  <AccordionItem key={response.id} value={response.id}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            Response #{index + 1}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {response.respondent_name || 'Anonymous'}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(response.submitted_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                          <div>
                            <span className="text-sm font-medium">Name:</span>
                            <p className="text-sm text-muted-foreground">
                              {response.respondent_name || 'Anonymous'}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Email:</span>
                            <p className="text-sm text-muted-foreground">
                              {response.respondent_email || 'Not provided'}
                            </p>
                          </div>
                        </div>
                        {survey.questions.map((question, qIndex) => {
                          const answer = response.answers.find(a => a.question_id === question.id)
                          return (
                            <div key={question.id} className="space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-sm">
                                  {qIndex + 1}.
                                </span>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {question.question_text}
                                    {question.is_required && (
                                      <span className="text-destructive ml-1">*</span>
                                    )}
                                  </p>
                                  <div className="mt-1">
                                    {answer ? (
                                      answer.answer_options && answer.answer_options.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {answer.answer_options.map((option, i) => (
                                            <Badge key={i} variant="secondary">{option}</Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          {answer.answer_text || 'No response'}
                                        </p>
                                      )
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No response</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* Question Summary Tab */}
          <TabsContent value="summary">
            <div className="space-y-6">
              {survey.questions.map((question, index) => {
                const stats = questionStats[question.id]
                if (!stats) return null

                return (
                  <Card key={question.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {index + 1}. {question.question_text}
                        {question.is_required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {stats.totalResponses} response{stats.totalResponses !== 1 ? 's' : ''}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {(stats.type === 'choice' || stats.type === 'checkboxes') && stats.options ? (
                        <div className="space-y-3">
                          {Object.entries(stats.options).map(([option, count]) => {
                            const percentage = stats.totalResponses > 0
                              ? ((count as number) / stats.totalResponses) * 100
                              : 0
                            return (
                              <div key={option} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span>{option}</span>
                                  <span className="text-muted-foreground">
                                    {count as number} ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {stats.responses && stats.responses.length > 0 ? (
                            stats.responses.map((text: string, i: number) => (
                              <div key={i} className="p-2 bg-muted rounded-md">
                                <p className="text-sm">{text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No responses</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default Page