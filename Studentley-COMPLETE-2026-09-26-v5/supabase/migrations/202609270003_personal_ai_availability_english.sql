-- Personal AI, Pro Studio availability windows and English-only application
-- language. This repair is self-contained and safe to run more than once,
-- including when the earlier Pro Studio migration was not applied.

create extension if not exists pgcrypto;

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
  availability_kind text not null default 'busy',
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_schedule_entries
  add column if not exists availability_kind text not null default 'busy';

create index if not exists personal_schedule_user_day_idx
  on public.personal_schedule_entries(user_id, day_of_week, start_time);

do $$
begin
  if to_regclass('public.personal_schedule_entries') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'personal_schedule_availability_kind_check'
        and conrelid = 'public.personal_schedule_entries'::regclass
    ) then
      alter table public.personal_schedule_entries
        add constraint personal_schedule_availability_kind_check
        check (availability_kind in ('free', 'busy'));
    end if;
  end if;
end $$;

comment on column public.personal_schedule_entries.availability_kind is
  'free marks a preferred study window; busy blocks AI scheduling.';

alter table public.personal_contexts enable row level security;
alter table public.personal_schedule_entries enable row level security;

grant select, insert, update, delete on public.personal_contexts to authenticated;
grant select, insert, update, delete on public.personal_schedule_entries to authenticated;

drop policy if exists personal_contexts_pro_select on public.personal_contexts;
drop policy if exists personal_contexts_pro_insert on public.personal_contexts;
drop policy if exists personal_contexts_pro_update on public.personal_contexts;
drop policy if exists personal_contexts_pro_delete on public.personal_contexts;
create policy personal_contexts_pro_select on public.personal_contexts
  for select to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_contexts_pro_insert on public.personal_contexts
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_contexts_pro_update on public.personal_contexts
  for update to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_contexts_pro_delete on public.personal_contexts
  for delete to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );

drop policy if exists personal_schedule_pro_select on public.personal_schedule_entries;
drop policy if exists personal_schedule_pro_insert on public.personal_schedule_entries;
drop policy if exists personal_schedule_pro_update on public.personal_schedule_entries;
drop policy if exists personal_schedule_pro_delete on public.personal_schedule_entries;
create policy personal_schedule_pro_select on public.personal_schedule_entries
  for select to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_schedule_pro_insert on public.personal_schedule_entries
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_schedule_pro_update on public.personal_schedule_entries
  for update to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
    )
  );
create policy personal_schedule_pro_delete on public.personal_schedule_entries
  for delete to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.profiles
      where id = auth.uid() and subscription_plan = 'pro'
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

drop trigger if exists personal_contexts_touch on public.personal_contexts;
create trigger personal_contexts_touch
before update on public.personal_contexts
for each row execute procedure public.touch_personalization_updated_at();

drop trigger if exists personal_schedule_touch on public.personal_schedule_entries;
create trigger personal_schedule_touch
before update on public.personal_schedule_entries
for each row execute procedure public.touch_personalization_updated_at();

-- Keep the legacy column so older clients and existing rows remain compatible,
-- but make English the only accepted application language.
alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

update public.profiles set preferred_language = 'en'
where preferred_language is distinct from 'en';

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;

alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language = 'en');

alter table public.profiles
  alter column preferred_language set default 'en';

notify pgrst, 'reload schema';
