-- Migration: v1.2.0
-- Description: Add scouting system with templates, responses, and image storage
-- Created: 2024-11-14

-- ==============================================
-- UP SECTION
-- ==============================================

-- Create table for persisted scouting sheet templates (authoritative templates shared across the app)
CREATE TABLE IF NOT EXISTS public.scouting_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  team_id uuid,
  season_id uuid,
  name text NOT NULL,
  content jsonb NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scouting_templates_pkey'
  ) THEN
    ALTER TABLE ONLY public.scouting_templates
      ADD CONSTRAINT scouting_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add unique constraint on team_id and season_id (one template per team per season)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scouting_templates_team_season_unique'
  ) THEN
    ALTER TABLE ONLY public.scouting_templates
      ADD CONSTRAINT scouting_templates_team_season_unique UNIQUE (team_id, season_id);
  END IF;
END $$;

-- Create index to find templates for a team/season quickly (will use the unique constraint)
CREATE INDEX IF NOT EXISTS idx_scouting_templates_team_season
  ON public.scouting_templates(team_id, season_id);

-- Create table for saved/finalized scouting responses (filled sheets)
CREATE TABLE IF NOT EXISTS public.scouting_responses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  team_id uuid,
  season_id uuid,
  scouting_team_number integer,
  scouting_event_id text,
  questions jsonb,
  responses jsonb,
  metadata jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scouting_responses_pkey'
  ) THEN
    ALTER TABLE ONLY public.scouting_responses
      ADD CONSTRAINT scouting_responses_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Foreign key linking to template (nullable so ad-hoc responses are allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scouting_responses_template_fkey'
  ) THEN
    ALTER TABLE ONLY public.scouting_responses
      ADD CONSTRAINT scouting_responses_template_fkey
      FOREIGN KEY (template_id) REFERENCES public.scouting_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key linking to team (the team that is doing the scouting)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scouting_responses_team_fkey'
  ) THEN
    ALTER TABLE ONLY public.scouting_responses
      ADD CONSTRAINT scouting_responses_team_fkey
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes to query responses by team, template or scouting team
CREATE INDEX IF NOT EXISTS idx_scouting_responses_team
  ON public.scouting_responses(team_id);
CREATE INDEX IF NOT EXISTS idx_scouting_responses_template
  ON public.scouting_responses(template_id);
CREATE INDEX IF NOT EXISTS idx_scouting_responses_scouting_team
  ON public.scouting_responses(scouting_team_number);

-- Create the storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scouting-images', 'scouting-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Allow authenticated users to upload scouting images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload scouting images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scouting-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Allow users to view images from their own team
DROP POLICY IF EXISTS "Allow users to view their team's scouting images" ON storage.objects;
CREATE POLICY "Allow users to view their team's scouting images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'scouting-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Allow users to update images from their own team
DROP POLICY IF EXISTS "Allow users to update their team's scouting images" ON storage.objects;
CREATE POLICY "Allow users to update their team's scouting images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scouting-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Allow users to delete images from their own team
DROP POLICY IF EXISTS "Allow users to delete their team's scouting images" ON storage.objects;
CREATE POLICY "Allow users to delete their team's scouting images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'scouting-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- Record this version in schema_versions
INSERT INTO public.schema_versions (version, release_notes_path, description)
VALUES ('1.2.0', '/releases/v1.2.0.md', 'Add scouting system with templates and responses')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scouting_templates'
  ) AS scouting_templates_exists,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'scouting_responses'
  ) AS scouting_responses_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'scouting_templates_team_season_unique'
  ) AS template_unique_constraint_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'scouting_responses_template_fkey'
  ) AS template_fkey_exists,
  EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'scouting_responses_team_fkey'
  ) AS team_fkey_exists,
  EXISTS (
    SELECT FROM pg_indexes
    WHERE indexname = 'idx_scouting_templates_team_season'
  ) AS template_index_exists,
  EXISTS (
    SELECT FROM pg_indexes
    WHERE indexname = 'idx_scouting_responses_team'
  ) AS response_team_index_exists,
  EXISTS (
    SELECT FROM pg_indexes
    WHERE indexname = 'idx_scouting_responses_scouting_team'
  ) AS response_scouting_team_index_exists,
  EXISTS (
    SELECT FROM storage.buckets
    WHERE id = 'scouting-images'
  ) AS storage_bucket_exists,
  EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Allow authenticated users to upload scouting images'
  ) AS upload_policy_exists,
  EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Allow users to view their team''s scouting images'
  ) AS view_policy_exists,
  EXISTS (
    SELECT FROM public.schema_versions
    WHERE version = '1.2.0'
  ) AS version_recorded;
VERIFICATION_SCRIPT_END
*/
