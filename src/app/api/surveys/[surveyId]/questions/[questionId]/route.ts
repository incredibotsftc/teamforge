import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

const VALID_QUESTION_TYPES = ['short_answer', 'long_answer', 'multiple_choice', 'dropdown', 'checkboxes']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  try {
    const { surveyId, questionId } = await params
    const body = await request.json()
    const { question_text, question_type, options, is_required, sort_order } = body

    // Validate question type if provided
    if (question_type && !VALID_QUESTION_TYPES.includes(question_type)) {
      throw new Error(`Invalid question type. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}`)
    }

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

      // Build update object
      const updateData: {
        question_text?: string
        question_type?: string
        options?: string[] | null
        is_required?: boolean
        sort_order?: number
        updated_at?: string
      } = {
        updated_at: new Date().toISOString()
      }

      if (question_text !== undefined) updateData.question_text = question_text
      if (question_type !== undefined) updateData.question_type = question_type
      if (options !== undefined) updateData.options = options
      if (is_required !== undefined) updateData.is_required = is_required
      if (sort_order !== undefined) updateData.sort_order = sort_order

      // Update the question
      const { data: question, error } = await supabase
        .from('survey_questions')
        .update(updateData)
        .eq('id', questionId)
        .eq('survey_id', surveyId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Question not found' },
            { status: 404 }
          )
        }
        throw new Error(`Failed to update question: ${error.message}`)
      }

      return NextResponse.json({ question })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  try {
    const { surveyId, questionId } = await params

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

      // Delete the question
      const { error } = await supabase
        .from('survey_questions')
        .delete()
        .eq('id', questionId)
        .eq('survey_id', surveyId)

      if (error) {
        throw new Error(`Failed to delete question: ${error.message}`)
      }

      return NextResponse.json({ success: true }, { status: 200 })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
