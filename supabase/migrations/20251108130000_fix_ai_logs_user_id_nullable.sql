-- Migration: Fix ai_logs.user_id to be nullable
-- Date: 2025-11-08
-- Description: user_id in ai_logs should be optional (nullable) according to db-plan.md
--              Many AI logs are not associated with a specific user (e.g., system-level events)

-- Drop NOT NULL constraint on user_id
ALTER TABLE public.ai_logs
  ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.ai_logs.user_id IS 'Optional: User associated with this AI interaction. NULL for system-level events.';
