### 1. Lista tabel z kolumnami, typami i ograniczeniami

```sql
-- Extensions
create extension if not exists pgcrypto with schema public;

-- Enums
do $$ begin
  create type workout_status as enum ('planned','completed','skipped','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workout_rating as enum ('too_easy','just_right','too_hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workout_origin as enum ('manual','ai','import');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_suggestion_status as enum ('shown','accepted','rejected','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_event_kind as enum ('regenerate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_type as enum ('distance_by_date');
exception when duplicate_object then null; end $$;

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 1) Słownik typów treningów
create table if not exists public.training_types (
  code        text primary key,
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2) Sugestie AI
create table if not exists public.ai_suggestions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  training_type_code   text not null references public.training_types(code) on delete restrict,
  steps_jsonb          jsonb not null,
  status               ai_suggestion_status not null default 'shown',
  accepted_workout_id  uuid unique,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint ai_suggestions_steps_jsonb_chk
    check (jsonb_typeof(steps_jsonb) = 'array')
);

-- Zapewnia możliwość kompozytowego FK (id, user_id)
alter table public.ai_suggestions
  add constraint if not exists ai_suggestions_id_user_unique unique (id, user_id);

-- 3) Treningi (plan i realizacja)
create table if not exists public.workouts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  training_type_code   text not null references public.training_types(code) on delete restrict,
  planned_date         date not null,
  position             smallint not null,

  -- Plan (zawsze wymagany w MVP)
  planned_distance_m   integer not null,
  planned_duration_s   integer not null,

  -- Realizacja (wymagana tylko dla status='completed')
  distance_m           integer,
  duration_s           integer,
  avg_hr_bpm           integer,
  completed_at         timestamptz,

  -- Atrybuty statusu
  status               workout_status not null default 'planned',
  rating               workout_rating,
  origin               workout_origin not null default 'manual',
  ai_suggestion_id     uuid,

  -- Struktura treningu
  steps_jsonb          jsonb,

  -- Kolumna generowana: średnie tempo (s/km)
  avg_pace_s_per_km    integer generated always as (
    case
      when distance_m is null or duration_s is null or distance_m = 0 then null
      else (duration_s * 1000) / distance_m
    end
  ) stored,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- CHECK: pozycja w dniu
  constraint workouts_position_chk check (position >= 1),

  -- CHECK: zakresy planu
  constraint workouts_planned_distance_chk check (planned_distance_m between 100 and 100000),
  constraint workouts_planned_duration_chk check (planned_duration_s between 300 and 21600),

  -- CHECK: zakresy realizacji (jeśli obecne)
  constraint workouts_distance_range_chk check (distance_m is null or (distance_m between 100 and 100000)),
  constraint workouts_duration_range_chk check (duration_s is null or (duration_s between 300 and 21600)),
  constraint workouts_avg_hr_range_chk   check (avg_hr_bpm is null or (avg_hr_bpm between 0 and 240)),

  -- CHECK: steps_jsonb minimalnie weryfikowane jako tablica
  constraint workouts_steps_jsonb_chk check (steps_jsonb is null or jsonb_typeof(steps_jsonb) = 'array'),

  -- CHECK: metryki realizacji wymagane wyłącznie dla completed
  constraint workouts_metrics_required_chk check (
    (status = 'completed' and distance_m is not null and duration_s is not null and avg_hr_bpm is not null and completed_at is not null)
    or
    (status <> 'completed' and distance_m is null and duration_s is null and avg_hr_bpm is null and completed_at is null)
  ),

  -- CHECK: rating tylko dla completed
  constraint workouts_rating_when_completed_chk check (
    (status = 'completed' and rating is not null) or (status <> 'completed' and rating is null)
  ),

  -- CHECK: origin 'ai' IFF istnieje ai_suggestion_id
  constraint workouts_origin_ai_link_chk check (
    ((origin = 'ai') and (ai_suggestion_id is not null)) or ((origin <> 'ai') and (ai_suggestion_id is null))
  )
);

-- Unikalność pozycji w danym dniu na użytkownika
alter table public.workouts
  add constraint if not exists workouts_unique_position_per_day
  unique (user_id, planned_date, position);

-- Kompozytowe FK między workouts a ai_suggestions (egzekwuje spójność user_id)
-- Najpierw umożliwiamy referencję do (id, user_id) w workouts
alter table public.workouts
  add constraint if not exists workouts_id_user_unique unique (id, user_id);

-- FK: workouts -> ai_suggestions (id, user_id)
alter table public.workouts
  add constraint if not exists workouts_ai_suggestion_fk
  foreign key (ai_suggestion_id, user_id)
  references public.ai_suggestions (id, user_id)
  on delete restrict;

-- FK: ai_suggestions.accepted_workout_id -> workouts (id, user_id)
alter table public.ai_suggestions
  add constraint if not exists ai_suggestions_accepted_workout_fk
  foreign key (accepted_workout_id, user_id)
  references public.workouts (id, user_id)
  on delete restrict;

-- 4) Zdarzenia związane z sugestiami (MVP: tylko 'regenerate')
create table if not exists public.ai_suggestion_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  ai_suggestion_id  uuid not null references public.ai_suggestions(id) on delete cascade,
  kind              ai_event_kind not null default 'regenerate',
  occurred_at       timestamptz not null default now(),
  metadata          jsonb
);

-- 5) Cele użytkownika (MVP: wyłącznie 'distance_by_date', 1 cel na użytkownika)
create table if not exists public.user_goals (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  goal_type          goal_type not null default 'distance_by_date',
  target_distance_m  integer not null check (target_distance_m > 0),
  due_date           date not null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint user_goals_one_per_user unique (user_id)
);

-- 6) Logi AI (tylko dla service-role; RLS wyłączone, retencja 30 dni przez job)
create table if not exists public.ai_logs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       uuid,
  event         text not null,
  level         text not null default 'info',
  model         text,
  provider      text,
  latency_ms    integer,
  input_tokens  integer,
  output_tokens integer,
  cost_usd      numeric(12,6),
  payload       jsonb
);

-- Triggery updated_at
do $$ begin
  create trigger set_updated_at_workouts
    before update on public.workouts
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger set_updated_at_ai_suggestions
    before update on public.ai_suggestions
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger set_updated_at_user_goals
    before update on public.user_goals
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
```

### 2. Relacje między tabelami (kardynalność)

- **training_types (1) → (N) workouts**: `workouts.training_type_code` → `training_types.code` (RESTRICT)
- **training_types (1) → (N) ai_suggestions**: `ai_suggestions.training_type_code` → `training_types.code` (RESTRICT)
- **auth.users (1) → (N) workouts**: `workouts.user_id` (CASCADE)
- **auth.users (1) → (N) ai_suggestions**: `ai_suggestions.user_id` (CASCADE)
- **auth.users (1) → (N) ai_suggestion_events**: `ai_suggestion_events.user_id` (CASCADE)
- **auth.users (1) → (N) user_goals**: `user_goals.user_id` (CASCADE; unikalność 1 cel / user)
- **ai_suggestions (1) → (0..1) workouts**: `ai_suggestions.accepted_workout_id` ↔ `workouts.id` (unikalne, 1–1 z egzekwowaniem spójności `user_id`)
- **workouts (0..1) → (1) ai_suggestions**: `workouts.ai_suggestion_id` ↔ `ai_suggestions.id` (kompozytowe FK z `user_id`)
- **ai_suggestions (1) → (N) ai_suggestion_events**: `ai_suggestion_events.ai_suggestion_id` → `ai_suggestions.id` (CASCADE)

Kardynalność 1–1 między zaakceptowaną sugestią a treningiem jest egzekwowana przez:
- `unique (ai_suggestions.accepted_workout_id)` oraz
- częściową unikalność `workouts.ai_suggestion_id` (index WHERE `ai_suggestion_id IS NOT NULL`),
- kompozytowe FK `(ai_suggestion_id, user_id)` oraz `(accepted_workout_id, user_id)` zapewniają zgodność użytkownika.

### 3. Indeksy

```sql
-- Workouts pod kalendarz i analitykę
create index if not exists idx_workouts_user_planned_date
  on public.workouts (user_id, planned_date);

create index if not exists idx_workouts_user_type_completed_at
  on public.workouts (user_id, training_type_code, completed_at desc);

create index if not exists idx_workouts_user_completed_at
  on public.workouts (user_id, completed_at desc);

-- Unikalność odwzorowania sugestii -> trening (tylko gdy nie-null)
create unique index if not exists idx_workouts_ai_suggestion_id_unique
  on public.workouts (ai_suggestion_id)
  where ai_suggestion_id is not null;

-- Sugestie AI do filtrowania po statusie i czasie
create index if not exists idx_ai_suggestions_user_status_created_at
  on public.ai_suggestions (user_id, status, created_at desc);

-- Zdarzenia AI
create index if not exists idx_ai_suggestion_events_user_suggestion_time
  on public.ai_suggestion_events (user_id, ai_suggestion_id, occurred_at desc);
```

### 4. Zasady PostgreSQL (RLS)

```sql
-- Włącz RLS dla wszystkich tabel użytkownika
alter table public.workouts enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.ai_suggestion_events enable row level security;
alter table public.user_goals enable row level security;

-- Polityki: dostęp tylko do własnych wierszy (USING/WITH CHECK)
do $$ begin
  create policy workouts_select_own on public.workouts
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy workouts_insert_own on public.workouts
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy workouts_update_own on public.workouts
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy workouts_delete_own on public.workouts
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestions_select_own on public.ai_suggestions
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestions_insert_own on public.ai_suggestions
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestions_update_own on public.ai_suggestions
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestions_delete_own on public.ai_suggestions
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestion_events_select_own on public.ai_suggestion_events
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestion_events_insert_own on public.ai_suggestion_events
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestion_events_update_own on public.ai_suggestion_events
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ai_suggestion_events_delete_own on public.ai_suggestion_events
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy user_goals_select_own on public.user_goals
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy user_goals_insert_own on public.user_goals
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy user_goals_update_own on public.user_goals
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy user_goals_delete_own on public.user_goals
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Tabela ai_logs: tylko service-role (RLS można pozostawić wyłączone i użyć GRANTów)
-- Granty przykładowe (dostosować do środowiska Supabase):
-- revoke all on table public.ai_logs from public;
-- grant select, insert, update, delete on table public.ai_logs to role supabase_admin;
-- grant select, insert on table public.ai_logs to role service_role;
```

### 5. Widoki (do logiki progresji)

```sql
-- Ostatnie 3 zakończone treningi per typ (na użytkownika)
create or replace view public.vw_last3_completed_per_type as
select * from (
  select
    w.*, 
    row_number() over (
      partition by w.user_id, w.training_type_code
      order by w.completed_at desc
    ) as rn
  from public.workouts w
  where w.status = 'completed'
) t
where t.rn <= 3;

-- Ostatnie 3 zakończone treningi ogółem (na użytkownika)
create or replace view public.vw_last3_completed_overall as
select * from (
  select
    w.*, 
    row_number() over (
      partition by w.user_id
      order by w.completed_at desc
    ) as rn
  from public.workouts w
  where w.status = 'completed'
) t
where t.rn <= 3;
```

### 6. Dane początkowe (seed) dla `training_types`

```sql
insert into public.training_types (code, name, is_active)
values
  ('easy',       'Bieg spokojny', true),
  ('tempo',      'Bieg tempowy', true),
  ('intervals',  'Interwały', true),
  ('long_run',   'Długi bieg', true),
  ('recovery',   'Regeneracyjny', true),
  ('walk',       'Spacer', true)
on conflict (code) do update set
  name = excluded.name,
  is_active = excluded.is_active;
```

### 7. Dodatkowe uwagi

- Wszystkie czasy i daty w UTC; `planned_date` to data doby UTC, znaczące czasy to `timestamptz`.
- `ai_suggestions` wygasają logicznie po 24h względem `created_at` (liczone w API; brak kolumny w DB).
- Walidacja struktury `steps_jsonb` jest minimalna w DB (tylko typ tablicy); pełna walidacja schematu po stronie API.
- Brak partycjonowania na MVP; opcja partycjonowania `workouts` po `planned_date` w przyszłości.
- Większość reguł biznesowych (spójność dat przy akceptacji AI, limity regeneracji, itp.) egzekwowana w warstwie API.
- Retencja `ai_logs` 30 dni do realizacji zewnętrznym jobem (cron/Task).

