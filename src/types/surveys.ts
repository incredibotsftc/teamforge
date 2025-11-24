// Database types for surveys feature

export type QuestionType =
  | 'short_answer'
  | 'long_answer'
  | 'multiple_choice'
  | 'dropdown'
  | 'checkboxes'

export type SurveyStatus = 'draft' | 'published' | 'closed'

export interface Survey {
  id: string
  team_id: string
  season_id: string
  title: string
  description?: string
  status: SurveyStatus
  template_id?: string
  created_by: string
  created_at: string
  updated_at: string
  published_at?: string
  closed_at?: string
  question_count?: number // Aggregate field from helper function
  template?: SurveyTemplate // Include when fetching with template
}

export interface SurveyTemplate {
  id: string
  team_id: string
  name: string
  description?: string
  header_image_url?: string
  footer_content?: Record<string, unknown> // BlockNote JSON content
  footer_html?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface SurveyQuestion {
  id: string
  survey_id: string
  question_text: string
  question_type: QuestionType
  options?: string[] // For multiple_choice, dropdown, checkboxes
  is_required: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SurveyResponse {
  id: string
  survey_id: string
  respondent_name?: string
  respondent_email?: string
  team_member_id?: string
  submitted_at: string
  created_at: string
  answers?: SurveyAnswer[] // Include when fetching full response
}

export interface SurveyAnswer {
  id: string
  response_id: string
  question_id: string
  answer_text?: string
  answer_options?: string[] // For checkbox multi-select
  created_at: string
  question?: SurveyQuestion // Include for display
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[]
  template?: SurveyTemplate
}

export interface ResponseAnalytics {
  total_responses: number
  questions: QuestionAnalytics[]
}

export interface QuestionAnalytics {
  question_id: string
  question_text: string
  question_type: QuestionType
  responses: {
    text_answers?: string[] // For text questions
    option_counts?: { [option: string]: number } // For choice questions
  }
}

// Form types
export interface CreateSurveyForm {
  title: string
  description?: string
  status: SurveyStatus
  template_id?: string
}

export interface CreateTemplateForm {
  name: string
  description?: string
  header_image_url?: string
  footer_content?: Record<string, unknown>
  footer_html?: string
}

export interface CreateQuestionForm {
  question_text: string
  question_type: QuestionType
  options?: string[]
  is_required: boolean
  sort_order: number
}

export interface SubmitSurveyForm {
  respondent_name?: string
  respondent_email?: string
  answers: {
    question_id: string
    answer_text?: string
    answer_options?: string[]
  }[]
}
