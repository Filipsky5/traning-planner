-- Run against a local Supabase database with all migrations applied.
-- Fixtures and assertions are rolled back; never run against production.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');

-- Each user has four easy workouts and one tempo workout. Views should
-- return three overall or four per type, always belonging to the caller.
insert into public.workouts (
  user_id, training_type_code, status, planned_date, position,
  planned_distance_m, planned_duration_s, steps_jsonb,
  distance_m, duration_s, avg_hr_bpm, completed_at
)
select user_id, case when n = 5 then 'tempo' else 'easy' end,
  'completed', current_date, n, 1000, 600, '[]'::jsonb,
  1000, 600, 120, now() - n * interval '1 hour'
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000002'::uuid)
) as users(user_id)
cross join generate_series(1, 5) as series(n);

insert into public.ai_suggestions (
  id, user_id, training_type_code, steps_jsonb, planned_date, created_at
) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
    'easy', '[]', current_date, now() - interval '25 hours'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
    'easy', '[]', current_date, now() - interval '25 hours'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
    'easy', '[]', current_date, now() - interval '1 hour'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
    'easy', '[]', current_date, now() - interval '1 hour');

insert into public.ai_suggestion_events (user_id, ai_suggestion_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

insert into public.user_goals (user_id, target_distance_m, due_date) values
  ('10000000-0000-0000-0000-000000000001', 5000, current_date + 30),
  ('10000000-0000-0000-0000-000000000002', 5000, current_date + 30);

set local request.jwt.claims = '{}';
set local request.jwt.claim.sub = '';
set local role anon;

select is((select count(*) from public.workouts), 0::bigint, 'anonymous cannot read workouts');
select is((select count(*) from public.vw_last3_completed_overall), 0::bigint,
  'anonymous cannot read overall workout history');
select is((select count(*) from public.vw_last3_completed_per_type), 0::bigint,
  'anonymous cannot read per-type workout history');
select throws_ok('select public.app_expire_ai_suggestions()', '42501', null,
  'anonymous cannot invoke privileged maintenance');

reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set local role authenticated;

select is((select count(*) from public.vw_last3_completed_overall), 3::bigint,
  'first user can read their last three workouts');
select is((select count(*) from public.vw_last3_completed_per_type), 4::bigint,
  'first user can read up to three workouts per type');
select is((select count(*) from public.vw_last3_completed_overall where user_id <> auth.uid()), 0::bigint,
  'overall view never exposes another user');
select is((select count(*) from public.vw_last3_completed_per_type where user_id <> auth.uid()), 0::bigint,
  'per-type view never exposes another user');
select throws_ok('select public.app_expire_ai_suggestions()', '42501', null,
  'signed-in users cannot invoke privileged maintenance');

select results_eq(format('select count(*) from public.%I', table_name),
  format('values (%s::bigint)', expected_count), table_name || ' SELECT preserves owner access')
from (values ('workouts', 5), ('ai_suggestions', 2), ('ai_suggestion_events', 1), ('user_goals', 1))
  as cases(table_name, expected_count);

select results_eq(format(
  'with changed as (update public.%I set user_id = user_id where user_id <> auth.uid() returning id) select count(*) from changed',
  table_name), 'values (0::bigint)', table_name || ' UPDATE cannot change foreign rows')
from (values ('workouts'), ('ai_suggestions'), ('ai_suggestion_events'), ('user_goals')) as cases(table_name);

select results_eq(format(
  'with changed as (update public.%I set user_id = user_id returning id) select count(*) from changed', table_name),
  format('values (%s::bigint)', expected_count), table_name || ' UPDATE preserves owner access')
from (values ('workouts', 5), ('ai_suggestions', 2), ('ai_suggestion_events', 1), ('user_goals', 1))
  as cases(table_name, expected_count);

select throws_ok(format('update public.%I set user_id = %L', table_name,
  '10000000-0000-0000-0000-000000000002'), '42501', null,
  table_name || ' WITH CHECK prevents ownership reassignment')
from (values ('workouts'), ('ai_suggestions'), ('ai_suggestion_events'), ('user_goals')) as cases(table_name);

select results_eq(format(
  'with deleted as (delete from public.%I where user_id <> auth.uid() returning id) select count(*) from deleted',
  table_name), 'values (0::bigint)', table_name || ' DELETE cannot remove foreign rows')
from (values ('workouts'), ('ai_suggestions'), ('ai_suggestion_events'), ('user_goals')) as cases(table_name);

-- INSERT permissions must still permit own rows and reject foreign owners.
select lives_ok($$insert into public.workouts (
  user_id, training_type_code, planned_date, position, planned_distance_m, planned_duration_s, steps_jsonb
) values (auth.uid(), 'easy', current_date, 6, 1000, 600, '[]')$$, 'workouts INSERT accepts own rows');
select throws_ok($$insert into public.workouts (
  user_id, training_type_code, planned_date, position, planned_distance_m, planned_duration_s, steps_jsonb
) values ('10000000-0000-0000-0000-000000000002', 'easy', current_date, 6, 1000, 600, '[]')$$,
  '42501', null, 'workouts INSERT rejects foreign ownership');

select lives_ok($$insert into public.ai_suggestions (
  id, user_id, training_type_code, planned_date, steps_jsonb
) values ('20000000-0000-0000-0000-000000000005', auth.uid(), 'easy', current_date, '[]')$$,
  'ai_suggestions INSERT accepts own rows');
select throws_ok($$insert into public.ai_suggestions (user_id, training_type_code, planned_date, steps_jsonb)
  values ('10000000-0000-0000-0000-000000000002', 'easy', current_date, '[]')$$,
  '42501', null, 'ai_suggestions INSERT rejects foreign ownership');

select lives_ok($$insert into public.ai_suggestion_events (user_id, ai_suggestion_id)
  values (auth.uid(), '20000000-0000-0000-0000-000000000005')$$,
  'ai_suggestion_events INSERT accepts own rows');
select throws_ok($$insert into public.ai_suggestion_events (user_id, ai_suggestion_id)
  values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'ai_suggestion_events INSERT rejects foreign ownership');

select results_eq('with deleted as (delete from public.user_goals returning id) select count(*) from deleted',
  'values (1::bigint)', 'user_goals DELETE permits own rows');
select lives_ok($$insert into public.user_goals (user_id, target_distance_m, due_date)
  values (auth.uid(), 10000, current_date + 60)$$, 'user_goals INSERT accepts own rows');
select throws_ok($$insert into public.user_goals (user_id, target_distance_m, due_date)
  values ('10000000-0000-0000-0000-000000000002', 10000, current_date + 60)$$,
  '42501', null, 'user_goals INSERT rejects foreign ownership');

select results_eq('with deleted as (delete from public.ai_suggestion_events returning id) select count(*) from deleted',
  'values (2::bigint)', 'ai_suggestion_events DELETE permits own rows');
select results_eq('with deleted as (delete from public.ai_suggestions where id = ''20000000-0000-0000-0000-000000000005'' returning id) select count(*) from deleted',
  'values (1::bigint)', 'ai_suggestions DELETE permits own rows');
select results_eq('with deleted as (delete from public.workouts where position = 6 returning id) select count(*) from deleted',
  'values (1::bigint)', 'workouts DELETE permits own rows');

reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
set local role authenticated;

select is((select count(*) from public.vw_last3_completed_overall), 3::bigint,
  'second user can read their last three workouts');
select is((select count(*) from public.vw_last3_completed_per_type), 4::bigint,
  'second user can read up to three workouts per type');
select is((select count(*) from public.vw_last3_completed_overall where user_id <> auth.uid()), 0::bigint,
  'second user cannot read first user overall history');
select is((select count(*) from public.vw_last3_completed_per_type where user_id <> auth.uid()), 0::bigint,
  'second user cannot read first user per-type history');

reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
set local role authenticated;

select is((select count(*) from public.vw_last3_completed_overall), 0::bigint,
  'unrelated user has no overall history');
select is((select count(*) from public.vw_last3_completed_per_type), 0::bigint,
  'unrelated user has no per-type history');

reset role;
select ok(has_function_privilege('postgres', 'public.app_expire_ai_suggestions()', 'execute'),
  'cron owner retains maintenance permission');
select lives_ok('select public.app_expire_ai_suggestions()', 'cron owner can execute maintenance');
select is((select count(*) from public.ai_suggestions where status = 'expired'), 2::bigint,
  'maintenance expires old suggestions across both users');
select is((select count(*) from public.ai_suggestions where status = 'shown'), 2::bigint,
  'maintenance preserves fresh suggestions');
select is((select count(*) from cron.job where jobname = 'expire_ai_suggestions_hourly'
  and active and username = 'postgres' and schedule = '0 * * * *'), 1::bigint,
  'hourly cron schedule retains its privileged caller');
select has_index('public', 'workouts', 'idx_workouts_training_type_code',
  'workout training-type foreign key has an index');
select has_index('public', 'ai_suggestions', 'idx_ai_suggestions_training_type_code',
  'suggestion training-type foreign key has an index');

select * from finish();
rollback;
