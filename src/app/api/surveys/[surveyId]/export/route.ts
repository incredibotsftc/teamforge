import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError } from '@/lib/api-errors'
import { arrayToCSV } from '@/lib/csvExport'

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

      // Get all responses with answers
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select(`
          *,
          survey_answers (
            question_id,
            answer_text,
            answer_options
          )
        `)
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })

      if (responsesError) {
        throw new Error(`Failed to fetch responses: ${responsesError.message}`)
      }

      if (!responses || responses.length === 0) {
        return NextResponse.json(
          { error: 'No responses to export' },
          { status: 404 }
        )
      }

      // Build CSV data
      const csvData = responses.map(response => {
        const row: Record<string, string> = {
          'Response ID': response.id,
          'Submitted At': new Date(response.submitted_at).toLocaleString(),
          'Respondent Name': response.respondent_name || 'Anonymous',
          'Respondent Email': response.respondent_email || ''
        }

        // Add answer for each question
        questions?.forEach(question => {
          const answer = response.survey_answers?.find(
            (a: { question_id: string }) => a.question_id === question.id
          )

          let answerValue = ''
          if (answer) {
            if (answer.answer_text) {
              answerValue = answer.answer_text
            } else if (answer.answer_options && Array.isArray(answer.answer_options)) {
              answerValue = answer.answer_options.join('; ')
            }
          }

          row[question.question_text] = answerValue
        })

        return row
      })

      // Generate CSV headers
      const headers = [
        { key: 'Response ID', label: 'Response ID' },
        { key: 'Submitted At', label: 'Submitted At' },
        { key: 'Respondent Name', label: 'Respondent Name' },
        { key: 'Respondent Email', label: 'Respondent Email' },
        ...(questions?.map(q => ({
          key: q.question_text,
          label: q.question_text
        })) || [])
      ]

      // Convert to CSV
      const csv = arrayToCSV(csvData, headers)

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `survey-${survey.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.csv`

      // Return CSV file
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
