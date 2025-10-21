/*
  migration: fix search_path security for app_expire_ai_suggestions function
  purpose: set empty search_path to prevent search path hijacking attacks
  affected:
    - function: public.app_expire_ai_suggestions()
  notes:
    - all sql is lower-case by convention
    - function uses security definer so empty search_path is critical for security
    - function already uses fully qualified names (public.ai_suggestions) so this is safe
    - fixes supabase lint warning: "function search path mutable"
*/

-- recreate function with empty search_path for security
create or replace function public.app_expire_ai_suggestions()
returns void
language plpgsql
security definer
set search_path = ''
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

