-- Migration 0003: Add missing event types to event_type enum
-- This fixes the "invalid input value for enum event_type" error when creating events

-- Add new event types to the event_type enum
-- Note: PostgreSQL doesn't allow modifying enums directly, so we need to add each value
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'practice';
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'fundraising';
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'training';
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'scrimmage';
ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'other';

-- Note: The enum now contains all these event types:
-- meeting, competition, outreach, workshop, social, review, practice, fundraising, training, scrimmage, other
