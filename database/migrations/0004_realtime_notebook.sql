-- Migration: Add Realtime and Yjs support for notebooks
-- Description: Adds columns for Yjs state tracking and creates active editors table for user presence
-- Created: 2025-11-21

-- UP:

-- Add Yjs and version tracking columns to notebook_pages
ALTER TABLE notebook_pages
ADD COLUMN IF NOT EXISTS yjs_state_vector BYTEA,
ADD COLUMN IF NOT EXISTS last_yjs_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create table to track active editors (for user presence)
CREATE TABLE IF NOT EXISTS notebook_active_editors (
  page_id UUID NOT NULL REFERENCES notebook_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_color TEXT DEFAULT '#6366f1',
  cursor_position JSONB,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (page_id, user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notebook_active_editors_page_id ON notebook_active_editors(page_id);
CREATE INDEX IF NOT EXISTS idx_notebook_active_editors_team_id ON notebook_active_editors(team_id);
CREATE INDEX IF NOT EXISTS idx_notebook_active_editors_last_seen ON notebook_active_editors(last_seen);

-- Enable RLS on notebook_active_editors
ALTER TABLE notebook_active_editors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notebook_active_editors
-- Allow team members to view active editors on their team's pages
CREATE POLICY "Users can see active editors for their team pages"
ON notebook_active_editors FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Allow users to insert their own presence
CREATE POLICY "Users can insert their own presence"
ON notebook_active_editors FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Allow users to update their own presence
CREATE POLICY "Users can update their own presence"
ON notebook_active_editors FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own presence
CREATE POLICY "Users can delete their own presence"
ON notebook_active_editors FOR DELETE
USING (user_id = auth.uid());

-- Function to clean up stale active editors (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_active_editors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notebook_active_editors
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Create index on yjs_state_vector for faster sync operations
CREATE INDEX IF NOT EXISTS idx_notebook_pages_last_yjs_update ON notebook_pages(last_yjs_update);

-- Enable Realtime for notebook_pages (for metadata changes only)
-- Note: This requires running on Supabase, may need manual enablement
-- ALTER PUBLICATION supabase_realtime ADD TABLE notebook_pages;

-- Enable Realtime for notebook_active_editors
-- ALTER PUBLICATION supabase_realtime ADD TABLE notebook_active_editors;

-- Add comments for documentation
COMMENT ON COLUMN notebook_pages.yjs_state_vector IS 'Yjs state vector for efficient sync operations';
COMMENT ON COLUMN notebook_pages.last_yjs_update IS 'Timestamp of last Yjs update for this page';
COMMENT ON COLUMN notebook_pages.version IS 'Version number for snapshot tracking';
COMMENT ON TABLE notebook_active_editors IS 'Tracks users currently editing notebook pages for real-time presence';

-- DOWN:

-- Remove Realtime publications (if added)
-- ALTER PUBLICATION supabase_realtime DROP TABLE notebook_pages;
-- ALTER PUBLICATION supabase_realtime DROP TABLE notebook_active_editors;

-- Drop function
DROP FUNCTION IF EXISTS cleanup_stale_active_editors();

-- Drop table
DROP TABLE IF EXISTS notebook_active_editors;

-- Remove columns from notebook_pages
ALTER TABLE notebook_pages
DROP COLUMN IF EXISTS yjs_state_vector,
DROP COLUMN IF EXISTS last_yjs_update,
DROP COLUMN IF EXISTS version;
