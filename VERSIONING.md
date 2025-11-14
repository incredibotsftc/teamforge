# FTC TeamForge Versioning System

## Overview

FTC TeamForge uses a semantic versioning system (`MAJOR.MINOR.PATCH`) to track application and database versions. The system ensures that users cannot use the application if pending database migrations need to be applied.

## Version Tracking Architecture

### Source of Truth: `src/lib/version.ts`

The current application version is stored in:
```typescript
export const APP_VERSION = "1.0.0";
```

When releasing a new version, update this constant to the new version number.

### Database Version Tracking

The database tracks which versions have been applied using two tables:

1. **`schema_versions`** - Records which app versions have been applied
   - `version` (PK) - Version number (e.g., "1.0.0")
   - `applied_at` - Timestamp of application
   - `release_notes_path` - Path to release notes file
   - `description` - Brief description of the version

2. **`migration_history`** - Detailed migration execution history
   - `id` (PK) - Unique identifier
   - `version` (FK) - References schema_versions
   - `migration_name` - Name of migration file
   - `applied_at` - Timestamp
   - `verification_passed` - Boolean indicating verification success
   - `verification_details` - JSON with verification results

## How It Works

### On Every Login/Page Load

1. `VersionChecker` component runs automatically (wrapped around the app in `layout.tsx`)
2. Calls `/api/version/check` to compare app version vs database version
3. If versions match → User can proceed normally
4. If versions don't match → `MigrationPendingDialog` appears and blocks the app

### When Migrations Are Pending

The user sees a dialog that:
1. Shows release notes for all pending versions
2. Provides combined migration SQL to copy
3. Includes verification scripts
4. Has a "Verify Migrations" button

User workflow:
1. Read release notes for each pending version
2. Copy the migration SQL
3. Open Supabase SQL Editor
4. Paste and run the SQL
5. Optionally run verification SQL to confirm
6. Click "Verify Migrations" in the app
7. System verifies migrations were applied correctly
8. Dialog dismisses and app becomes usable

## Creating a New Version

### Step 1: Update Version Number

Edit `src/lib/version.ts`:
```typescript
export const APP_VERSION = "1.1.0"; // Changed from 1.0.0
```

### Step 2: Create Release Notes

Create a new markdown file: `/releases/v1.1.0.md`

```markdown
# FTC TeamForge v1.1.0 - Feature Name

**Release Date:** YYYY-MM-DD

## Overview
Brief description of this release

## New Features
- Feature 1
- Feature 2

## Improvements
- Improvement 1
- Improvement 2

## Bug Fixes
- Fix 1
- Fix 2

## Database Changes
- New table: `new_table`
- Modified table: `existing_table` (added column `new_column`)

## Migration Notes
### What's New in the Database
Describe schema changes

### Manual Steps Required
Any post-migration configuration

## Verification
After running the migration, verify:
- [ ] New table `new_table` exists
- [ ] Column `new_column` exists in `existing_table`

---

**Migration Required:** Yes - Run migration script for v1.1.0
**Estimated Migration Time:** ~30 seconds
```

### Step 3: Create Migration File

Create `/database/migrations/0003_v1.1_features.sql`:

```sql
-- Migration: v1.1.0
-- Description: Add new features
-- Created: YYYY-MM-DD

-- ==============================================
-- UP SECTION
-- ==============================================

-- Your schema changes here
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's data"
ON new_table FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM team_members WHERE team_id = new_table.team_id
));

-- Record this version
INSERT INTO schema_versions (version, release_notes_path, description)
VALUES ('1.1.0', '/releases/v1.1.0.md', 'Add new features')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- DOWN SECTION (for rollback)
-- ==============================================
-- DOWN:

DROP POLICY IF EXISTS "Users can view their team's data" ON new_table;
DROP TABLE IF EXISTS new_table;
DELETE FROM schema_versions WHERE version = '1.1.0';

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'new_table'
) AS new_table_exists,
EXISTS (
    SELECT FROM schema_versions WHERE version = '1.1.0'
) AS version_recorded;
VERIFICATION_SCRIPT_END
*/
```

### Step 4: Update Metadata

Edit `/database/migrations/metadata.json`:

```json
{
  "migrations": {
    "1.0.0": { ... },
    "1.1.0": {
      "migration": "0003_v1.1_features.sql",
      "releaseNotes": "/releases/v1.1.0.md",
      "description": "Add new features",
      "requiresVerification": true,
      "verificationScript": "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'new_table') AS verification_passed;",
      "estimatedTime": "30 seconds",
      "dependencies": ["1.0.0"]
    }
  },
  "versionOrder": ["1.0.0", "1.1.0"]
}
```

### Step 5: Test Locally

1. Run `npm run dev`
2. Login to the app
3. You should see the migration pending dialog
4. Copy the SQL and run it in Supabase
5. Click "Verify Migrations"
6. Ensure dialog dismisses and app works

### Step 6: Update package.json (Optional)

For consistency, update the version in `package.json`:
```json
{
  "version": "1.1.0"
}
```

## API Endpoints

### GET /api/version/check
Checks if database version matches app version.

**Response:**
```json
{
  "upToDate": false,
  "currentAppVersion": "1.2.0",
  "dbVersion": "1.0.0",
  "pendingVersions": ["1.1.0", "1.2.0"],
  "pendingReleaseNotes": [...]
}
```

### GET /api/version/migrations?from=1.0.0&to=1.2.0
Returns combined migration SQL for upgrading.

**Response:**
```json
{
  "combinedSQL": "-- Migration SQL...",
  "verificationSQL": "-- Verification queries...",
  "versions": ["1.1.0", "1.2.0"],
  "migrations": [...]
}
```

### POST /api/version/verify
Verifies that migrations have been applied.

**Request Body:**
```json
{
  "versions": ["1.1.0", "1.2.0"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "All migrations verified successfully",
  "results": [...]
}
```

## Database Functions

### `get_current_db_version()`
Returns the highest version number from schema_versions table.

```sql
SELECT get_current_db_version(); -- Returns '1.0.0'
```

### `is_version_applied(version TEXT)`
Checks if a specific version has been applied.

```sql
SELECT is_version_applied('1.1.0'); -- Returns true/false
```

### `record_version_application(version TEXT, notes_path TEXT, description TEXT)`
Records that a version has been successfully applied.

```sql
SELECT record_version_application('1.1.0', '/releases/v1.1.0.md', 'Add new features');
```

## Migration File Structure

Each migration must follow this structure:

```sql
-- Migration: v1.x.x
-- Description: Brief description
-- Created: YYYY-MM-DD

-- ==============================================
-- UP SECTION
-- ==============================================

-- Your schema changes here
-- Use IF NOT EXISTS for idempotency
-- Include RLS policies
-- Record version in schema_versions table

-- ==============================================
-- DOWN SECTION (for rollback)
-- ==============================================
-- DOWN:

-- Reverse all UP section changes
-- Drop tables, policies, functions
-- Remove version from schema_versions

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
-- SQL to verify migration was applied correctly
-- Should return boolean columns (all must be true)
SELECT
  EXISTS (...) AS table_exists,
  EXISTS (...) AS column_exists;
VERIFICATION_SCRIPT_END
*/
```

## Best Practices

### Version Numbering

Follow semantic versioning:
- **MAJOR** - Breaking changes, major rewrites
- **MINOR** - New features, non-breaking changes
- **PATCH** - Bug fixes, small improvements

### Migration Safety

1. **Always use idempotent operations**
   - `CREATE TABLE IF NOT EXISTS`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PostgreSQL 9.6+)
   - `ON CONFLICT DO NOTHING` for inserts

2. **Test migrations locally first**
   - Apply migration in local Supabase
   - Verify all functionality works
   - Test rollback (DOWN section)

3. **Include verification scripts**
   - Check all tables created
   - Verify columns exist
   - Ensure RLS policies are active
   - Confirm functions exist

4. **Document manual steps**
   - If configuration changes needed
   - If data migration required
   - If feature flags must be enabled

### Release Notes

1. **Be specific about changes**
   - Don't just say "bug fixes"
   - List actual issues resolved
   - Explain impact on users

2. **Include migration details**
   - Estimated time to run
   - Database changes made
   - Verification steps

3. **Warn about breaking changes**
   - Highlight in red
   - Provide migration path
   - Document workarounds

## Troubleshooting

### "Version tracking not enabled"

This means the database doesn't have the `schema_versions` table.

**Solution:**
1. Run the `0002_add_version_tracking.sql` migration
2. This will create the version tracking infrastructure
3. Seeds v1.0.0 as the baseline

### Verification fails

**Possible causes:**
1. Migration SQL not run completely
2. Syntax error in migration
3. RLS policies blocking access
4. Missing dependencies

**Solution:**
1. Check Supabase SQL Editor for errors
2. Run verification SQL manually
3. Check error logs
4. Re-run migration if safe (idempotent)

### Dialog won't dismiss

**Cause:** Verification hasn't passed yet

**Solution:**
1. Ensure migration SQL was run completely
2. Run verification SQL to check what's missing
3. Fix any errors
4. Click "Verify Migrations" again

## Advanced: Rolling Back

To roll back a migration:

1. Run the DOWN section of the migration
2. Remove the version from `schema_versions`:
   ```sql
   DELETE FROM schema_versions WHERE version = '1.1.0';
   DELETE FROM migration_history WHERE version = '1.1.0';
   ```
3. Restart the app
4. Version check will pass again

**⚠️ Warning:** Only roll back if:
- No production data depends on the changes
- You're in development/staging
- You have database backups

## Future Enhancements

Potential improvements to the versioning system:

1. **Automatic migration execution** - Option to run migrations from within the app
2. **Migration scheduling** - Run migrations at specific times
3. **Rollback UI** - Button to undo migrations
4. **Migration logs** - View history of all migrations
5. **Version comparison** - See diff between versions
6. **Dry-run mode** - Preview migration without applying

## Support

For issues with the versioning system:
1. Check this documentation
2. Review migration logs in database
3. Check browser console for errors
4. Verify all files are present (version.ts, metadata.json, migration files)
