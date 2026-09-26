-- Complete Stripe subscription persistence and add server-awarded Studentley
-- points, streaks, and a privacy-safe multiplayer leaderboard.
-- Safe to apply more than once.

alter table public.profiles add column if not exists leaderboard_visible boolean not null default true;
alter table public.subscriptions add column if not exists stripe_price_id text;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists last_stripe_event_at timestamptz;

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active','trialing','past_due','cancelled','canceled','expired','incomplete','incomplete_expired','unpaid','paused'));

create table if not exists public.student_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  study_points bigint not null default 0 check (study_points >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('study_session','quiz','mock_exam')),
  source_id uuid not null,
  points integer not null check (points > 0),
  description text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_kind, source_id)
);

create index if not exists student_point_events_user_created_idx
  on public.student_point_events(user_id, created_at desc);
create index if not exists student_stats_points_idx
  on public.student_stats(study_points desc);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz
);
alter table public.stripe_webhook_events alter column processed_at drop not null;

alter table public.student_stats enable row level security;
alter table public.student_point_events enable row level security;
alter table public.stripe_webhook_events enable row level security;
grant select on public.student_stats, public.student_point_events to authenticated;

drop policy if exists student_stats_select_own on public.student_stats;
create policy student_stats_select_own on public.student_stats
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists student_point_events_select_own on public.student_point_events;
create policy student_point_events_select_own on public.student_point_events
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.calculate_current_streak(target_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cursor_day date;
  streak integer := 0;
begin
  select max((completed_at at time zone 'UTC')::date)
    into cursor_day
    from public.study_sessions
    where user_id = target_user
      and completed_at is not null
      and (completed_at at time zone 'UTC')::date <= (current_timestamp at time zone 'UTC')::date;

  if cursor_day is null or cursor_day < (current_timestamp at time zone 'UTC')::date - 1 then
    return 0;
  end if;

  while exists (
    select 1 from public.study_sessions
    where user_id = target_user
      and completed_at is not null
      and (completed_at at time zone 'UTC')::date = cursor_day
  ) loop
    streak := streak + 1;
    cursor_day := cursor_day - 1;
  end loop;
  return streak;
end;
$$;

revoke all on function public.calculate_current_streak(uuid) from public;

create or replace function public.ensure_student_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_student_stats on public.profiles;
create trigger profiles_create_student_stats
after insert on public.profiles
for each row execute procedure public.ensure_student_stats();

insert into public.student_stats (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.award_study_session_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  award integer;
  inserted_count integer;
  streak integer;
begin
  if old.completed_at is not null or new.completed_at is null then return new; end if;
  award := least(70, 10 + ceil(new.duration_minutes::numeric / 5)::integer);

  insert into public.student_point_events (user_id, source_kind, source_id, points, description)
  values (new.user_id, 'study_session', new.id, award, 'Completed study session')
  on conflict (user_id, source_kind, source_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    streak := public.calculate_current_streak(new.user_id);
    insert into public.student_stats as current_stats (user_id, study_points, current_streak, longest_streak, updated_at)
    values (new.user_id, award, streak, streak, now())
    on conflict (user_id) do update set
      study_points = current_stats.study_points + excluded.study_points,
      current_streak = excluded.current_streak,
      longest_streak = greatest(current_stats.longest_streak, excluded.current_streak),
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists study_session_points on public.study_sessions;
create trigger study_session_points
after update on public.study_sessions
for each row execute procedure public.award_study_session_points();

create or replace function public.award_practice_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  set_kind text;
  award integer;
  event_kind text;
  event_description text;
  inserted_count integer;
begin
  select kind into set_kind from public.practice_sets where id = new.practice_set_id;
  if set_kind = 'quiz' then
    award := 25 + floor(new.score_percent * 0.25)::integer;
    event_kind := 'quiz';
    event_description := 'Completed quiz';
  elsif set_kind = 'mock_exam' then
    award := 75 + floor(new.score_percent * 0.75)::integer;
    event_kind := 'mock_exam';
    event_description := 'Completed mock exam';
  else
    return new;
  end if;

  insert into public.student_point_events (user_id, source_kind, source_id, points, description)
  values (new.user_id, event_kind, new.practice_set_id, award, event_description)
  on conflict (user_id, source_kind, source_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    insert into public.student_stats as current_stats (user_id, study_points, updated_at)
    values (new.user_id, award, now())
    on conflict (user_id) do update set
      study_points = current_stats.study_points + excluded.study_points,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists practice_result_points on public.practice_results;
create trigger practice_result_points
after insert on public.practice_results
for each row execute procedure public.award_practice_points();

-- Practice scores used by the multiplayer economy are calculated in the
-- database from the stored answer key. Browsers cannot submit arbitrary
-- percentages or create generated practice content directly.
drop policy if exists practice_sets_insert_own on public.practice_sets;
drop policy if exists practice_sets_update_own on public.practice_sets;
drop policy if exists practice_sets_delete_own on public.practice_sets;
drop policy if exists practice_results_insert_own on public.practice_results;
drop policy if exists practice_results_update_own on public.practice_results;
drop policy if exists practice_results_delete_own on public.practice_results;
revoke insert, update, delete on public.practice_sets, public.practice_results from authenticated;

create or replace function public.submit_practice_result(target_practice_set uuid, submitted_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_items jsonb;
  total_questions integer;
  correct_answers integer;
  calculated_score numeric(5,2);
  created_result uuid;
begin
  select items into stored_items
  from public.practice_sets
  where id = target_practice_set and user_id = auth.uid();

  if stored_items is null then raise exception 'Practice set not found'; end if;
  if jsonb_typeof(stored_items) <> 'array' or jsonb_array_length(stored_items) = 0 then
    raise exception 'Practice set has no scorable questions';
  end if;

  select count(*),
         count(*) filter (
           where submitted_answers ->> ((question_number - 1)::text) = question ->> 'correct_index'
         )
  into total_questions, correct_answers
  from jsonb_array_elements(stored_items) with ordinality as item(question, question_number);

  calculated_score := round((correct_answers::numeric / total_questions::numeric) * 100, 2);
  insert into public.practice_results (user_id, practice_set_id, score_percent, answers)
  values (auth.uid(), target_practice_set, calculated_score, coalesce(submitted_answers, '{}'::jsonb))
  returning id into created_result;
  return created_result;
end;
$$;

revoke all on function public.submit_practice_result(uuid, jsonb) from public;
grant execute on function public.submit_practice_result(uuid, jsonb) to authenticated;

-- Backfill legitimate activity that predates this migration. Unique source keys
-- keep the operation idempotent and prevent completion-toggle point farming.
insert into public.student_point_events (user_id, source_kind, source_id, points, description, created_at)
select user_id, 'study_session', id,
       least(70, 10 + ceil(duration_minutes::numeric / 5)::integer),
       'Completed study session', completed_at
from public.study_sessions
where completed_at is not null
on conflict (user_id, source_kind, source_id) do nothing;

insert into public.student_point_events (user_id, source_kind, source_id, points, description, created_at)
select distinct on (result.user_id, result.practice_set_id)
       result.user_id,
       case when practice.kind = 'mock_exam' then 'mock_exam' else 'quiz' end,
       result.practice_set_id,
       case when practice.kind = 'mock_exam'
         then 75 + floor(result.score_percent * 0.75)::integer
         else 25 + floor(result.score_percent * 0.25)::integer end,
       case when practice.kind = 'mock_exam' then 'Completed mock exam' else 'Completed quiz' end,
       result.completed_at
from public.practice_results result
join public.practice_sets practice on practice.id = result.practice_set_id
where practice.kind in ('quiz','mock_exam')
order by result.user_id, result.practice_set_id, result.completed_at asc
on conflict (user_id, source_kind, source_id) do nothing;

update public.student_stats stats
set study_points = totals.points,
    current_streak = public.calculate_current_streak(stats.user_id),
    longest_streak = greatest(stats.longest_streak, public.calculate_current_streak(stats.user_id)),
    updated_at = now()
from (
  select profile.id as user_id, coalesce(sum(event.points), 0)::bigint as points
  from public.profiles profile
  left join public.student_point_events event on event.user_id = profile.id
  group by profile.id
) totals
where stats.user_id = totals.user_id;

create or replace function public.get_study_leaderboard(entry_limit integer default 50)
returns table (
  position bigint,
  display_name text,
  study_points bigint,
  current_streak integer,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      profile.id,
      coalesce(nullif(split_part(profile.display_name, ' ', 1), ''), 'Student') as safe_name,
      stats.study_points,
      public.calculate_current_streak(profile.id) as streak,
      rank() over (order by stats.study_points desc, stats.updated_at asc) as place
    from public.profiles profile
    join public.student_stats stats on stats.user_id = profile.id
    where profile.leaderboard_visible
  )
  select place, safe_name, ranked.study_points, streak, ranked.id = auth.uid()
  from ranked
  order by place, safe_name
  limit greatest(1, least(coalesce(entry_limit, 50), 100));
$$;

create or replace function public.get_my_student_stats()
returns table (
  study_points bigint,
  current_streak integer,
  longest_streak integer,
  leaderboard_rank bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranks as (
    select stats.user_id, rank() over (order by stats.study_points desc, stats.updated_at asc) as place
    from public.student_stats stats
    join public.profiles profile on profile.id = stats.user_id
    where profile.leaderboard_visible
  )
  select stats.study_points,
         public.calculate_current_streak(stats.user_id),
         stats.longest_streak,
         ranks.place
  from public.student_stats stats
  left join ranks on ranks.user_id = stats.user_id
  where stats.user_id = auth.uid();
$$;

revoke all on function public.get_study_leaderboard(integer) from public;
revoke all on function public.get_my_student_stats() from public;
grant execute on function public.get_study_leaderboard(integer) to authenticated;
grant execute on function public.get_my_student_stats() to authenticated;

notify pgrst, 'reload schema';
