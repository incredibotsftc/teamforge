-- Migration: v1.3.0
-- Description: Add spreadsheet functionality to notebooks using Univer Sheets
-- Created: 2025-01-15

-- ==============================================
-- UP SECTION
-- ==============================================

-- Create table for notebook sheets (spreadsheets)
CREATE TABLE IF NOT EXISTS public.notebook_sheets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  team_id uuid NOT NULL,
  season_id uuid NOT NULL,
  folder_id uuid,
  title text DEFAULT 'Untitled Sheet' NOT NULL,
  sheet_data_path text, -- Path to Univer workbook JSON in storage
  sheet_data_size bigint, -- Size of sheet data file in bytes
  column_count integer DEFAULT 10, -- Number of columns for quick metadata
  row_count integer DEFAULT 20, -- Number of rows for quick metadata
  is_pinned boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  linked_entity_type text,
  linked_entity_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL
);

-- Add primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_pkey'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Foreign key to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_team_fkey'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_team_fkey
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign key to seasons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_season_fkey'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_season_fkey
      FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign key to folders (nullable - sheets can exist without folders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_folder_fkey'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_folder_fkey
      FOREIGN KEY (folder_id) REFERENCES public.notebook_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key to users (created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_created_by_fkey'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign key to users (updated_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_updated_by_fkey'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Check constraint for linked_entity_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notebook_sheets_linked_entity_type_check'
  ) THEN
    ALTER TABLE ONLY public.notebook_sheets
      ADD CONSTRAINT notebook_sheets_linked_entity_type_check
      CHECK (linked_entity_type IS NULL OR linked_entity_type IN ('mentoring_session', 'event', 'task', 'scouting_team'));
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notebook_sheets_team_season
  ON public.notebook_sheets(team_id, season_id);

CREATE INDEX IF NOT EXISTS idx_notebook_sheets_folder
  ON public.notebook_sheets(folder_id);

CREATE INDEX IF NOT EXISTS idx_notebook_sheets_linked_entity
  ON public.notebook_sheets(linked_entity_type, linked_entity_id);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notebook_sheet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notebook_sheet_updated_at_trigger ON public.notebook_sheets;
CREATE TRIGGER update_notebook_sheet_updated_at_trigger
  BEFORE UPDATE ON public.notebook_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_sheet_updated_at();

-- Enable RLS on notebook_sheets
ALTER TABLE public.notebook_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view sheets for their team
DROP POLICY IF EXISTS "Users can view notebook sheets for their teams" ON public.notebook_sheets;
CREATE POLICY "Users can view notebook sheets for their teams"
ON public.notebook_sheets
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Users can insert sheets for their team
DROP POLICY IF EXISTS "Users can insert notebook sheets for their teams" ON public.notebook_sheets;
CREATE POLICY "Users can insert notebook sheets for their teams"
ON public.notebook_sheets
FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Users can update sheets for their team
DROP POLICY IF EXISTS "Users can update notebook sheets for their teams" ON public.notebook_sheets;
CREATE POLICY "Users can update notebook sheets for their teams"
ON public.notebook_sheets
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Users can delete sheets for their team
DROP POLICY IF EXISTS "Users can delete notebook sheets for their teams" ON public.notebook_sheets;
CREATE POLICY "Users can delete notebook sheets for their teams"
ON public.notebook_sheets
FOR DELETE
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- Create the storage bucket for sheet data (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notebook-sheets', 'notebook-sheets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow team members to upload sheet data
DROP POLICY IF EXISTS "Team members can upload sheet data" ON storage.objects;
CREATE POLICY "Team members can upload sheet data"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notebook-sheets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Allow team members to read sheet data
DROP POLICY IF EXISTS "Team members can read sheet data" ON storage.objects;
CREATE POLICY "Team members can read sheet data"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'notebook-sheets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Allow team members to update sheet data
DROP POLICY IF EXISTS "Team members can update sheet data" ON storage.objects;
CREATE POLICY "Team members can update sheet data"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notebook-sheets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Allow team members to delete sheet data
DROP POLICY IF EXISTS "Team members can delete sheet data" ON storage.objects;
CREATE POLICY "Team members can delete sheet data"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'notebook-sheets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.teams WHERE id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- Record this version in schema_versions
INSERT INTO public.schema_versions (version, release_notes_path, description)
VALUES ('1.3.0', '/releases/v1.3.0.md', 'Add spreadsheet functionality to notebooks')
ON CONFLICT (version) DO NOTHING;
