-- Fix ai_suggestions.steps_jsonb constraint
--
-- Problem: Code stores steps_jsonb as object { version, meta, steps }
-- but DB constraint requires array type.
--
-- This migration removes the array check for ai_suggestions only,
-- allowing the envelope format with metadata.

ALTER TABLE public.ai_suggestions
  DROP CONSTRAINT IF EXISTS ai_suggestions_steps_is_array;

-- Add comment to clarify the format
COMMENT ON COLUMN public.ai_suggestions.steps_jsonb IS
  'JSONB envelope containing version, meta (planned_date, distance, duration, context), and steps array';
