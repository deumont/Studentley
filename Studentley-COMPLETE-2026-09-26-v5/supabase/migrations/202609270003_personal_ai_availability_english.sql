-- Personal AI availability windows and English-only application language.
-- Safe to run more than once after the Pro Studio migration.

alter table if exists public.personal_schedule_entries
  add column if not exists availability_kind text not null default 'busy';

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
