-- Studentley Rivals: standardized ranked matchmaking, friend battles and
-- community-created quizzes. All competitive writes go through server APIs.

begin;

alter table public.student_point_events
  drop constraint if exists student_point_events_source_kind_check;
alter table public.student_point_events
  add constraint student_point_events_source_kind_check
  check (source_kind in ('study_session','quiz','mock_exam','rival_ranked','rival_friend','community_quiz'));

create table if not exists public.rival_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 900 check (rating between 0 and 5000),
  ranked_wins integer not null default 0 check (ranked_wins >= 0),
  ranked_losses integer not null default 0 check (ranked_losses >= 0),
  friend_wins integer not null default 0 check (friend_wins >= 0),
  total_battles integer not null default 0 check (total_battles >= 0),
  best_win_streak integer not null default 0 check (best_win_streak >= 0),
  current_win_streak integer not null default 0 check (current_win_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rival_topics (
  id text primary key,
  subject text not null,
  topic text not null,
  levels text[] not null default array['GCSE / IGCSE'],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (subject, topic)
);

create table if not exists public.rival_matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('ranked','friend')),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text references public.rival_topics(id) on delete set null,
  subject text not null,
  topic text not null,
  level text not null,
  difficulty text not null default 'Exam standard',
  status text not null default 'waiting' check (status in ('waiting','generating','active','finishing','completed','cancelled')),
  room_code text unique,
  title text not null default 'Rivals battle',
  quiz jsonb not null default '[]'::jsonb,
  question_count integer not null default 10 check (question_count between 3 and 30),
  max_players integer not null default 2 check (max_players between 2 and 8),
  rating_band integer not null default 900,
  started_at timestamptz,
  finish_deadline timestamptz,
  winner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.rival_match_players (
  match_id uuid not null references public.rival_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating_before integer not null default 900,
  rating_after integer,
  correct_answers integer,
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms >= 0),
  answers jsonb,
  joined_at timestamptz not null default now(),
  submitted_at timestamptz,
  primary key (match_id, user_id)
);

create table if not exists public.rival_public_quizzes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  subject text not null check (char_length(subject) between 2 and 80),
  topic text not null default '',
  level text not null default 'Mixed',
  description text not null default '',
  items jsonb not null,
  is_published boolean not null default true,
  play_count integer not null default 0 check (play_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rival_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.rival_public_quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score_percent numeric(5,2) not null check (score_percent between 0 and 100),
  correct_answers integer not null check (correct_answers >= 0),
  elapsed_ms integer not null check (elapsed_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists rival_matches_queue_idx on public.rival_matches(status, mode, topic_id, level, rating_band, created_at);
create index if not exists rival_matches_room_code_idx on public.rival_matches(room_code) where room_code is not null;
create index if not exists rival_match_players_user_idx on public.rival_match_players(user_id, joined_at desc);
create index if not exists rival_public_quizzes_library_idx on public.rival_public_quizzes(is_published, created_at desc);
create index if not exists rival_quiz_attempts_user_idx on public.rival_quiz_attempts(user_id, created_at desc);

insert into public.rival_topics (id, subject, topic, levels) values
  ('maths-number', 'Mathematics', 'Number', array['Primary','GCSE / IGCSE','A-Level','IB','Abitur']),
  ('maths-algebra', 'Mathematics', 'Algebra', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('maths-geometry', 'Mathematics', 'Geometry', array['Primary','GCSE / IGCSE','A-Level','IB','Abitur']),
  ('maths-statistics', 'Mathematics', 'Statistics and probability', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('maths-functions', 'Mathematics', 'Functions', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('maths-calculus', 'Mathematics', 'Calculus', array['A-Level','IB','Abitur']),
  ('physics-motion', 'Physics', 'Forces and motion', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('physics-energy', 'Physics', 'Energy', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('physics-electricity', 'Physics', 'Electricity', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('physics-waves', 'Physics', 'Waves', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('chemistry-atoms', 'Chemistry', 'Atomic structure', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('chemistry-bonding', 'Chemistry', 'Bonding and structure', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('chemistry-reactions', 'Chemistry', 'Chemical reactions', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('chemistry-organic', 'Chemistry', 'Organic chemistry', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('biology-cells', 'Biology', 'Cell biology', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('biology-genetics', 'Biology', 'Genetics', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('biology-ecology', 'Biology', 'Ecology', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('biology-human', 'Biology', 'Human biology', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('english-reading', 'English', 'Reading comprehension', array['Primary','GCSE / IGCSE','A-Level','IB','Abitur']),
  ('english-language', 'English', 'Language analysis', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('english-grammar', 'English', 'Grammar and vocabulary', array['Primary','GCSE / IGCSE']),
  ('computer-algorithms', 'Computer Science', 'Algorithms', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('computer-programming', 'Computer Science', 'Programming concepts', array['GCSE / IGCSE','A-Level','IB','Abitur']),
  ('computer-networks', 'Computer Science', 'Networks and cybersecurity', array['GCSE / IGCSE','A-Level','IB','Abitur'])
on conflict (id) do update set subject = excluded.subject, topic = excluded.topic, levels = excluded.levels, active = true;

insert into public.rival_profiles (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.ensure_rival_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rival_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_rival_profile on public.profiles;
create trigger profiles_create_rival_profile
after insert on public.profiles
for each row execute procedure public.ensure_rival_profile();

create or replace function public.touch_rivals_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rival_profiles_touch on public.rival_profiles;
create trigger rival_profiles_touch before update on public.rival_profiles
for each row execute procedure public.touch_rivals_updated_at();
drop trigger if exists rival_public_quizzes_touch on public.rival_public_quizzes;
create trigger rival_public_quizzes_touch before update on public.rival_public_quizzes
for each row execute procedure public.touch_rivals_updated_at();

alter table public.rival_profiles enable row level security;
alter table public.rival_topics enable row level security;
alter table public.rival_matches enable row level security;
alter table public.rival_match_players enable row level security;
alter table public.rival_public_quizzes enable row level security;
alter table public.rival_quiz_attempts enable row level security;

revoke insert, update, delete on public.rival_profiles, public.rival_topics, public.rival_matches,
  public.rival_match_players, public.rival_public_quizzes, public.rival_quiz_attempts from authenticated;
grant select on public.rival_topics to authenticated;
grant select on public.rival_public_quizzes to authenticated;

drop policy if exists rival_topics_read on public.rival_topics;
create policy rival_topics_read on public.rival_topics for select to authenticated using (active);
drop policy if exists rival_public_quizzes_read on public.rival_public_quizzes;
create policy rival_public_quizzes_read on public.rival_public_quizzes
  for select to authenticated using (is_published or creator_id = auth.uid());

notify pgrst, 'reload schema';

commit;
