/*
  migration: schedule hourly expiration for ai suggestions via pg_cron
  purpose: create function to expire stale ai_suggestions and schedule it hourly
  affected:
    - extension: pg_cron (for job scheduling)
    - function: public.app_expire_ai_suggestions()
    - job: cron.expire_ai_suggestions_hourly (runs every hour at minute 0)
  notes:
    - all sql is lower-case by convention
    - function is security definer to bypass rls intentionally and uses utc time
    - update is idempotent and safe to run multiple times
*/

-- ensure pg_cron extension is available (creates schema cron)
create extension if not exists pg_cron;

-- create or replace the expiration function
create or replace function public.app_expire_ai_suggestions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
    marks suggestions older than 24 hours as expired.
    only affects rows with status 'shown'; other statuses remain unchanged.
  */
  update public.ai_suggestions
  set status = 'expired',
      updated_at = (now() at time zone 'utc')
  where status = 'shown'
    and created_at <= (now() at time zone 'utc') - interval '24 hours';
end;
$$;

comment on function public.app_expire_ai_suggestions() is 'expires ai suggestions (status shown) older than 24h; intended to be called by pg_cron';

-- avoid duplicate schedules by removing any existing job with the same name
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire_ai_suggestions_hourly') then
    delete from cron.job where jobname = 'expire_ai_suggestions_hourly';
  end if;
end$$;

-- schedule the job to run hourly at minute 0
select cron.schedule(
  'expire_ai_suggestions_hourly',
  '0 * * * *',
  $$select public.app_expire_ai_suggestions();$$
);


