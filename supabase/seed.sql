-- Seed data for Training Planner
-- This file is automatically run by Supabase after migrations

-- ============================================
-- Training Types (required for workouts & AI)
-- ============================================
INSERT INTO public.training_types (code, name) VALUES
  ('easy', 'Easy Run'),
  ('tempo', 'Tempo Run'),
  ('intervals', 'Interval Training'),
  ('long_run', 'Long Run'),
  ('recovery', 'Recovery Run'),
  ('walk', 'Walk')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Test User (test@example.com)
-- ============================================
-- Note: User authentication is handled by Supabase Auth
-- The user test@example.com should be created via auth-test-user.sh
-- This seed only creates associated data if needed

-- You can add more seed data here for development:
-- - Sample workouts
-- - Sample AI suggestions
-- - Sample user goals

-- Example: Create a sample completed workout for test user
-- (Uncomment if you want sample data)
/*
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get test user ID (if exists)
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@example.com';

  IF test_user_id IS NOT NULL THEN
    INSERT INTO public.workouts (
      user_id,
      training_type_code,
      planned_date,
      position,
      planned_distance_m,
      planned_duration_s,
      status,
      origin,
      distance_m,
      duration_s,
      avg_pace_s_per_km,
      completed_at
    ) VALUES (
      test_user_id,
      'tempo',
      '2025-11-16',
      1,
      5000,
      1500,
      'completed',
      'manual',
      5000,
      1500,
      300,
      '2025-11-16T18:30:00Z'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;
*/
