-- migration: add planned_date column to ai_suggestions
-- purpose: extract planned_date from steps_jsonb to dedicated column for better query performance and clarity
-- affected tables: ai_suggestions
-- special considerations: backfills existing records from jsonb, adds index for daily limit queries

-- add planned_date column (nullable initially for backfill)
alter table public.ai_suggestions
  add column planned_date date;

comment on column public.ai_suggestions.planned_date is 'target date for the suggested workout; used for daily limit enforcement (3 per user per date per day)';

-- backfill existing records from steps_jsonb->meta->>'planned_date'
-- this extracts the planned_date from jsonb and converts to postgres date type
update public.ai_suggestions
set planned_date = (steps_jsonb->'meta'->>'planned_date')::date
where planned_date is null
  and steps_jsonb->'meta'->>'planned_date' is not null;

-- make column not null after backfill
-- ensures data integrity going forward
alter table public.ai_suggestions
  alter column planned_date set not null;

-- add index for efficient daily limit queries
-- supports queries filtering by (user_id, planned_date, created_at)
create index idx_ai_suggestions_user_planned_date_created_at
  on public.ai_suggestions (user_id, planned_date, created_at desc);

comment on index idx_ai_suggestions_user_planned_date_created_at is 'supports daily limit enforcement queries (3 suggestions per user per planned_date per utc day)';

-- add check constraint to ensure planned_date is reasonable
-- prevents dates too far in past or future
alter table public.ai_suggestions
  add constraint ai_suggestions_planned_date_range check (
    planned_date >= '2024-01-01' and planned_date <= current_date + interval '1 year'
  );

comment on constraint ai_suggestions_planned_date_range on public.ai_suggestions is 'ensures planned_date is within reasonable range (since 2024, max 1 year future)';
