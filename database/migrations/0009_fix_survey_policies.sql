-- Migration: v1.5.2
-- Description: Fix survey access policies for public and team preview
-- Created: 2025-01-26

-- ==============================================
-- UP SECTION
-- ==============================================

-- 1. Ensure public access for published surveys exists
DROP POLICY IF EXISTS "Anyone can view published surveys" ON public.surveys;
CREATE POLICY "Anyone can view published surveys"
  ON public.surveys
  FOR SELECT
  USING (status = 'published');

-- 2. Ensure team members can view ALL surveys for their team (including drafts)
-- This replaces the previous policy to be more explicit if needed, though the original one should have worked.
-- The original was: team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
-- We'll recreate it to be sure.
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

-- 3. Ensure survey questions are visible for published surveys
DROP POLICY IF EXISTS "Anyone can view questions for published surveys" ON public.survey_questions;
CREATE POLICY "Anyone can view questions for published surveys"
  ON public.survey_questions
  FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys WHERE status = 'published'
    )
  );

-- 4. Ensure survey questions are visible for team members (for drafts)
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

-- Record this version
INSERT INTO public.schema_versions (version, release_notes_path, description)
VALUES ('1.5.2', '/releases/v1.5.2.md', 'Fix survey RLS policies for public and preview access')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- DOWN SECTION
-- ==============================================

-- No down migration needed as these are idempotent policy replacements intended to fix access.
