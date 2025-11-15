# FTC TeamForge v1.2.0 Release Summary

**Release Date:** November 14, 2024
**Version:** 1.2.0
**Migration Required:** Yes

## What Was Released

This release introduces a complete scouting system for FTC teams, including:

- **Scouting Sheet Templates** - Create custom templates with 8 question types
- **Team Scouting** - Scout any FTC team with customizable forms
- **Event Scouting** - View events and scout all participating teams
- **Image Upload** - Camera support for mobile scouting with field annotations
- **Data Management** - View, edit, and navigate through scouting responses

## Files Updated

### 1. Version Configuration
- ✅ `src/lib/version.ts` - Updated APP_VERSION to "1.2.0"
- ✅ `package.json` - Updated version to "1.2.0"

### 2. Release Documentation
- ✅ `releases/v1.2.0.md` - Complete release notes with feature details

### 3. Database Migration
- ✅ `database/migrations/0003_add_scouting_sheets.sql` - Migration script with:
  - UP section (schema changes)
  - DOWN section (rollback commands)
  - VERIFICATION script (automated validation)
  - Version recording in schema_versions table

### 4. Migration Metadata
- ✅ `database/migrations/metadata.json` - Added v1.2.0 entry with verification script

## Database Changes

### New Tables
1. **`scouting_templates`** - Store reusable scouting sheet templates
2. **`scouting_responses`** - Store filled scouting sheets

### New Storage
- **`scouting-images`** bucket with RLS policies

### Indexes Created
- `idx_scouting_templates_team_season`
- `idx_scouting_responses_team`
- `idx_scouting_responses_template`
- `idx_scouting_responses_scouting_team`

### Foreign Keys
- `scouting_responses.template_id` → `scouting_templates.id` (ON DELETE SET NULL)
- `scouting_responses.team_id` → `teams.id` (ON DELETE CASCADE)

## User Upgrade Path

When users with v1.1.0 or earlier log in to the app after this release:

### Step 1: Migration Pending Dialog Appears
The app will automatically detect the version mismatch and show a dialog with:
- Release notes for v1.2.0
- Combined migration SQL
- Verification SQL

### Step 2: User Runs Migration
1. User copies the migration SQL from the dialog
2. Opens Supabase SQL Editor
3. Pastes and executes the SQL
4. Migration creates tables, indexes, RLS policies, and storage bucket

### Step 3: Verification
1. User clicks "Verify Migrations" button in the app
2. System runs verification checks
3. All checks must pass:
   - ✅ scouting_templates table exists
   - ✅ scouting_responses table exists
   - ✅ Foreign keys created
   - ✅ Indexes created
   - ✅ Storage bucket created
   - ✅ RLS policies active
   - ✅ Version 1.2.0 recorded

### Step 4: App Unlocks
- Dialog dismisses
- User can access all features including new scouting system
- App version matches database version

## Migration Safety Features

### Idempotency
All operations are safe to re-run:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` before creating
- `ON CONFLICT DO NOTHING` for inserts
- DO blocks for conditional constraint creation

### Rollback Capability
The DOWN section can completely reverse the migration:
```sql
-- Run the DOWN section from the migration file
-- Then delete version records
DELETE FROM schema_versions WHERE version = '1.2.0';
DELETE FROM migration_history WHERE version = '1.2.0';
```

⚠️ **Warning:** Rolling back will delete the scouting tables and all scouting data!

## Testing the Release

### Local Testing
1. Start the app: `npm run dev`
2. Login to trigger version check
3. Migration pending dialog should appear
4. Copy SQL and run in local Supabase
5. Click "Verify Migrations"
6. Dialog should dismiss
7. Navigate to "Scouting" in sidebar
8. Create a template and test scouting features

### Verification Queries

#### Manual Verification
```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('scouting_templates', 'scouting_responses');

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'scouting-images';

-- Check version recorded
SELECT * FROM schema_versions WHERE version = '1.2.0';
```

#### Automated Verification
The migration includes a verification script that checks all components automatically.

## Deployment Checklist

Before deploying to production:

- [x] Version updated in `src/lib/version.ts`
- [x] Version updated in `package.json`
- [x] Release notes created in `/releases/v1.2.0.md`
- [x] Migration file properly structured with UP/DOWN/VERIFICATION
- [x] Metadata.json updated with v1.2.0 entry
- [x] Migration tested locally
- [x] Rollback tested locally
- [x] Verification script validates all changes
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript checks pass: `npx tsc --noEmit`
- [ ] Code committed to version control
- [ ] Tagged with v1.2.0 in git
- [ ] Deployed to production
- [ ] Migration verified in production
- [ ] Smoke test of scouting features

## Support Information

### If Migration Fails
1. Check Supabase SQL Editor for error messages
2. Verify `schema_versions` table exists (from v1.1.0)
3. Ensure user has sufficient permissions
4. Run verification SQL manually to identify missing components
5. Safe to re-run migration (it's idempotent)

### If Verification Fails
Common issues:
- Migration not run completely
- Syntax error in SQL
- RLS policies blocking queries
- Missing dependencies (need v1.1.0 first)

Solution:
1. Run verification SQL manually in Supabase
2. Check which components are missing
3. Re-run migration script
4. Try verification again

### Getting Help
1. Check VERSIONING.md documentation
2. Review migration logs in database
3. Check browser console for errors
4. Verify all release files are present

## Next Steps

After successful deployment:

1. Announce v1.2.0 release to team
2. Share release notes from `/releases/v1.2.0.md`
3. Provide migration instructions
4. Monitor for any issues
5. Gather feedback on scouting features
6. Plan next release based on user needs

## Notes

- This is a **MINOR** version bump (1.1.0 → 1.2.0) per semantic versioning
- New features added, no breaking changes
- All existing features continue to work
- Migration is one-way (forward only) unless explicitly rolled back
- Estimated migration time: ~45 seconds
- No manual configuration required after migration
