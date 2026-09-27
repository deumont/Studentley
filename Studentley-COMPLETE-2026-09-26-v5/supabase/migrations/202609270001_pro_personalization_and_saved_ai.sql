-- Saved document AI results, leaderboard avatars, and Pro personalization.
-- This migration is idempotent and safe to run more than once.

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists avatar_bucket text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_path_own_folder_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_avatar_path_own_folder_check
      check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_bucket_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_avatar_bucket_check
      check (avatar_bucket is null or avatar_bucket in ('avatars', 'documents'));
  end if;
end $$;

-- Preserve profile pictures uploaded before the dedicated avatars bucket
-- existed. Only files in the old /profile/ folder are exposed to members.
update public.profiles profile
set avatar_path = users.raw_user_meta_data ->> 'avatar_path',
    avatar_bucket = coalesce(nullif(users.raw_user_meta_data ->> 'avatar_bucket', ''), 'documents')
from auth.users users
where users.id = profile.id
  and nullif(users.raw_user_meta_data ->> 'avatar_path', '') is not null
  and split_part(users.raw_user_meta_data ->> 'avatar_path', '/', 1) = profile.id::text
  and (
    users.raw_user_meta_data ->> 'avatar_bucket' = 'avatars'
    or split_part(users.raw_user_meta_data ->> 'avatar_path', '/', 2) = 'profile'
  );

create table if not exists public.document_ai_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  operation text not null check (operation in ('analysis', 'summary')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, operation)
);

create index if not exists document_ai_results_user_document_idx
  on public.document_ai_results(user_id, document_id);

create table if not exists public.personal_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  about_me text not null default '',
  learning_preferences text not null default '',
  study_goals text not null default '',
  routine_notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.personal_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'other'
    check (category in ('school', 'sleep', 'sport', 'meal', 'travel', 'other')),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_schedule_user_day_idx
  on public.personal_schedule_entries(user_id, day_of_week, start_time);

alter table public.document_ai_results enable row level security;
alter table public.personal_contexts enable row level security;
alter table public.personal_schedule_entries enable row level security;

grant select on public.document_ai_results to authenticated;
grant select, insert, update, delete on public.personal_contexts to authenticated;
grant select, insert, update, delete on public.personal_schedule_entries to authenticated;

drop policy if exists document_ai_results_select_own on public.document_ai_results;
create policy document_ai_results_select_own on public.document_ai_results
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists personal_contexts_pro_select on public.personal_contexts;
drop policy if exists personal_contexts_pro_insert on public.personal_contexts;
drop policy if exists personal_contexts_pro_update on public.personal_contexts;
drop policy if exists personal_contexts_pro_delete on public.personal_contexts;
create policy personal_contexts_pro_select on public.personal_contexts
  for select to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_contexts_pro_insert on public.personal_contexts
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_contexts_pro_update on public.personal_contexts
  for update to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_contexts_pro_delete on public.personal_contexts
  for delete to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );

drop policy if exists personal_schedule_pro_select on public.personal_schedule_entries;
drop policy if exists personal_schedule_pro_insert on public.personal_schedule_entries;
drop policy if exists personal_schedule_pro_update on public.personal_schedule_entries;
drop policy if exists personal_schedule_pro_delete on public.personal_schedule_entries;
create policy personal_schedule_pro_select on public.personal_schedule_entries
  for select to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_schedule_pro_insert on public.personal_schedule_entries
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_schedule_pro_update on public.personal_schedule_entries
  for update to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_schedule_pro_delete on public.personal_schedule_entries
  for delete to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles where id = auth.uid() and subscription_plan = 'pro'
    )
  );

create or replace function public.touch_personalization_updated_at()
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
for each row execute procedure public.touch_personalization_updated_at();

drop trigger if exists personal_contexts_touch on public.personal_contexts;
create trigger personal_contexts_touch
before update on public.personal_contexts
for each row execute procedure public.touch_personalization_updated_at();

drop trigger if exists personal_schedule_touch on public.personal_schedule_entries;
create trigger personal_schedule_touch
before update on public.personal_schedule_entries
for each row execute procedure public.touch_personalization_updated_at();

-- Only authenticated Studentley members can view leaderboard avatars. Owners
-- alone can upload, replace, or delete objects in their UUID folder.
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

-- A versioned RPC avoids changing the existing function's return type while
-- older clients may still be using it.
create or replace function public.get_study_leaderboard_v2(entry_limit integer default 50)
returns table (
  "position" bigint,
  display_name text,
  avatar_path text,
  avatar_bucket text,
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
      stats.study_points,
      public.calculate_current_streak(profile.id) as streak,
      rank() over (order by stats.study_points desc, stats.updated_at asc) as place
    from public.profiles profile
    join public.student_stats stats on stats.user_id = profile.id
    where profile.leaderboard_visible
  )
  select place, safe_name, ranked.avatar_path, ranked.avatar_bucket, ranked.study_points, streak, ranked.id = auth.uid()
  from ranked
  order by place, safe_name
  limit greatest(1, least(coalesce(entry_limit, 50), 100));
$$;

revoke all on function public.get_study_leaderboard_v2(integer) from public;
grant execute on function public.get_study_leaderboard_v2(integer) to authenticated;

create or replace function public.enforce_pro_study_reminders()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.study_reminders and coalesce(new.subscription_plan, 'free') <> 'pro' then
    if auth.role() = 'authenticated' and new.study_reminders is distinct from old.study_reminders then
      raise exception 'Study reminders require the Pro plan';
    end if;
    new.study_reminders := false;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_pro_study_reminders on public.profiles;
create trigger profiles_enforce_pro_study_reminders
before update on public.profiles
for each row execute procedure public.enforce_pro_study_reminders();

update public.profiles
set study_reminders = false
where subscription_plan <> 'pro' and study_reminders;

-- Create an in-app reminder for Pro students shortly before a study session.
-- The client calls this when the workspace loads; the unique metadata check
-- prevents duplicate reminders.
create or replace function public.create_due_study_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer := 0;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and subscription_plan = 'pro' and study_reminders
  ) then
    return 0;
  end if;

  insert into public.notifications (user_id, kind, title, body, metadata)
  select
    session.user_id,
    'study',
    'Study session starts soon',
    session.title || ' starts at ' || to_char(session.starts_at at time zone profile.timezone, 'HH24:MI') || '.',
    jsonb_build_object('session_id', session.id, 'reminder', true)
  from public.study_sessions session
  join public.profiles profile on profile.id = session.user_id
  where session.user_id = auth.uid()
    and session.completed_at is null
    and session.starts_at > now()
    and session.starts_at <= now() + interval '30 minutes'
    and not exists (
      select 1 from public.notifications notification
      where notification.user_id = session.user_id
        and notification.metadata ->> 'session_id' = session.id::text
        and notification.metadata ->> 'reminder' = 'true'
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.create_due_study_reminders() from public;
grant execute on function public.create_due_study_reminders() to authenticated;

notify pgrst, 'reload schema';
