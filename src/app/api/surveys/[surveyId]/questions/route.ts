import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

const VALID_QUESTION_TYPES = ['short_answer', 'long_answer', 'multiple_choice', 'dropdown', 'checkboxes']

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

      // Fetch questions ordered by sort_order
      const { data: questions, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('sort_order', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch questions: ${error.message}`)
      }

      return NextResponse.json({ questions })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const body = await request.json()
    const { question_text, question_type, options, is_required = false, sort_order = 0 } = body

    // Validate required fields
    if (!question_text || !question_type) {
      throw ValidationError.MISSING_FIELDS(['question_text', 'question_type'])
    }

    // Validate question type
    if (!VALID_QUESTION_TYPES.includes(question_type)) {
      throw new Error(`Invalid question type. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}`)
    }

    // Validate options for choice-based questions
    const choiceTypes = ['multiple_choice', 'dropdown', 'checkboxes']
    if (choiceTypes.includes(question_type)) {
      if (!options || !Array.isArray(options) || options.length === 0) {
        throw new Error(`Question type '${question_type}' requires at least one option`)
      }
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

      // Create the question
      const { data: question, error } = await supabase
        .from('survey_questions')
        .insert({
          survey_id: surveyId,
          question_text,
          question_type,
          options: options || null,
          is_required,
          sort_order
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create question: ${error.message}`)
      }

      return NextResponse.json({ question }, { status: 201 })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const body = await request.json()
    const { questions } = body

    // Validate that questions is an array
    if (!questions || !Array.isArray(questions)) {
      throw new Error('Request must include a questions array')
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

      // Bulk update questions (for reordering or batch editing)
      const updates = questions.map(async (q: { id: string; sort_order?: number; question_text?: string; options?: string[]; is_required?: boolean }) => {
        const updateData: {
          sort_order?: number
          question_text?: string
          options?: string[]
          is_required?: boolean
          updated_at?: string
        } = {
          updated_at: new Date().toISOString()
        }

        if (q.sort_order !== undefined) updateData.sort_order = q.sort_order
        if (q.question_text !== undefined) updateData.question_text = q.question_text
        if (q.options !== undefined) updateData.options = q.options
        if (q.is_required !== undefined) updateData.is_required = q.is_required

        return supabase
          .from('survey_questions')
          .update(updateData)
          .eq('id', q.id)
          .eq('survey_id', surveyId)
          .select()
          .single()
      })

      const results = await Promise.all(updates)

      // Check for errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} question(s)`)
      }

      const updatedQuestions = results.map(r => r.data)

      return NextResponse.json({ questions: updatedQuestions })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
