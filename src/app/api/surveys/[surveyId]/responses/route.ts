import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET - Fetch all responses for a survey (authenticated, team members only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params

    return await withAuth(request, async ({ teamMember, supabase }) => {
      // Verify survey belongs to team
      const { data: survey } = await supabase
        .from('surveys')
        .select('id')
        .eq('id', surveyId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (!survey) {
        return NextResponse.json(
          { error: 'Survey not found' },
          { status: 404 }
        )
      }

      // First get the survey details with questions
      const { data: surveyDetails } = await supabase
        .from('surveys')
        .select(`
          id,
          title,
          description,
          status,
          questions:survey_questions(
            id,
            question_text,
            question_type,
            options,
            is_required,
            sort_order
          )
        `)
        .eq('id', surveyId)
        .single()

      // Sort questions by sort_order
      if (surveyDetails?.questions) {
        surveyDetails.questions.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      }

      // Fetch all responses with answers
      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select(`
          id,
          respondent_name,
          respondent_email,
          submitted_at,
          answers:survey_answers(
            id,
            question_id,
            answer_text,
            answer_options
          )
        `)
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch responses: ${error.message}`)
      }

      // Calculate statistics for each question
      const questionStats: Record<string, {
        type: string
        options?: Record<string, number>
        responses?: string[]
        totalResponses: number
      }> = {}

      surveyDetails?.questions?.forEach((question: {
        id: string
        question_type: string
        options?: string[]
      }) => {
        const questionAnswers = responses?.flatMap(r =>
          r.answers?.filter((a: { question_id: string }) => a.question_id === question.id) || []
        ) || []

        if (question.question_type === 'multiple_choice' || question.question_type === 'dropdown') {
          // Count responses for each option
          const optionCounts: Record<string, number> = {}
          question.options?.forEach((option: string) => {
            optionCounts[option] = 0
          })

          questionAnswers.forEach((answer: { answer_text?: string }) => {
            if (answer.answer_text && optionCounts.hasOwnProperty(answer.answer_text)) {
              optionCounts[answer.answer_text]++
            }
          })

          questionStats[question.id] = {
            type: 'choice',
            options: optionCounts,
            totalResponses: questionAnswers.length
          }
        } else if (question.question_type === 'checkboxes') {
          // Count responses for checkbox options
          const optionCounts: Record<string, number> = {}
          question.options?.forEach((option: string) => {
            optionCounts[option] = 0
          })

          questionAnswers.forEach((answer: { answer_options?: string[] }) => {
            answer.answer_options?.forEach((option: string) => {
              if (optionCounts.hasOwnProperty(option)) {
                optionCounts[option]++
              }
            })
          })

          questionStats[question.id] = {
            type: 'checkboxes',
            options: optionCounts,
            totalResponses: questionAnswers.length
          }
        } else {
          // Text responses - just collect them
          questionStats[question.id] = {
            type: 'text',
            responses: questionAnswers.map((a: { answer_text?: string }) => a.answer_text).filter(Boolean) as string[],
            totalResponses: questionAnswers.length
          }
        }
      })

      return NextResponse.json({
        survey: surveyDetails,
        responses: responses || [],
        responseCount: responses?.length || 0,
        questionStats
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// POST - Submit a survey response (PUBLIC endpoint, no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const body = await request.json()
    const { respondent_name, respondent_email, answers } = body

    // Validate required fields
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      throw ValidationError.MISSING_FIELDS(['answers'])
    }

    // Create anonymous Supabase client for public access
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify survey exists and is published
    const { data: survey, error: surveyError } = await supabaseClient
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
        { error: 'This survey is not currently accepting responses' },
        { status: 403 }
      )
    }

    // Get all questions to validate required fields
    const { data: questions, error: questionsError } = await supabaseClient
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)

    if (questionsError || !questions) {
      throw new Error('Failed to fetch survey questions')
    }

    // Validate that all required questions are answered
    const requiredQuestions = questions.filter(q => q.is_required)
    const answeredQuestionIds = answers.map(a => a.question_id)

    const missingRequired = requiredQuestions.filter(
      q => !answeredQuestionIds.includes(q.id)
    )

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: 'Please answer all required questions',
          missing_questions: missingRequired.map(q => ({
            id: q.id,
            question_text: q.question_text
          }))
        },
        { status: 400 }
      )
    }

    // Create the response record
    const { data: response, error: responseError } = await supabaseClient
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        respondent_name: respondent_name || null,
        respondent_email: respondent_email || null,
        team_member_id: null // Public responses don't have team member ID
      })
      .select()
      .single()

    if (responseError) {
      throw new Error(`Failed to create response: ${responseError.message}`)
    }

    // Create answer records
    const answerRecords = answers.map(answer => ({
      response_id: response.id,
      question_id: answer.question_id,
      answer_text: answer.answer_text || null,
      answer_options: answer.answer_options || null
    }))

    const { error: answersError } = await supabaseClient
      .from('survey_answers')
      .insert(answerRecords)

    if (answersError) {
      // If answers fail, we should clean up the response
      await supabaseClient
        .from('survey_responses')
        .delete()
        .eq('id', response.id)

      throw new Error(`Failed to save answers: ${answersError.message}`)
    }

    return NextResponse.json(
      {
        success: true,
        response_id: response.id,
        message: 'Survey response submitted successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    return handleAPIError(error)
  }
}
