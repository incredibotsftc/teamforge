'use client'

import { useParams } from 'next/navigation'
import { SurveyResponseView } from '@/components/surveys/SurveyResponseView'

function Page() {
  const params = useParams()
  const surveyId = params.surveyId as string
  const responseId = params.responseId as string

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12">
        <SurveyResponseView surveyId={surveyId} responseId={responseId} />
      </div>
    </div>
  )
}

export default Page
