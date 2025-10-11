/*
  migration: create core schema for ai running training planner (mvp)
  purpose: initial schema including enums, tables, constraints, rls policies, indexes, views and seed data
  affected:
    - types: workout_status, workout_rating, workout_origin, ai_suggestion_status, ai_event_kind, goal_type
    - tables: training_types, workouts, ai_suggestions, ai_suggestion_events, user_goals, ai_logs
    - views: vw_last3_completed_per_type, vw_last3_completed_overall
    - indexes and rls policies for all user-facing tables
  notes:
    - all sql is lower-case by convention
    - rls enabled on every table; explicit per-role policies provided
    - destructive changes (drop/alter) are not included in this migration
*/

-- ensure required extension for uuid generation
create extension if not exists pgcrypto;

-- domain enums
create type workout_status as enum ('planned', 'completed', 'skipped', 'canceled');
create type workout_rating as enum ('too_easy', 'just_right', 'too_hard');
create type workout_origin as enum ('manual', 'ai', 'import');
create type ai_suggestion_status as enum ('shown', 'accepted', 'rejected', 'expired');
create type ai_event_kind as enum ('regenerate');
create type goal_type as enum ('distance_by_date');

-- dictionary of training types used by workouts and ai_suggestions
create table public.training_types (
  code text primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.training_types is 'canonical dictionary of training types; deactivation via is_active instead of deletion';
comment on column public.training_types.code is 'stable code used as fk by workouts and ai_suggestions';

-- ai_suggestions: stores ai-generated workouts prior to acceptance
create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_type_code text not null references public.training_types(code) on delete restrict,
  steps_jsonb jsonb not null,
  status ai_suggestion_status not null default 'shown',
  accepted_workout_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_suggestions_steps_is_array check (jsonb_typeof(steps_jsonb) = 'array')
);

comment on table public.ai_suggestions is 'ai-generated suggestions before acceptance';

-- provide composite uniqueness to support ownership-preserving fks
create unique index ai_suggestions_id_user_id_unique on public.ai_suggestions (id, user_id);

-- workouts: plan and execution
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_type_code text not null references public.training_types(code) on delete restrict,
  ai_suggestion_id uuid null,
  origin workout_origin not null default 'manual',
  status workout_status not null default 'planned',
  planned_date date not null,
  position integer not null,
  planned_distance_m integer not null,
  planned_duration_s integer not null,
  steps_jsonb jsonb not null,
  distance_m integer,
  duration_s integer,
  avg_hr_bpm integer,
  completed_at timestamptz,
  rating workout_rating,
  avg_pace_s_per_km integer generated always as (
    case
      when distance_m is not null and distance_m > 0 and duration_s is not null then round(duration_s::numeric / (distance_m::numeric / 1000))::int
      else null
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workouts_position_valid check (position >= 1),
  constraint workouts_planned_distance_range check (planned_distance_m between 100 and 100000),
  constraint workouts_planned_duration_range check (planned_duration_s between 300 and 21600),
  constraint workouts_steps_is_array check (jsonb_typeof(steps_jsonb) = 'array'),
  constraint workouts_distance_range check (distance_m is null or (distance_m between 100 and 100000)),
  constraint workouts_duration_range check (duration_s is null or (duration_s between 300 and 21600)),
  constraint workouts_avg_hr_range check (avg_hr_bpm is null or (avg_hr_bpm between 0 and 240)),
  constraint workouts_rating_only_for_completed check (status = 'completed' or rating is null),
  constraint workouts_completed_metrics_present check (
    (status = 'completed' and distance_m is not null and duration_s is not null and avg_hr_bpm is not null and completed_at is not null)
    or
    (status <> 'completed' and distance_m is null and duration_s is null and avg_hr_bpm is null and completed_at is null and rating is null)
  ),
  constraint workouts_ai_origin_consistency check (
    (origin = 'ai' and ai_suggestion_id is not null) or (origin <> 'ai' and ai_suggestion_id is null)
  )
);

comment on table public.workouts is 'represents a single workout: plan and optional execution metrics';

-- ensure unique ordering within a day per user
create unique index workouts_user_date_position_unique on public.workouts (user_id, planned_date, position);

-- composite uniqueness to support ownership-preserving fks in reverse
create unique index workouts_id_user_id_unique on public.workouts (id, user_id);

-- link workouts.ai_suggestion_id to ai_suggestions.id while enforcing same owner via composite fk
alter table public.workouts
  add constraint workouts_ai_suggestion_ownership_fk
  foreign key (ai_suggestion_id, user_id)
  references public.ai_suggestions (id, user_id)
  on delete restrict;

-- now link ai_suggestions.accepted_workout_id back to workouts with owner consistency
alter table public.ai_suggestions
  add constraint ai_suggestions_accepted_workout_ownership_fk
  foreign key (accepted_workout_id, user_id)
  references public.workouts (id, user_id)
  on delete restrict;

-- 1-1 acceptance mapping from both sides via partial unique indexes
create unique index workouts_ai_suggestion_id_unique_not_null
  on public.workouts (ai_suggestion_id)
  where ai_suggestion_id is not null;

create unique index ai_suggestions_accepted_workout_id_unique_not_null
  on public.ai_suggestions (accepted_workout_id)
  where accepted_workout_id is not null;

-- status <-> accepted_workout_id consistency (accepted implies id present and vice versa)
alter table public.ai_suggestions
  add constraint ai_suggestions_accept_status_consistency check (
    (status = 'accepted' and accepted_workout_id is not null) or (status <> 'accepted' and accepted_workout_id is null)
  );

-- telemetry of regenerate actions on ai suggestions
create table public.ai_suggestion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_suggestion_id uuid not null,
  kind ai_event_kind not null default 'regenerate',
  occurred_at timestamptz not null default now(),
  metadata jsonb
);

comment on table public.ai_suggestion_events is 'audit log of regenerate actions on ai suggestions; used for limit enforcement';

-- enforce suggestion ownership for events
alter table public.ai_suggestion_events
  add constraint ai_suggestion_events_ai_suggestion_ownership_fk
  foreign key (ai_suggestion_id, user_id)
  references public.ai_suggestions (id, user_id)
  on delete cascade;

-- simple per-user goal (exactly one per user in mvp)
create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  goal_type goal_type not null default 'distance_by_date',
  target_distance_m integer not null check (target_distance_m > 0),
  due_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_goals is 'single simple distance goal per user (mvp)';

-- service logs (service-role only); rls enabled and denies anon/authenticated
create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  level text,
  model text,
  provider text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  cost_usd numeric(12, 6) check (cost_usd is null or cost_usd >= 0),
  payload jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ai_logs is 'service-only telemetry for ai interactions; access via service-role';

-- indexes per performance plan
create index idx_workouts_user_planned_date on public.workouts (user_id, planned_date);
create index idx_workouts_user_type_completed_at_desc on public.workouts (user_id, training_type_code, completed_at desc);
create index idx_workouts_user_completed_at_desc on public.workouts (user_id, completed_at desc);
create index idx_ai_suggestions_user_status_created_at_desc on public.ai_suggestions (user_id, status, created_at desc);
create index idx_ai_suggestion_events_user_suggestion_occurred_at_desc on public.ai_suggestion_events (user_id, ai_suggestion_id, occurred_at desc);

-- helper views for last 3 completed workouts
create or replace view public.vw_last3_completed_per_type as
select * from (
  select w.*,
         row_number() over (partition by w.user_id, w.training_type_code order by w.completed_at desc nulls last) as rn
  from public.workouts w
  where w.status = 'completed'
) s
where s.rn <= 3;

comment on view public.vw_last3_completed_per_type is 'per user and training type: up to 3 last completed workouts';

create or replace view public.vw_last3_completed_overall as
select * from (
  select w.*,
         row_number() over (partition by w.user_id order by w.completed_at desc nulls last) as rn
  from public.workouts w
  where w.status = 'completed'
) s
where s.rn <= 3;

comment on view public.vw_last3_completed_overall is 'per user: up to 3 last completed workouts overall';

-- row level security: enabled for all tables
alter table public.training_types enable row level security;
alter table public.workouts enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.ai_suggestion_events enable row level security;
alter table public.user_goals enable row level security;
alter table public.ai_logs enable row level security;

-- rls policies: training_types (public read; no write for anon/authenticated)
create policy training_types_select_anon on public.training_types
  for select to anon using (true);
create policy training_types_select_authenticated on public.training_types
  for select to authenticated using (true);
create policy training_types_insert_anon on public.training_types
  for insert to anon with check (false);
create policy training_types_insert_authenticated on public.training_types
  for insert to authenticated with check (false);
create policy training_types_update_anon on public.training_types
  for update to anon using (false) with check (false);
create policy training_types_update_authenticated on public.training_types
  for update to authenticated using (false) with check (false);
create policy training_types_delete_anon on public.training_types
  for delete to anon using (false);
create policy training_types_delete_authenticated on public.training_types
  for delete to authenticated using (false);

-- rls policies: workouts (owner-only access)
create policy workouts_select_anon on public.workouts
  for select to anon using (false);
create policy workouts_select_authenticated on public.workouts
  for select to authenticated using (user_id = auth.uid());
create policy workouts_insert_anon on public.workouts
  for insert to anon with check (false);
create policy workouts_insert_authenticated on public.workouts
  for insert to authenticated with check (user_id = auth.uid());
create policy workouts_update_anon on public.workouts
  for update to anon using (false) with check (false);
create policy workouts_update_authenticated on public.workouts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_delete_anon on public.workouts
  for delete to anon using (false);
create policy workouts_delete_authenticated on public.workouts
  for delete to authenticated using (user_id = auth.uid());

-- rls policies: ai_suggestions (owner-only access)
create policy ai_suggestions_select_anon on public.ai_suggestions
  for select to anon using (false);
create policy ai_suggestions_select_authenticated on public.ai_suggestions
  for select to authenticated using (user_id = auth.uid());
create policy ai_suggestions_insert_anon on public.ai_suggestions
  for insert to anon with check (false);
create policy ai_suggestions_insert_authenticated on public.ai_suggestions
  for insert to authenticated with check (user_id = auth.uid());
create policy ai_suggestions_update_anon on public.ai_suggestions
  for update to anon using (false) with check (false);
create policy ai_suggestions_update_authenticated on public.ai_suggestions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_suggestions_delete_anon on public.ai_suggestions
  for delete to anon using (false);
create policy ai_suggestions_delete_authenticated on public.ai_suggestions
  for delete to authenticated using (user_id = auth.uid());

-- rls policies: ai_suggestion_events (owner-only access)
create policy ai_suggestion_events_select_anon on public.ai_suggestion_events
  for select to anon using (false);
create policy ai_suggestion_events_select_authenticated on public.ai_suggestion_events
  for select to authenticated using (user_id = auth.uid());
create policy ai_suggestion_events_insert_anon on public.ai_suggestion_events
  for insert to anon with check (false);
create policy ai_suggestion_events_insert_authenticated on public.ai_suggestion_events
  for insert to authenticated with check (user_id = auth.uid());
create policy ai_suggestion_events_update_anon on public.ai_suggestion_events
  for update to anon using (false) with check (false);
create policy ai_suggestion_events_update_authenticated on public.ai_suggestion_events
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_suggestion_events_delete_anon on public.ai_suggestion_events
  for delete to anon using (false);
create policy ai_suggestion_events_delete_authenticated on public.ai_suggestion_events
  for delete to authenticated using (user_id = auth.uid());

-- rls policies: user_goals (owner-only access; exactly one per user enforced by unique key)
create policy user_goals_select_anon on public.user_goals
  for select to anon using (false);
create policy user_goals_select_authenticated on public.user_goals
  for select to authenticated using (user_id = auth.uid());
create policy user_goals_insert_anon on public.user_goals
  for insert to anon with check (false);
create policy user_goals_insert_authenticated on public.user_goals
  for insert to authenticated with check (user_id = auth.uid());
create policy user_goals_update_anon on public.user_goals
  for update to anon using (false) with check (false);
create policy user_goals_update_authenticated on public.user_goals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_goals_delete_anon on public.user_goals
  for delete to anon using (false);
create policy user_goals_delete_authenticated on public.user_goals
  for delete to authenticated using (user_id = auth.uid());

-- rls policies: ai_logs (deny anon/authenticated; service-role bypasses rls)
create policy ai_logs_select_anon on public.ai_logs
  for select to anon using (false);
create policy ai_logs_select_authenticated on public.ai_logs
  for select to authenticated using (false);
create policy ai_logs_insert_anon on public.ai_logs
  for insert to anon with check (false);
create policy ai_logs_insert_authenticated on public.ai_logs
  for insert to authenticated with check (false);
create policy ai_logs_update_anon on public.ai_logs
  for update to anon using (false) with check (false);
create policy ai_logs_update_authenticated on public.ai_logs
  for update to authenticated using (false) with check (false);
create policy ai_logs_delete_anon on public.ai_logs
  for delete to anon using (false);
create policy ai_logs_delete_authenticated on public.ai_logs
  for delete to authenticated using (false);

-- seed initial training types. on conflict do nothing to preserve idempotency.
insert into public.training_types (code, name, is_active)
values
  ('easy', 'easy run', true),
  ('tempo', 'tempo run', true),
  ('intervals', 'intervals', true),
  ('long_run', 'long run', true),
  ('recovery', 'recovery run', true),
  ('walk', 'walk', true)
on conflict (code) do nothing;


