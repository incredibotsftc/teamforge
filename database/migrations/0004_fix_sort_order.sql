-- Migration: v1.3.0
-- Description: Fix sort_order for existing notebook pages and folders, add drag-and-drop reordering
-- Created: 2025-01-22

-- ==============================================
-- UP SECTION
-- ==============================================

-- Fix notebook_pages sort_order
-- For each combination of team_id and folder_id, assign sequential sort_order
WITH ranked_pages AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, COALESCE(folder_id::text, 'root')
      ORDER BY created_at ASC
    ) - 1 AS new_sort_order
  FROM notebook_pages
)
UPDATE notebook_pages
SET sort_order = ranked_pages.new_sort_order
FROM ranked_pages
WHERE notebook_pages.id = ranked_pages.id;

-- Fix notebook_folders sort_order
-- For each combination of team_id and parent_folder_id, assign sequential sort_order
WITH ranked_folders AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, COALESCE(parent_folder_id::text, 'root')
      ORDER BY created_at ASC
    ) - 1 AS new_sort_order
  FROM notebook_folders
)
UPDATE notebook_folders
SET sort_order = ranked_folders.new_sort_order
FROM ranked_folders
WHERE notebook_folders.id = ranked_folders.id;

-- Record this version
INSERT INTO schema_versions (version, release_notes_path, description)
VALUES ('1.3.0', '/releases/v1.3.0.md', 'Fix notebook sort order and add drag-and-drop reordering')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- DOWN SECTION (for rollback)
-- ==============================================
-- DOWN:

-- Reset all sort_order values to 0
UPDATE notebook_pages SET sort_order = 0;
UPDATE notebook_folders SET sort_order = 0;

-- Remove version record
DELETE FROM schema_versions WHERE version = '1.3.0';

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
SELECT
  (SELECT COUNT(*) FROM notebook_pages WHERE sort_order != 0) > 0 AS pages_sort_order_fixed,
  (SELECT COUNT(*) FROM notebook_folders WHERE sort_order != 0) > 0 AS folders_sort_order_fixed,
  EXISTS (SELECT FROM schema_versions WHERE version = '1.3.0') AS version_recorded;
VERIFICATION_SCRIPT_END
*/
