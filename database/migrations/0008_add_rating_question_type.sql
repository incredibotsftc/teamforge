-- Migration: v1.5.1
-- Description: Add 'rating' question type to survey questions
-- Created: 2025-01-26

-- ==============================================
-- UP SECTION
-- ==============================================

-- Drop the existing question_type check constraint
ALTER TABLE public.survey_questions
DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

-- Add new check constraint with 'rating' type included
ALTER TABLE public.survey_questions
ADD CONSTRAINT survey_questions_question_type_check
CHECK (question_type IN ('short_answer', 'long_answer', 'multiple_choice', 'dropdown', 'checkboxes', 'rating'));

-- Update the comment to reflect the new question type
COMMENT ON COLUMN public.survey_questions.question_type IS 'Type: short_answer, long_answer, multiple_choice, dropdown, checkboxes, rating';

-- Record this version in schema_versions
INSERT INTO public.schema_versions (version, release_notes_path, description)
VALUES ('1.5.1', '/releases/v1.5.1.md', 'Add rating (star rating) question type to surveys')
ON CONFLICT (version) DO NOTHING;

-- ==============================================
-- DOWN SECTION
-- ==============================================

-- DOWN:

-- Remove 'rating' from the check constraint
ALTER TABLE public.survey_questions
DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

-- Restore original check constraint without 'rating'
ALTER TABLE public.survey_questions
ADD CONSTRAINT survey_questions_question_type_check
CHECK (question_type IN ('short_answer', 'long_answer', 'multiple_choice', 'dropdown', 'checkboxes'));

-- Restore original comment
COMMENT ON COLUMN public.survey_questions.question_type IS 'Type: short_answer, long_answer, multiple_choice, dropdown, checkboxes';

-- Remove version record
DELETE FROM public.schema_versions WHERE version = '1.5.1';
