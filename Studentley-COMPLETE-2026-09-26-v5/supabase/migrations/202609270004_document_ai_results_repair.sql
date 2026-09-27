-- Repair persistent AI analysis storage for uploaded documents.
-- Safe to run repeatedly on projects where the original combined migration
-- was only partially applied.

begin;

create table if not exists public.document_ai_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  operation text not null check (operation in ('analysis', 'summary')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_ai_results_document_operation_key unique (document_id, operation)
);

create index if not exists document_ai_results_user_document_idx
  on public.document_ai_results(user_id, document_id);

create unique index if not exists document_ai_results_document_operation_idx
  on public.document_ai_results(document_id, operation);

alter table public.document_ai_results enable row level security;

grant select on public.document_ai_results to authenticated;

drop policy if exists document_ai_results_select_own on public.document_ai_results;
create policy document_ai_results_select_own
  on public.document_ai_results
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_document_ai_results_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists document_ai_results_touch on public.document_ai_results;
create trigger document_ai_results_touch
before update on public.document_ai_results
for each row execute procedure public.touch_document_ai_results_updated_at();

-- Ask PostgREST to expose the new relation without waiting for its normal
-- schema-cache refresh interval.
notify pgrst, 'reload schema';

commit;
