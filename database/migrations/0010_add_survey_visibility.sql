-- Migration: v1.6.0
-- Description: Add visibility control to surveys (public, private, team)
-- Created: 2025-11-27

-- ==============================================
-- UP SECTION
-- ==============================================

-- Add visibility column to surveys table
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' NOT NULL
CHECK (visibility IN ('public', 'private', 'team'));

-- Add index for visibility queries
CREATE INDEX IF NOT EXISTS idx_surveys_visibility ON public.surveys(visibility);

-- Add comment
COMMENT ON COLUMN public.surveys.visibility IS 'Survey visibility: public (anyone), private (login required), team (team members only, shown in tasks)';

-- Update RLS policies for visibility-based access

-- Drop existing public access policy for surveys
DROP POLICY IF EXISTS "Anyone can view published surveys" ON public.surveys;

-- New policy: Public surveys can be viewed by anyone
CREATE POLICY "Anyone can view public published surveys"
  ON public.surveys
  FOR SELECT
  USING (
    status = 'published' AND visibility = 'public'
  );

-- New policy: Private surveys require authentication
CREATE POLICY "Authenticated users can view private published surveys"
  ON public.surveys
  FOR SELECT
  USING (
    status = 'published' AND visibility = 'private' AND auth.uid() IS NOT NULL
  );

-- New policy: Team surveys require team membership
CREATE POLICY "Team members can view team surveys"
  ON public.surveys
  FOR SELECT
  USING (
    visibility = 'team' AND team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Update question access policies

-- Drop existing public access policy for questions
DROP POLICY IF EXISTS "Anyone can view questions for published surveys" ON public.survey_questions;

-- Public survey questions accessible to anyone
CREATE POLICY "Anyone can view questions for public published surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE status = 'published' AND visibility = 'public'
    )
  );

-- Private survey questions require authentication
CREATE POLICY "Authenticated users can view questions for private surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE status = 'published' AND visibility = 'private' AND auth.uid() IS NOT NULL
    )
  );

-- Team survey questions require team membership
CREATE POLICY "Team members can view questions for team surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE visibility = 'team' AND team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Update response submission policies

-- Drop existing public response submission policy
DROP POLICY IF EXISTS "Anyone can submit responses to published surveys" ON public.survey_responses;

-- Public surveys allow anonymous responses
CREATE POLICY "Anyone can submit responses to public surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE status = 'published' AND visibility = 'public'
    )
  );

-- Private surveys require authentication
CREATE POLICY "Authenticated users can submit responses to private surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND survey_id IN (
      SELECT id FROM public.surveys 
      WHERE status = 'published' AND visibility = 'private'
    )
  );

-- Team surveys require team membership
CREATE POLICY "Team members can submit responses to team surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE status = 'published' AND visibility = 'team' AND team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Update answer submission policies to match

-- Drop existing public answer submission policy
DROP POLICY IF EXISTS "Anyone can create answers for published surveys" ON public.survey_answers;

-- Public survey answers
CREATE POLICY "Anyone can create answers for public surveys"
  ON public.survey_answers
  FOR INSERT
  WITH CHECK (
    response_id IN (
      SELECT r.id FROM public.survey_responses r
      JOIN public.surveys s ON r.survey_id = s.id
      WHERE s.status = 'published' AND s.visibility = 'public'
    )
  );

-- Private survey answers
CREATE POLICY "Authenticated users can create answers for private surveys"
  ON public.survey_answers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND response_id IN (
      SELECT r.id FROM public.survey_responses r
      JOIN public.surveys s ON r.survey_id = s.id
      WHERE s.status = 'published' AND s.visibility = 'private'
    )
  );

-- Team survey answers
CREATE POLICY "Team members can create answers for team surveys"
  ON public.survey_answers
  FOR INSERT
  WITH CHECK (
    response_id IN (
      SELECT r.id FROM public.survey_responses r
      JOIN public.surveys s ON r.survey_id = s.id
      WHERE s.status = 'published' AND s.visibility = 'team'
      AND s.team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Record this version in schema_versions
INSERT INTO public.schema_versions (version, release_notes_path, description)
VALUES ('1.6.0', '/releases/v1.6.0.md', 'Add survey visibility controls: public, private, team')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- DOWN SECTION
-- ==============================================

-- DOWN:

-- Remove visibility column
ALTER TABLE public.surveys
DROP COLUMN IF EXISTS visibility;

-- Drop index
DROP INDEX IF EXISTS idx_surveys_visibility;

-- Restore original RLS policies

-- Restore surveys access
DROP POLICY IF EXISTS "Anyone can view public published surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can view private published surveys" ON public.surveys;
DROP POLICY IF EXISTS "Team members can view team surveys" ON public.surveys;

CREATE POLICY "Anyone can view published surveys"
  ON public.surveys
  FOR SELECT
  USING (status = 'published');

-- Restore questions access
DROP POLICY IF EXISTS "Anyone can view questions for public published surveys" ON public.survey_questions;
DROP POLICY IF EXISTS "Authenticated users can view questions for private surveys" ON public.survey_questions;
DROP POLICY IF EXISTS "Team members can view questions for team surveys" ON public.survey_questions;

CREATE POLICY "Anyone can view questions for published surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys WHERE status = 'published'
    )
  );

-- Restore response submission
DROP POLICY IF EXISTS "Anyone can submit responses to public surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated users can submit responses to private surveys" ON public.survey_responses;
DROP POLICY IF EXISTS "Team members can submit responses to team surveys" ON public.survey_responses;

CREATE POLICY "Anyone can submit responses to published surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys WHERE status = 'published'
    )
  );

-- Restore answer submission
DROP POLICY IF EXISTS "Anyone can create answers for public surveys" ON public.survey_answers;
DROP POLICY IF EXISTS "Authenticated users can create answers for private surveys" ON public.survey_answers;
DROP POLICY IF EXISTS "Team members can create answers for team surveys" ON public.survey_answers;

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

-- Remove version record
DELETE FROM public.schema_versions WHERE version = '1.6.0';
