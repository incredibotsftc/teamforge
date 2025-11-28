import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError } from '@/lib/api-errors'
import { QuestionAnalytics } from '@/types/surveys'

export const dynamic = 'force-dynamic'

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
        .select('id, title')
        .eq('id', surveyId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (!survey) {
        return NextResponse.json(
          { error: 'Survey not found' },
          { status: 404 }
        )
      }

      // Get all questions for the survey
      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('sort_order', { ascending: true })

      if (questionsError) {
        throw new Error(`Failed to fetch questions: ${questionsError.message}`)
      }

      // Get all responses for the survey
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', surveyId)

      if (responsesError) {
        throw new Error(`Failed to fetch responses: ${responsesError.message}`)
      }

      const total_responses = responses?.length || 0

      // Get all answers for the survey
      const { data: answers, error: answersError } = await supabase
        .from('survey_answers')
        .select(`
          *,
          survey_responses!inner (
            survey_id
          )
        `)
        .eq('survey_responses.survey_id', surveyId)

      if (answersError) {
        throw new Error(`Failed to fetch answers: ${answersError.message}`)
      }

      // Aggregate analytics for each question
      const questionAnalytics: QuestionAnalytics[] = questions?.map(question => {
        const questionAnswers = answers?.filter(a => a.question_id === question.id) || []

        // For text-based questions (short_answer, long_answer)
        if (['short_answer', 'long_answer'].includes(question.question_type)) {
          return {
            question_id: question.id,
            question_text: question.question_text,
            question_type: question.question_type,
            responses: {
              text_answers: questionAnswers
                .filter(a => a.answer_text)
                .map(a => a.answer_text as string)
            }
          }
        }

        // For choice-based questions (multiple_choice, dropdown, checkboxes)
        if (['multiple_choice', 'dropdown', 'checkboxes'].includes(question.question_type)) {
          const optionCounts: { [option: string]: number } = {}

          // Initialize counts for all options
          if (question.options && Array.isArray(question.options)) {
            question.options.forEach((option: string) => {
              optionCounts[option] = 0
            })
          }

          // Count responses
          questionAnswers.forEach(answer => {
            if (question.question_type === 'checkboxes' && answer.answer_options) {
              // For checkboxes, multiple options can be selected
              const selectedOptions = answer.answer_options as string[]
              selectedOptions.forEach(option => {
                optionCounts[option] = (optionCounts[option] || 0) + 1
              })
            } else if (answer.answer_text) {
              // For single-choice questions
              const option = answer.answer_text
              optionCounts[option] = (optionCounts[option] || 0) + 1
            }
          })

          return {
            question_id: question.id,
            question_text: question.question_text,
            question_type: question.question_type,
            responses: {
              option_counts: optionCounts
            }
          }
        }

        // Default fallback
        return {
          question_id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          responses: {}
        }
      }) || []

      return NextResponse.json({
        total_responses,
        questions: questionAnalytics
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
