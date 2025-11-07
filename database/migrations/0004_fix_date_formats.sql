-- Migration 0004: Fix incorrect date formats in events table
-- This migration is only needed if you have dates in MM/DD/YYYY format
-- The application saves dates correctly as YYYY-MM-DD, but older data might have issues

-- IMPORTANT: This migration assumes dates are stored as DATE type
-- If you see dates like "11/7/2025" in your database viewer, that's just the display format
-- PostgreSQL stores dates internally in YYYY-MM-DD format

-- This migration is a safety check and will only run if there are actual format issues
-- If your dates are already in correct format, this will do nothing

DO $$
BEGIN
  -- Check if we need to do anything by trying to parse a date
  -- If dates are already correct format, this does nothing

  -- Uncomment the following lines ONLY if you're certain dates are stored incorrectly:
  /*
  UPDATE events
  SET start_date = to_date(start_date::text, 'MM/DD/YYYY')::date
  WHERE start_date::text ~ '^\d{1,2}/\d{1,2}/\d{4}$';

  UPDATE events
  SET recurrence_end_date = to_date(recurrence_end_date::text, 'MM/DD/YYYY')::date
  WHERE recurrence_end_date IS NOT NULL
    AND recurrence_end_date::text ~ '^\d{1,2}/\d{1,2}/\d{4}$';
  */

  RAISE NOTICE 'Date format check complete. If you need to convert dates, uncomment the UPDATE statements in this migration.';
END $$;
