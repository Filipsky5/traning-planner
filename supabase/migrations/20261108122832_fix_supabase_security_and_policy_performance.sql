-- Enforce workout ownership when helper views are queried directly.
alter view public.vw_last3_completed_overall
  set (security_invoker = true);
alter view public.vw_last3_completed_per_type
  set (security_invoker = true);

-- Only trusted maintenance callers may expire suggestions across users.
-- The existing pg_cron job runs as postgres and retains owner privileges.
revoke execute on function public.app_expire_ai_suggestions()
  from public, anon, authenticated;

-- Evaluate the caller's user id once per statement, preserving ownership
-- checks for both existing rows (using) and new row values (with check).
alter policy workouts_select_authenticated on public.workouts
  using (user_id = (select auth.uid()));
alter policy workouts_insert_authenticated on public.workouts
  with check (user_id = (select auth.uid()));
alter policy workouts_update_authenticated on public.workouts
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy workouts_delete_authenticated on public.workouts
  using (user_id = (select auth.uid()));

alter policy ai_suggestions_select_authenticated on public.ai_suggestions
  using (user_id = (select auth.uid()));
alter policy ai_suggestions_insert_authenticated on public.ai_suggestions
  with check (user_id = (select auth.uid()));
alter policy ai_suggestions_update_authenticated on public.ai_suggestions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy ai_suggestions_delete_authenticated on public.ai_suggestions
  using (user_id = (select auth.uid()));

alter policy ai_suggestion_events_select_authenticated on public.ai_suggestion_events
  using (user_id = (select auth.uid()));
alter policy ai_suggestion_events_insert_authenticated on public.ai_suggestion_events
  with check (user_id = (select auth.uid()));
alter policy ai_suggestion_events_update_authenticated on public.ai_suggestion_events
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy ai_suggestion_events_delete_authenticated on public.ai_suggestion_events
  using (user_id = (select auth.uid()));

alter policy user_goals_select_authenticated on public.user_goals
  using (user_id = (select auth.uid()));
alter policy user_goals_insert_authenticated on public.user_goals
  with check (user_id = (select auth.uid()));
alter policy user_goals_update_authenticated on public.user_goals
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy user_goals_delete_authenticated on public.user_goals
  using (user_id = (select auth.uid()));

-- Existing ownership/unique indexes already support the other flagged FKs.
-- These dictionary FKs have no index starting with training_type_code.
create index idx_workouts_training_type_code
  on public.workouts (training_type_code);
create index idx_ai_suggestions_training_type_code
  on public.ai_suggestions (training_type_code);
