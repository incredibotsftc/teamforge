import { NextRequest, NextResponse } from 'next/server'
import { handleAPIError } from '@/lib/api-errors'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET - Fetch a specific response with answers (PUBLIC endpoint for confirmation page)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string; responseId: string }> }
) {
  try {
    const { surveyId, responseId } = await params

    // Create anonymous Supabase client for public access
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch the response with all answers and question details
    const { data: response, error } = await supabaseClient
      .from('survey_responses')
      .select(`
        *,
        surveys!inner (
          id,
          title,
          description
        ),
        survey_answers (
          *,
          survey_questions (
            id,
            question_text,
            question_type,
            options,
            sort_order
          )
        )
      `)
      .eq('id', responseId)
      .eq('survey_id', surveyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Response not found' },
          { status: 404 }
        )
      }
      throw new Error(`Failed to fetch response: ${error.message}`)
    }

    // Sort the answers by question sort_order
    if (response?.survey_answers) {
      response.survey_answers.sort((a: { survey_questions?: { sort_order?: number } }, b: { survey_questions?: { sort_order?: number } }) => {
        const sortA = a.survey_questions?.sort_order ?? 999
        const sortB = b.survey_questions?.sort_order ?? 999
        return sortA - sortB
      })
    }

    return NextResponse.json({ response })
  } catch (error) {
    return handleAPIError(error)
  }
}
