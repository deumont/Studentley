-- AI-hosted Study Parties for Studentley Rivals.
-- Safe to run more than once. Party state is written only by the server API.

begin;

alter table public.student_point_events
  drop constraint if exists student_point_events_source_kind_check;
alter table public.student_point_events
  add constraint student_point_events_source_kind_check
  check (source_kind in ('study_session','quiz','mock_exam','rival_ranked','rival_friend','community_quiz','rival_study_party'));

create table if not exists public.rival_study_parties (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  material_document_id uuid references public.documents(id) on delete set null,
  room_code text not null unique,
  title text not null check (char_length(title) between 3 and 120),
  subject text not null check (char_length(subject) between 2 and 80),
  topic text not null default '',
  level text not null default 'Mixed',
  difficulty text not null default 'Adaptive',
  game_mode text not null default 'free_for_all' check (game_mode in ('free_for_all','teams')),
  status text not null default 'waiting' check (status in ('waiting','active','completed','cancelled')),
  phase text not null default 'waiting' check (phase in ('waiting','intermission','question','reveal','completed')),
  max_players integer not null default 8 check (max_players between 2 and 8),
  question_count integer not null default 12 check (question_count between 6 and 24),
  questions jsonb not null default '[]'::jsonb,
  used_question_indexes integer[] not null default array[]::integer[],
  current_question integer,
  directed_user_id uuid references auth.users(id) on delete set null,
  buzzed_by uuid references auth.users(id) on delete set null,
  buzzed_at timestamptz,
  attempted_user_ids uuid[] not null default array[]::uuid[],
  phase_deadline timestamptz,
  host_message text not null default 'Waiting for the host to begin.',
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_team text check (winner_team is null or winner_team in ('A','B')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.rival_study_party_players (
  party_id uuid not null references public.rival_study_parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team text check (team is null or team in ('A','B')),
  score integer not null default 0 check (score >= 0),
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  topic_stats jsonb not null default '{}'::jsonb,
  sp_awarded integer not null default 0 check (sp_awarded >= 0),
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table if not exists public.rival_study_party_answers (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.rival_study_parties(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null default '',
  correct boolean not null,
  points integer not null default 0 check (points >= 0),
  response_ms integer not null default 0 check (response_ms >= 0),
  created_at timestamptz not null default now(),
  unique (party_id, question_index, user_id)
);

create index if not exists rival_study_parties_code_idx on public.rival_study_parties(room_code);
create index if not exists rival_study_parties_host_idx on public.rival_study_parties(host_user_id, created_at desc);
create index if not exists rival_study_party_players_user_idx on public.rival_study_party_players(user_id, joined_at desc);
create index if not exists rival_study_party_answers_party_idx on public.rival_study_party_answers(party_id, question_index);

create or replace function public.touch_study_party_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rival_study_parties_touch on public.rival_study_parties;
create trigger rival_study_parties_touch
before update on public.rival_study_parties
for each row execute procedure public.touch_study_party_updated_at();

alter table public.rival_study_parties enable row level security;
alter table public.rival_study_party_players enable row level security;
alter table public.rival_study_party_answers enable row level security;

revoke all on public.rival_study_parties, public.rival_study_party_players,
  public.rival_study_party_answers from anon, authenticated;

notify pgrst, 'reload schema';

commit;
