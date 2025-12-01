-- Migration: Fix public survey access
-- Description: Add RLS policy to allow anyone to view published surveys
-- Created: 2025-11-22

-- ==============================================
-- UP SECTION
-- ==============================================

-- Add RLS policy to allow anyone to view published surveys
-- This fixes the issue where published surveys show "Survey not found" when accessed via public links
DROP POLICY IF EXISTS "Anyone can view published surveys" ON public.surveys;
CREATE POLICY "Anyone can view published surveys"
  ON public.surveys
  FOR SELECT
  USING (status = 'published');

COMMENT ON POLICY "Anyone can view published surveys" ON public.surveys IS 'Allows anonymous/public users to view published surveys without authentication';

-- ==============================================
-- DOWN SECTION
-- ==============================================
-- DOWN:
DROP POLICY IF EXISTS "Anyone can view published surveys" ON public.surveys;

-- ==============================================
-- VERIFICATION SCRIPT
-- ==============================================
/*
VERIFICATION_SCRIPT_START
SELECT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'surveys'
  AND policyname = 'Anyone can view published surveys'
) AS policy_exists;
VERIFICATION_SCRIPT_END
*/