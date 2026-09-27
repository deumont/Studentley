-- Reliable local-day streaks, leaderboard plan badges and language settings.
-- Safe to run more than once.

alter table public.profiles add column if not exists preferred_language text not null default 'en';
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists avatar_bucket text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_preferred_language_check
      check (preferred_language in ('en', 'de'));
  end if;
end $$;

-- A streak is any consecutive local calendar day on which the student earned
-- points from a completed study session, quiz or mock exam. A streak remains
-- active throughout the following day so it does not disappear each morning.
create or replace function public.calculate_current_streak(target_user uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_timezone text := 'UTC';
  today date;
  cursor_day date;
  streak integer := 0;
begin
  select coalesce(nullif(profile.timezone, ''), 'UTC')
  into target_timezone
  from public.profiles profile
  where profile.id = target_user;

  today := (current_timestamp at time zone target_timezone)::date;

  select max((event.created_at at time zone target_timezone)::date)
  into cursor_day
  from public.student_point_events event
  where event.user_id = target_user
    and (event.created_at at time zone target_timezone)::date <= today;

  if cursor_day is null or cursor_day < today - 1 then
    return 0;
  end if;

  while exists (
    select 1
    from public.student_point_events event
    where event.user_id = target_user
      and (event.created_at at time zone target_timezone)::date = cursor_day
  ) loop
    streak := streak + 1;
    cursor_day := cursor_day - 1;
  end loop;

  return streak;
end;
$$;

revoke all on function public.calculate_current_streak(uuid) from public;

create or replace function public.refresh_streak_after_point_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  refreshed_streak integer;
begin
  refreshed_streak := public.calculate_current_streak(new.user_id);
  insert into public.student_stats as current_stats
    (user_id, study_points, current_streak, longest_streak, updated_at)
  values (new.user_id, 0, refreshed_streak, refreshed_streak, now())
  on conflict (user_id) do update set
    current_streak = excluded.current_streak,
    longest_streak = greatest(current_stats.longest_streak, excluded.current_streak),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists point_events_refresh_streak on public.student_point_events;
create trigger point_events_refresh_streak
after insert on public.student_point_events
for each row execute procedure public.refresh_streak_after_point_event();

update public.student_stats stats
set current_streak = public.calculate_current_streak(stats.user_id),
    longest_streak = greatest(stats.longest_streak, public.calculate_current_streak(stats.user_id)),
    updated_at = now();

-- Keep existing avatars and allow signed-in members to view an avatar only
-- while its owner is visible on the leaderboard.
update public.profiles profile
set avatar_path = users.raw_user_meta_data ->> 'avatar_path',
    avatar_bucket = coalesce(nullif(users.raw_user_meta_data ->> 'avatar_bucket', ''), 'documents')
from auth.users users
where users.id = profile.id
  and nullif(users.raw_user_meta_data ->> 'avatar_path', '') is not null
  and split_part(users.raw_user_meta_data ->> 'avatar_path', '/', 1) = profile.id::text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_view_leaderboard_avatar(object_bucket text, object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    split_part(object_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.profiles profile
      where profile.leaderboard_visible
        and profile.avatar_path = object_name
        and profile.avatar_bucket = object_bucket
    )
  );
$$;

revoke all on function public.can_view_leaderboard_avatar(text, text) from public;
grant execute on function public.can_view_leaderboard_avatar(text, text) to authenticated;

drop policy if exists avatars_storage_select_members on storage.objects;
drop policy if exists avatars_storage_insert_own on storage.objects;
drop policy if exists avatars_storage_update_own on storage.objects;
drop policy if exists avatars_storage_delete_own on storage.objects;
create policy avatars_storage_select_members on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars' and public.can_view_leaderboard_avatar(bucket_id, name)
  );
create policy avatars_storage_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy avatars_storage_update_own on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy avatars_storage_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists legacy_profile_avatar_select_members on storage.objects;
create policy legacy_profile_avatar_select_members on storage.objects
  for select to authenticated using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = 'profile'
    and public.can_view_leaderboard_avatar(bucket_id, name)
  );

create or replace function public.get_study_leaderboard_v3(entry_limit integer default 50)
returns table (
  "position" bigint,
  display_name text,
  avatar_path text,
  avatar_bucket text,
  plan_badge text,
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
      profile.avatar_path,
      profile.avatar_bucket,
      case when profile.subscription_plan in ('plus', 'pro') then profile.subscription_plan else null end as plan_badge,
      stats.study_points,
      public.calculate_current_streak(profile.id) as streak,
      rank() over (order by stats.study_points desc, stats.updated_at asc) as place
    from public.profiles profile
    join public.student_stats stats on stats.user_id = profile.id
    where profile.leaderboard_visible
  )
  select place, safe_name, ranked.avatar_path, ranked.avatar_bucket, ranked.plan_badge,
         ranked.study_points, streak, ranked.id = auth.uid()
  from ranked
  order by place, safe_name
  limit greatest(1, least(coalesce(entry_limit, 50), 100));
$$;

revoke all on function public.get_study_leaderboard_v3(integer) from public;
grant execute on function public.get_study_leaderboard_v3(integer) to authenticated;

notify pgrst, 'reload schema';
