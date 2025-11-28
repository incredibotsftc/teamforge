-- Migration: Add survey templates
-- Description: Add survey templates with header images and footer rich text
-- Created: 2025-11-22

-- ==============================================
-- UP SECTION
-- ==============================================

-- Create survey_templates table
CREATE TABLE IF NOT EXISTS public.survey_templates (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  team_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(name) > 0),
  description TEXT,
  header_image_url TEXT,
  footer_content JSONB, -- Rich text content stored as JSON (BlockNote format)
  footer_html TEXT, -- Pre-rendered HTML for display
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT survey_templates_pkey PRIMARY KEY (id),
  CONSTRAINT survey_templates_team_fkey FOREIGN KEY (team_id)
    REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT survey_templates_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_templates_team ON public.survey_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_active ON public.survey_templates(is_active);

-- Add template_id column to surveys table
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD CONSTRAINT surveys_template_fkey
  FOREIGN KEY (template_id) REFERENCES public.survey_templates(id) ON DELETE SET NULL;

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_surveys_template ON public.surveys(template_id);

-- Enable RLS on survey_templates
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_templates

-- Team members can view their team's templates
DROP POLICY IF EXISTS "Team members can view their team's templates" ON public.survey_templates;
CREATE POLICY "Team members can view their team's templates"
  ON public.survey_templates
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Team members can create templates
DROP POLICY IF EXISTS "Team members can create templates" ON public.survey_templates;
CREATE POLICY "Team members can create templates"
  ON public.survey_templates
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Team members can update their team's templates
DROP POLICY IF EXISTS "Team members can update their team's templates" ON public.survey_templates;
CREATE POLICY "Team members can update their team's templates"
  ON public.survey_templates
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Team members can delete their team's templates
DROP POLICY IF EXISTS "Team members can delete their team's templates" ON public.survey_templates;
CREATE POLICY "Team members can delete their team's templates"
  ON public.survey_templates
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id
      FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for public viewing of templates used in published surveys
DROP POLICY IF EXISTS "Anyone can view templates used in published surveys" ON public.survey_templates;
CREATE POLICY "Anyone can view templates used in published surveys"
  ON public.survey_templates
  FOR SELECT
  USING (
    id IN (
      SELECT template_id
      FROM public.surveys
      WHERE status = 'published'
      AND template_id IS NOT NULL
    )
  );

-- Create storage bucket for survey template images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-templates',
  'survey-templates',
  true, -- Public bucket since images will be displayed on public surveys
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for survey-templates bucket
DROP POLICY IF EXISTS "Team members can upload template images" ON storage.objects;
CREATE POLICY "Team members can upload template images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'survey-templates' AND
    auth.uid() IN (
      SELECT user_id FROM public.team_members
    )
  );

DROP POLICY IF EXISTS "Team members can update their template images" ON storage.objects;
CREATE POLICY "Team members can update their template images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'survey-templates' AND
    auth.uid() IN (
      SELECT user_id FROM public.team_members
    )
  );

DROP POLICY IF EXISTS "Team members can delete their template images" ON storage.objects;
CREATE POLICY "Team members can delete their template images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'survey-templates' AND
    auth.uid() IN (
      SELECT user_id FROM public.team_members
    )
  );

DROP POLICY IF EXISTS "Anyone can view template images" ON storage.objects;
CREATE POLICY "Anyone can view template images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'survey-templates');

-- Add comments
COMMENT ON TABLE public.survey_templates IS 'Reusable templates for surveys with custom branding';
COMMENT ON COLUMN public.survey_templates.footer_content IS 'Rich text content in JSON format (BlockNote)';
COMMENT ON COLUMN public.survey_templates.footer_html IS 'Pre-rendered HTML for efficient display';
COMMENT ON COLUMN public.surveys.template_id IS 'Optional reference to survey template for branding';

-- ==============================================
-- DOWN SECTION
-- ==============================================
-- DOWN:

-- Remove storage policies
DROP POLICY IF EXISTS "Team members can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can update their template images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can delete their template images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view template images" ON storage.objects;

-- Remove storage bucket
DELETE FROM storage.buckets WHERE id = 'survey-templates';

-- Remove RLS policies
DROP POLICY IF EXISTS "Team members can view their team's templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Team members can create templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Team members can update their team's templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Team members can delete their team's templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Anyone can view templates used in published surveys" ON public.survey_templates;

-- Remove foreign key from surveys
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_template_fkey;
ALTER TABLE public.surveys DROP COLUMN IF EXISTS template_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_surveys_template;
DROP INDEX IF EXISTS idx_survey_templates_team;
DROP INDEX IF EXISTS idx_survey_templates_active;

-- Drop table
DROP TABLE IF EXISTS public.survey_templates;

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'survey_templates'
  ) AS templates_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'surveys'
    AND column_name = 'template_id'
  ) AS template_id_column_exists,
  EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'survey-templates'
  ) AS storage_bucket_exists,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'survey_templates'
    AND policyname = 'Team members can view their team''s templates'
  ) AS view_policy_exists;
VERIFICATION_SCRIPT_END
*/