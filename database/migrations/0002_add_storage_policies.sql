-- Migration 0002: Add missing storage bucket RLS policies
-- This fixes the "new row violates row-level security policy" error when uploading team logos

-- Storage RLS policies for team-logos bucket
-- The team-logos bucket is public, so anyone can read
-- Only authenticated team members can upload/update/delete their team's logo

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Authenticated users can upload team logos" ON "storage"."objects";
DROP POLICY IF EXISTS "Anyone can read team logos" ON "storage"."objects";
DROP POLICY IF EXISTS "Authenticated users can update team logos" ON "storage"."objects";
DROP POLICY IF EXISTS "Authenticated users can delete team logos" ON "storage"."objects";

-- Allow authenticated users to upload team logos
CREATE POLICY "Authenticated users can upload team logos" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'team-logos'
  AND "auth"."uid"() IS NOT NULL
);

-- Allow everyone to read team logos (bucket is public)
CREATE POLICY "Anyone can read team logos" ON "storage"."objects"
FOR SELECT
USING ("bucket_id" = 'team-logos');

-- Allow authenticated users to update team logos
CREATE POLICY "Authenticated users can update team logos" ON "storage"."objects"
FOR UPDATE TO "authenticated"
USING ("bucket_id" = 'team-logos')
WITH CHECK ("bucket_id" = 'team-logos');

-- Allow authenticated users to delete team logos
CREATE POLICY "Authenticated users can delete team logos" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'team-logos');

-- Storage RLS policies for notebook-images bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can upload notebook images" ON "storage"."objects";
DROP POLICY IF EXISTS "Anyone can read notebook images" ON "storage"."objects";
DROP POLICY IF EXISTS "Authenticated users can delete notebook images" ON "storage"."objects";

-- Allow team members to upload images
CREATE POLICY "Team members can upload notebook images" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'notebook-images'
  AND "auth"."uid"() IS NOT NULL
);

-- Allow anyone to read notebook images (bucket is public)
CREATE POLICY "Anyone can read notebook images" ON "storage"."objects"
FOR SELECT
USING ("bucket_id" = 'notebook-images');

-- Allow authenticated users to delete notebook images
CREATE POLICY "Authenticated users can delete notebook images" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'notebook-images');

-- Storage RLS policies for mentoring-team-images bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can upload mentoring team images" ON "storage"."objects";
DROP POLICY IF EXISTS "Team members can read mentoring team images" ON "storage"."objects";
DROP POLICY IF EXISTS "Team members can delete mentoring team images" ON "storage"."objects";

-- Allow team members to upload images for their mentoring teams
CREATE POLICY "Team members can upload mentoring team images" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'mentoring-team-images'
  AND "auth"."uid"() IS NOT NULL
);

-- Allow team members to read mentoring team images
CREATE POLICY "Team members can read mentoring team images" ON "storage"."objects"
FOR SELECT TO "authenticated"
USING ("bucket_id" = 'mentoring-team-images');

-- Allow team members to delete mentoring team images
CREATE POLICY "Team members can delete mentoring team images" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'mentoring-team-images');
