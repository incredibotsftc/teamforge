import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { handleAPIError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const body = await request.json()
    const { respondent_name, respondent_email, answers } = body

    // First verify the survey exists and is published
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, status')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      )
    }

    if (survey.status !== 'published') {
      return NextResponse.json(
        { error: 'Survey is not accepting responses' },
        { status: 403 }
      )
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        respondent_name,
        respondent_email,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (responseError) {
      throw new Error(`Failed to create response: ${responseError.message}`)
    }

    // Create the answers
    if (answers && answers.length > 0) {
      const answersToInsert = answers.map((answer: {
        question_id: string
        answer_text?: string
        answer_options?: string[]
      }) => ({
        response_id: response.id,
        question_id: answer.question_id,
        answer_text: answer.answer_text,
        answer_options: answer.answer_options
      }))

      const { error: answersError } = await supabase
        .from('survey_answers')
        .insert(answersToInsert)

      if (answersError) {
        // Delete the response if answers failed
        await supabase
          .from('survey_responses')
          .delete()
          .eq('id', response.id)

        throw new Error(`Failed to save answers: ${answersError.message}`)
      }
    }

    return NextResponse.json({
      response_id: response.id,
      message: 'Survey response submitted successfully'
    })
  } catch (error) {
    return handleAPIError(error)
  }
}