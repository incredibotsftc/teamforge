-- Migration: v1.4.0
-- Description: Add surveys feature with public response collection and analytics
-- Created: 2025-01-22

-- ==============================================
-- UP SECTION
-- ==============================================

-- Create surveys table
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  team_id UUID NOT NULL,
  season_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (length(title) > 0),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'surveys_pkey'
  ) THEN
    ALTER TABLE ONLY public.surveys
      ADD CONSTRAINT surveys_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'surveys_team_fkey'
  ) THEN
    ALTER TABLE ONLY public.surveys
      ADD CONSTRAINT surveys_team_fkey
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'surveys_season_fkey'
  ) THEN
    ALTER TABLE ONLY public.surveys
      ADD CONSTRAINT surveys_season_fkey
      FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'surveys_created_by_fkey'
  ) THEN
    ALTER TABLE ONLY public.surveys
      ADD CONSTRAINT surveys_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_surveys_team_season ON public.surveys(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON public.surveys(created_at DESC);

-- Add comments
COMMENT ON TABLE public.surveys IS 'Survey templates created by teams with title, description, and status';
COMMENT ON COLUMN public.surveys.status IS 'Survey status: draft (editable), published (public, read-only), closed (no responses)';

-- Create survey_questions table
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  survey_id UUID NOT NULL,
  question_text TEXT NOT NULL CHECK (length(question_text) > 0),
  question_type TEXT NOT NULL CHECK (question_type IN ('short_answer', 'long_answer', 'multiple_choice', 'dropdown', 'checkboxes')),
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_questions_pkey'
  ) THEN
    ALTER TABLE ONLY public.survey_questions
      ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_questions_survey_fkey'
  ) THEN
    ALTER TABLE ONLY public.survey_questions
      ADD CONSTRAINT survey_questions_survey_fkey
      FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON public.survey_questions(survey_id, sort_order);

-- Add comments
COMMENT ON TABLE public.survey_questions IS 'Questions for surveys with different types (text, choice, etc.)';
COMMENT ON COLUMN public.survey_questions.question_type IS 'Type: short_answer, long_answer, multiple_choice, dropdown, checkboxes';
COMMENT ON COLUMN public.survey_questions.options IS 'JSON array of options for choice-based questions';
COMMENT ON COLUMN public.survey_questions.sort_order IS 'Display order of questions in the survey';

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  survey_id UUID NOT NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  team_member_id UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_pkey'
  ) THEN
    ALTER TABLE ONLY public.survey_responses
      ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_survey_fkey'
  ) THEN
    ALTER TABLE ONLY public.survey_responses
      ADD CONSTRAINT survey_responses_survey_fkey
      FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_team_member_fkey'
  ) THEN
    ALTER TABLE ONLY public.survey_responses
      ADD CONSTRAINT survey_responses_team_member_fkey
      FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_member ON public.survey_responses(team_member_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON public.survey_responses(submitted_at DESC);

-- Add comments
COMMENT ON TABLE public.survey_responses IS 'Survey submissions from respondents (public or team members)';
COMMENT ON COLUMN public.survey_responses.respondent_name IS 'Optional name for public respondents';
COMMENT ON COLUMN public.survey_responses.respondent_email IS 'Optional email for public respondents';
COMMENT ON COLUMN public.survey_responses.team_member_id IS 'Team member ID if respondent is authenticated (NULL for public)';

-- Create survey_answers table
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  response_id UUID NOT NULL,
  question_id UUID NOT NULL,
  answer_text TEXT,
  answer_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_answers_pkey'
  ) THEN
    ALTER TABLE ONLY public.survey_answers
      ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_answers_response_fkey'
  ) THEN
    ALTER TABLE ONLY public.survey_answers
      ADD CONSTRAINT survey_answers_response_fkey
      FOREIGN KEY (response_id) REFERENCES public.survey_responses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_answers_question_fkey'
  ) THEN
    ALTER TABLE ONLY public.survey_answers
      ADD CONSTRAINT survey_answers_question_fkey
      FOREIGN KEY (question_id) REFERENCES public.survey_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_answers_response ON public.survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON public.survey_answers(question_id);

-- Add comments
COMMENT ON TABLE public.survey_answers IS 'Individual answers to survey questions';
COMMENT ON COLUMN public.survey_answers.answer_text IS 'Text-based answer for text questions';
COMMENT ON COLUMN public.survey_answers.answer_options IS 'JSON array for checkbox multi-select answers';

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- ===== SURVEYS TABLE POLICIES =====

-- RLS Policy: Team members can view their team's surveys
DROP POLICY IF EXISTS "Team members can view their team's surveys" ON public.surveys;
CREATE POLICY "Team members can view their team's surveys"
  ON public.surveys
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can create surveys for their team
DROP POLICY IF EXISTS "Team members can create surveys for their team" ON public.surveys;
CREATE POLICY "Team members can create surveys for their team"
  ON public.surveys
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can update their team's surveys
DROP POLICY IF EXISTS "Team members can update their team's surveys" ON public.surveys;
CREATE POLICY "Team members can update their team's surveys"
  ON public.surveys
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can delete their team's surveys
DROP POLICY IF EXISTS "Team members can delete their team's surveys" ON public.surveys;
CREATE POLICY "Team members can delete their team's surveys"
  ON public.surveys
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- ===== SURVEY_QUESTIONS TABLE POLICIES =====

-- RLS Policy: Team members can view questions for their team's surveys
DROP POLICY IF EXISTS "Team members can view questions for their team's surveys" ON public.survey_questions;
CREATE POLICY "Team members can view questions for their team's surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Team members can create questions for their team's surveys
DROP POLICY IF EXISTS "Team members can create questions for their team's surveys" ON public.survey_questions;
CREATE POLICY "Team members can create questions for their team's surveys"
  ON public.survey_questions
  FOR INSERT
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Team members can update questions for their team's surveys
DROP POLICY IF EXISTS "Team members can update questions for their team's surveys" ON public.survey_questions;
CREATE POLICY "Team members can update questions for their team's surveys"
  ON public.survey_questions
  FOR UPDATE
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Team members can delete questions for their team's surveys
DROP POLICY IF EXISTS "Team members can delete questions for their team's surveys" ON public.survey_questions;
CREATE POLICY "Team members can delete questions for their team's surveys"
  ON public.survey_questions
  FOR DELETE
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Anyone can view questions for published surveys (needed for public survey form)
DROP POLICY IF EXISTS "Anyone can view questions for published surveys" ON public.survey_questions;
CREATE POLICY "Anyone can view questions for published surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys WHERE status = 'published'
    )
  );

-- ===== SURVEY_RESPONSES TABLE POLICIES =====

-- RLS Policy: Team members can view responses to their team's surveys
DROP POLICY IF EXISTS "Team members can view responses to their team's surveys" ON public.survey_responses;
CREATE POLICY "Team members can view responses to their team's surveys"
  ON public.survey_responses
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Anyone can submit responses to published surveys (public access)
DROP POLICY IF EXISTS "Anyone can submit responses to published surveys" ON public.survey_responses;
CREATE POLICY "Anyone can submit responses to published surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys WHERE status = 'published'
    )
  );

-- RLS Policy: Respondents can view their own response by ID (for confirmation page)
DROP POLICY IF EXISTS "Anyone can view specific response by ID" ON public.survey_responses;
CREATE POLICY "Anyone can view specific response by ID"
  ON public.survey_responses
  FOR SELECT
  USING (true); -- This allows anyone with the UUID to view the response

-- ===== SURVEY_ANSWERS TABLE POLICIES =====

-- RLS Policy: Team members can view answers to their team's surveys
DROP POLICY IF EXISTS "Team members can view answers to their team's surveys" ON public.survey_answers;
CREATE POLICY "Team members can view answers to their team's surveys"
  ON public.survey_answers
  FOR SELECT
  USING (
    response_id IN (
      SELECT id FROM public.survey_responses
      WHERE survey_id IN (
        SELECT id FROM public.surveys
        WHERE team_id IN (
          SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policy: Anyone can create answers when submitting responses (public access)
DROP POLICY IF EXISTS "Anyone can create answers for published surveys" ON public.survey_answers;
CREATE POLICY "Anyone can create answers for published surveys"
  ON public.survey_answers
  FOR INSERT
  WITH CHECK (
    response_id IN (
      SELECT id FROM public.survey_responses
      WHERE survey_id IN (
        SELECT id FROM public.surveys WHERE status = 'published'
      )
    )
  );

-- RLS Policy: Anyone can view answers for a specific response (for confirmation page)
DROP POLICY IF EXISTS "Anyone can view answers for specific response" ON public.survey_answers;
CREATE POLICY "Anyone can view answers for specific response"
  ON public.survey_answers
  FOR SELECT
  USING (true); -- This allows viewing answers if you have the response UUID

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get survey with question count
CREATE OR REPLACE FUNCTION get_surveys_with_question_count(p_team_id UUID, p_season_id UUID)
RETURNS TABLE (
  id UUID,
  team_id UUID,
  season_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  question_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.team_id,
    s.season_id,
    s.title,
    s.description,
    s.status,
    s.created_by,
    s.created_at,
    s.updated_at,
    s.published_at,
    s.closed_at,
    COUNT(q.id) as question_count
  FROM public.surveys s
  LEFT JOIN public.survey_questions q ON s.id = q.survey_id
  WHERE s.team_id = p_team_id AND s.season_id = p_season_id
  GROUP BY s.id
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_surveys_with_question_count(UUID, UUID) IS 'Returns surveys for a team/season with question counts';

-- Record this version in schema_versions
INSERT INTO public.schema_versions (version, release_notes_path, description)
VALUES ('1.4.0', '/releases/v1.4.0.md', 'Add surveys feature with public response collection and analytics')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'surveys'
  ) AS surveys_exists,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'survey_questions'
  ) AS survey_questions_exists,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'survey_responses'
  ) AS survey_responses_exists,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'survey_answers'
  ) AS survey_answers_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'surveys_team_fkey'
  ) AS surveys_team_fkey_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'survey_questions_survey_fkey'
  ) AS questions_survey_fkey_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'survey_responses_survey_fkey'
  ) AS responses_survey_fkey_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'survey_answers_response_fkey'
  ) AS answers_response_fkey_exists,
  EXISTS (
    SELECT FROM pg_indexes
    WHERE indexname = 'idx_surveys_team_season'
  ) AS surveys_team_season_index_exists,
  EXISTS (
    SELECT FROM pg_indexes
    WHERE indexname = 'idx_survey_questions_survey'
  ) AS questions_survey_index_exists,
  EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'surveys' AND policyname = 'Team members can view their team''s surveys'
  ) AS surveys_select_policy_exists,
  EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'survey_responses' AND policyname = 'Anyone can submit responses to published surveys'
  ) AS public_submit_policy_exists,
  EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_surveys_with_question_count'
  ) AS helper_function_exists,
  EXISTS (
    SELECT FROM public.schema_versions WHERE version = '1.4.0'
  ) AS version_recorded;
VERIFICATION_SCRIPT_END
*/
