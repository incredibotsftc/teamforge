-- Migration: v1.1.0 (Version Tracking System)
-- Description: Add version tracking infrastructure to enable incremental migrations
-- Created: 2024-11-13

-- ==============================================
-- UP SECTION
-- ==============================================

-- Create schema_versions table to track which versions have been applied
CREATE TABLE IF NOT EXISTS schema_versions (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    release_notes_path TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE schema_versions IS 'Tracks which application versions have been successfully applied to the database';
COMMENT ON COLUMN schema_versions.version IS 'Semantic version number (e.g., 1.0.0)';
COMMENT ON COLUMN schema_versions.applied_at IS 'Timestamp when this version was applied';
COMMENT ON COLUMN schema_versions.release_notes_path IS 'Path to release notes file in repository';
COMMENT ON COLUMN schema_versions.description IS 'Brief description of this version';

-- Create migration_history table to track individual migrations within versions
CREATE TABLE IF NOT EXISTS migration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL REFERENCES schema_versions(version) ON DELETE CASCADE,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_passed BOOLEAN DEFAULT false,
    verification_details JSONB,
    applied_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE migration_history IS 'Detailed history of each migration execution';
COMMENT ON COLUMN migration_history.version IS 'Version this migration belongs to';
COMMENT ON COLUMN migration_history.migration_name IS 'Name of the migration file';
COMMENT ON COLUMN migration_history.verification_passed IS 'Whether verification script passed';
COMMENT ON COLUMN migration_history.verification_details IS 'JSON details from verification script';
COMMENT ON COLUMN migration_history.applied_by IS 'User ID who applied the migration';

-- Create index for efficient version lookups
CREATE INDEX IF NOT EXISTS idx_migration_history_version ON migration_history(version);
CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON migration_history(applied_at DESC);

-- Create function to get the current database version
CREATE OR REPLACE FUNCTION get_current_db_version()
RETURNS VARCHAR(20) AS $$
DECLARE
    current_version VARCHAR(20);
BEGIN
    SELECT version INTO current_version
    FROM schema_versions
    ORDER BY version DESC
    LIMIT 1;

    RETURN COALESCE(current_version, '0.0.0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_db_version() IS 'Returns the highest version number from schema_versions table';

-- Create function to check if a specific version is applied
CREATE OR REPLACE FUNCTION is_version_applied(check_version VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM schema_versions WHERE version = check_version
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_version_applied(VARCHAR) IS 'Checks if a specific version has been applied';

-- Create function to record a version application
CREATE OR REPLACE FUNCTION record_version_application(
    new_version VARCHAR(20),
    notes_path TEXT DEFAULT NULL,
    version_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO schema_versions (version, release_notes_path, description, applied_at)
    VALUES (new_version, notes_path, version_description, NOW())
    ON CONFLICT (version) DO UPDATE
    SET applied_at = NOW(),
        release_notes_path = COALESCE(EXCLUDED.release_notes_path, schema_versions.release_notes_path),
        description = COALESCE(EXCLUDED.description, schema_versions.description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_version_application(VARCHAR, TEXT, TEXT) IS 'Records that a version has been successfully applied';

-- Seed the initial version (v1.0.0 is considered already applied for existing installations)
INSERT INTO schema_versions (version, release_notes_path, description, applied_at)
VALUES (
    '1.0.0',
    '/releases/v1.0.0.md',
    'Initial baseline release with all core features',
    NOW()
) ON CONFLICT (version) DO NOTHING;

-- Record v1.1.0 (this migration adds version tracking)
INSERT INTO schema_versions (version, release_notes_path, description, applied_at)
VALUES (
    '1.1.0',
    '/releases/v1.1.0.md',
    'Add version tracking system',
    NOW()
) ON CONFLICT (version) DO NOTHING;

-- Record this migration in history
INSERT INTO migration_history (version, migration_name, verification_passed, applied_at)
VALUES (
    '1.1.0',
    '0002_add_version_tracking.sql',
    true,
    NOW()
) ON CONFLICT DO NOTHING;

-- ==============================================
-- VENDOR TRACKING (Part of v1.1.0)
-- ==============================================

-- Create vendors table to store distinct vendors per team
CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL REFERENCES "public"."teams"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_by" UUID REFERENCES "auth"."users"("id"),
    CONSTRAINT "vendors_team_name_unique" UNIQUE ("team_id", "name")
);

-- Add vendor_id column to expenses table
ALTER TABLE "public"."expenses"
ADD COLUMN IF NOT EXISTS "vendor_id" UUID REFERENCES "public"."vendors"("id") ON DELETE SET NULL;

-- Add index for faster vendor lookups
CREATE INDEX IF NOT EXISTS "idx_vendors_team_id" ON "public"."vendors"("team_id");
CREATE INDEX IF NOT EXISTS "idx_vendors_name_search" ON "public"."vendors"("team_id", "name");
CREATE INDEX IF NOT EXISTS "idx_expenses_vendor_id" ON "public"."expenses"("vendor_id");

-- Enable RLS on vendors table
ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teams can only see their own vendors
CREATE POLICY "Teams can view their own vendors"
    ON "public"."vendors"
    FOR SELECT
    USING (
        "team_id" IN (
            SELECT "team_id"
            FROM "public"."team_members"
            WHERE "user_id" = auth.uid()
        )
    );

-- RLS Policy: Teams can insert their own vendors
CREATE POLICY "Teams can insert their own vendors"
    ON "public"."vendors"
    FOR INSERT
    WITH CHECK (
        "team_id" IN (
            SELECT "team_id"
            FROM "public"."team_members"
            WHERE "user_id" = auth.uid()
        )
    );

-- RLS Policy: Teams can update their own vendors
CREATE POLICY "Teams can update their own vendors"
    ON "public"."vendors"
    FOR UPDATE
    USING (
        "team_id" IN (
            SELECT "team_id"
            FROM "public"."team_members"
            WHERE "user_id" = auth.uid()
        )
    );

-- RLS Policy: Teams can delete their own vendors
CREATE POLICY "Teams can delete their own vendors"
    ON "public"."vendors"
    FOR DELETE
    USING (
        "team_id" IN (
            SELECT "team_id"
            FROM "public"."team_members"
            WHERE "user_id" = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE "public"."vendors" IS 'Stores distinct vendors/suppliers per team for expense tracking';
COMMENT ON COLUMN "public"."vendors"."name" IS 'Vendor or supplier name';
COMMENT ON COLUMN "public"."expenses"."vendor_id" IS 'Reference to vendor from vendors table';

-- ==============================================
-- DOWN SECTION (for future rollback capability)
-- ==============================================
-- DOWN:

-- Drop vendor policies
DROP POLICY IF EXISTS "Teams can delete their own vendors" ON "public"."vendors";
DROP POLICY IF EXISTS "Teams can update their own vendors" ON "public"."vendors";
DROP POLICY IF EXISTS "Teams can insert their own vendors" ON "public"."vendors";
DROP POLICY IF EXISTS "Teams can view their own vendors" ON "public"."vendors";

-- Drop vendor indexes
DROP INDEX IF EXISTS "idx_expenses_vendor_id";
DROP INDEX IF EXISTS "idx_vendors_name_search";
DROP INDEX IF EXISTS "idx_vendors_team_id";

-- Drop vendor column from expenses
ALTER TABLE "public"."expenses" DROP COLUMN IF EXISTS "vendor_id";

-- Drop vendors table
DROP TABLE IF EXISTS "public"."vendors";

-- Drop functions
DROP FUNCTION IF EXISTS record_version_application(VARCHAR, TEXT, TEXT);
DROP FUNCTION IF EXISTS is_version_applied(VARCHAR);
DROP FUNCTION IF EXISTS get_current_db_version();

-- Drop indexes
DROP INDEX IF EXISTS idx_migration_history_applied_at;
DROP INDEX IF EXISTS idx_migration_history_version;

-- Drop tables (cascade will remove foreign key references)
DROP TABLE IF EXISTS migration_history CASCADE;
DROP TABLE IF EXISTS schema_versions CASCADE;

-- Remove version records
DELETE FROM schema_versions WHERE version IN ('1.0.0', '1.1.0');
DELETE FROM migration_history WHERE version IN ('1.0.0', '1.1.0');

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
-- This script verifies that the migration was applied successfully
-- It should be run after applying the migration to confirm everything is correct

/*
VERIFICATION_SCRIPT_START
-- Check if schema_versions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'schema_versions'
) AS schema_versions_exists,

-- Check if migration_history table exists
EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'migration_history'
) AS migration_history_exists,

-- Check if functions exist
EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_current_db_version'
) AS get_current_db_version_exists,

EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'is_version_applied'
) AS is_version_applied_exists,

EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'record_version_application'
) AS record_version_application_exists,

-- Check if v1.0.0 is seeded
EXISTS (
    SELECT FROM schema_versions WHERE version = '1.0.0'
) AS v1_0_0_seeded,

-- Get current database version
get_current_db_version() AS current_version;

-- All boolean columns should return 't' (true) for the migration to be considered successful
VERIFICATION_SCRIPT_END
*/
