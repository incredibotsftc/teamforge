'use client'

import { useParams } from 'next/navigation'
import { PublicSurveyForm } from '@/components/surveys/PublicSurveyForm'

function Page() {
  const params = useParams()
  const surveyId = params.surveyId as string

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-4xl">
        <PublicSurveyForm surveyId={surveyId} />
      </div>
    </div>
  )
}

export default Page
