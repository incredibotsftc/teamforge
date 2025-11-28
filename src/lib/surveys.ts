import { supabase } from './supabase'

export async function getTeamSurveys(teamId: string, seasonId: string) {
  // Log parameters for debugging
  console.log('getTeamSurveys called with:', { teamId, seasonId })

  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })

  if (error) {
    // Log complete error information
    console.error('Error fetching surveys - Full details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error
    })
    throw new Error(`Failed to fetch surveys: ${error.message} (code: ${error.code})`)
  }

  // Get question counts for each survey
  const surveysWithCount = await Promise.all(
    (data || []).map(async (survey) => {
      const { count } = await supabase
        .from('survey_questions')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.id)

      return {
        ...survey,
        question_count: count || 0
      }
    })
  )

  return surveysWithCount
}

export async function getSurvey(surveyId: string) {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .single()

  if (error) {
    console.error('Error fetching survey:', error)
    throw error
  }

  return data
}

export async function deleteSurvey(surveyId: string) {
  const { error } = await supabase
    .from('surveys')
    .delete()
    .eq('id', surveyId)

  if (error) {
    console.error('Error deleting survey:', error)
    throw error
  }
}

export async function getSurveyQuestions(surveyId: string) {
  const { data, error } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('survey_id', surveyId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching survey questions:', error)
    throw error
  }

  return data || []
}

export async function createSurveyQuestion(surveyId: string, questionData: {
  question_text: string
  question_type: string
  options?: string[]
  is_required: boolean
  sort_order: number
}) {
  const { data, error } = await supabase
    .from('survey_questions')
    .insert({
      survey_id: surveyId,
      ...questionData
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating question:', error)
    throw error
  }

  return data
}

export async function updateSurveyQuestion(questionId: string, questionData: {
  question_text?: string
  question_type?: string
  options?: string[]
  is_required?: boolean
  sort_order?: number
}) {
  const { data, error } = await supabase
    .from('survey_questions')
    .update(questionData)
    .eq('id', questionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating question:', error)
    throw error
  }

  return data
}

export async function updateQuestionOrders(updates: { id: string; sort_order: number }[]) {
  const promises = updates.map(({ id, sort_order }) =>
    supabase
      .from('survey_questions')
      .update({ sort_order })
      .eq('id', id)
  )

  const results = await Promise.all(promises)

  const errors = results.filter(r => r.error)
  if (errors.length > 0) {
    console.error('Error updating question orders:', errors)
    throw new Error('Failed to update question orders')
  }
}

export async function deleteSurveyQuestion(questionId: string) {
  const { error } = await supabase
    .from('survey_questions')
    .delete()
    .eq('id', questionId)

  if (error) {
    console.error('Error deleting question:', error)
    throw error
  }
}

export async function getSurveyResponses(surveyId: string) {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching survey responses:', error)
    throw error
  }

  return data || []
}

export async function getSurveyAnswers(responseId: string) {
  const { data, error } = await supabase
    .from('survey_answers')
    .select(`
      *,
      question:survey_questions(*)
    `)
    .eq('response_id', responseId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching survey answers:', error)
    throw error
  }

  return data || []
}
