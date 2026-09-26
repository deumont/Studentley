-- Repair partially initialized projects where the initial schema migration was
-- not applied (or public.profiles was removed). This migration is deliberately
-- idempotent so it is also safe after 202609250001_initial.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  date_of_birth date,
  grade_year text,
  school_system text,
  timezone text not null default 'UTC',
  daily_study_minutes integer not null default 45,
  preferred_study_time text not null default 'flexible',
  goals text[] not null default '{}',
  onboarding_complete boolean not null default false,
  theme_preference text not null default 'system',
  study_reminders boolean not null default false,
  exam_reminders boolean not null default true,
  achievement_notifications boolean not null default true,
  subscription_plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A partially created profiles table may be missing newer application fields.
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists grade_year text;
alter table public.profiles add column if not exists school_system text;
alter table public.profiles add column if not exists timezone text not null default 'UTC';
alter table public.profiles add column if not exists daily_study_minutes integer not null default 45;
alter table public.profiles add column if not exists preferred_study_time text not null default 'flexible';
alter table public.profiles add column if not exists goals text[] not null default '{}';
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists theme_preference text not null default 'system';
alter table public.profiles add column if not exists study_reminders boolean not null default false;
alter table public.profiles add column if not exists exam_reminders boolean not null default true;
alter table public.profiles add column if not exists achievement_notifications boolean not null default true;
alter table public.profiles add column if not exists subscription_plan text not null default 'free';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_daily_study_minutes_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_daily_study_minutes_check check (daily_study_minutes between 5 and 720);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_preference_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_theme_preference_check check (theme_preference in ('light', 'dark', 'system'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_subscription_plan_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_subscription_plan_check check (subscription_plan in ('free', 'plus', 'pro'));
  end if;
end $$;

alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own') then
    create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own') then
    create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_delete_own') then
    create policy profiles_delete_own on public.profiles for delete to authenticated using (auth.uid() = id);
  end if;
end $$;

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_repair_touch on public.profiles;
create trigger profiles_repair_touch
before update on public.profiles
for each row execute procedure public.touch_profile_updated_at();

create or replace function public.ensure_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, date_of_birth, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_profile_created' and tgrelid = 'auth.users'::regclass) then
    create trigger on_auth_user_profile_created
    after insert on auth.users
    for each row execute procedure public.ensure_new_user_profile();
  end if;
end $$;

-- Users created before this repair need a profile row too.
insert into public.profiles (id, display_name, timezone)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'display_name', ''),
  coalesce(users.raw_user_meta_data ->> 'timezone', 'UTC')
from auth.users as users
on conflict (id) do nothing;

create or replace function public.protect_profile_subscription_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' and new.subscription_plan is distinct from old.subscription_plan then
    raise exception 'Subscription plan is server managed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_repair_protect_plan on public.profiles;
create trigger profiles_repair_protect_plan
before update on public.profiles
for each row execute procedure public.protect_profile_subscription_plan();

notify pgrst, 'reload schema';
