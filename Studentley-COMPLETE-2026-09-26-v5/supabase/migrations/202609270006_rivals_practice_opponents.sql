-- Persistent simulated practice opponents for ranked Rivals matchmaking.
-- The server remains the only writer; clients can only see the serialized match.

begin;

create table if not exists public.rival_match_bots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.rival_matches(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  rating_before integer not null default 900 check (rating_before between 0 and 5000),
  correct_answers integer,
  target_correct integer not null check (target_correct >= 0),
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  planned_elapsed_ms integer not null check (planned_elapsed_ms between 5000 and 3600000),
  answers jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  submitted_at timestamptz
);

alter table public.rival_matches
  add column if not exists winner_bot_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rival_matches_winner_bot_id_fkey'
      and conrelid = 'public.rival_matches'::regclass
  ) then
    alter table public.rival_matches
      add constraint rival_matches_winner_bot_id_fkey
      foreign key (winner_bot_id) references public.rival_match_bots(id) on delete set null;
  end if;
end;
$$;

create index if not exists rival_match_bots_match_idx
  on public.rival_match_bots(match_id);

alter table public.rival_match_bots enable row level security;
revoke all on public.rival_match_bots from anon, authenticated;

notify pgrst, 'reload schema';

commit;
