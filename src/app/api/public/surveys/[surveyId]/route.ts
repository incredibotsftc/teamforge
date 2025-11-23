import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { handleAPIError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params

    // Fetch survey with all questions - no auth required
    const { data: survey, error } = await supabase
      .from('surveys')
      .select(`
        *,
        questions:survey_questions(*)
      `)
      .eq('id', surveyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Survey not found' },
          { status: 404 }
        )
      }
      throw new Error(`Failed to fetch survey: ${error.message}`)
    }

    // Only allow access to published surveys
    if (survey.status !== 'published') {
      return NextResponse.json(
        { error: 'Survey not available' },
        { status: 403 }
      )
    }

    // Sort questions by sort_order
    if (survey.questions) {
      survey.questions.sort((a: any, b: any) => a.sort_order - b.sort_order)
    }

    return NextResponse.json({ survey })
  } catch (error) {
    return handleAPIError(error)
  }
}