-- School selection, ISR Plus School entitlement, and saved visual explanations.
-- Safe to run more than once on an existing Studentley database.

alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists school_plan boolean not null default false;

create or replace function public.protect_profile_subscription_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_isr boolean;
  has_paid_plan boolean := false;
begin
  -- A signed-in browser may choose a school, but may never set its own plan.
  if tg_op = 'UPDATE'
     and auth.role() = 'authenticated'
     and new.subscription_plan is distinct from old.subscription_plan then
    raise exception 'Subscription plan is server managed';
  end if;

  is_isr := upper(trim(coalesce(new.school, ''))) = 'ISR';
  new.school_plan := is_isr;

  if tg_op = 'INSERT' then
    if is_isr and coalesce(new.subscription_plan, 'free') = 'free' then
      new.subscription_plan := 'plus';
    end if;
    return new;
  end if;

  -- ISR is a permanent minimum entitlement, including after a paid plan ends.
  if is_isr and new.subscription_plan = 'free' then
    new.subscription_plan := 'plus';
  end if;

  if auth.role() = 'authenticated' then
    if not is_isr and old.school_plan and old.subscription_plan = 'plus' then
      select exists (
        select 1
        from public.subscriptions
        where user_id = old.id
          and plan in ('plus', 'pro')
          and status in ('active', 'trialing')
          and stripe_subscription_id is not null
      ) into has_paid_plan;
      if not has_paid_plan then new.subscription_plan := 'free'; end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_repair_protect_plan on public.profiles;
drop trigger if exists profiles_school_plan_guard on public.profiles;
create trigger profiles_school_plan_guard
before insert or update on public.profiles
for each row execute procedure public.protect_profile_subscription_plan();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, date_of_birth, timezone, school)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC'),
    nullif(new.raw_user_meta_data ->> 'school', '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_profile_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Backfill the school saved in auth metadata for accounts created before this migration.
update public.profiles as profile
set school = nullif(account.raw_user_meta_data ->> 'school', '')
from auth.users as account
where profile.id = account.id
  and profile.school is null
  and nullif(account.raw_user_meta_data ->> 'school', '') is not null;

update public.profiles
set school_plan = true,
    subscription_plan = case when subscription_plan = 'free' then 'plus' else subscription_plan end
where upper(trim(coalesce(school, ''))) = 'ISR';

alter table public.practice_sets drop constraint if exists practice_sets_kind_check;
alter table public.practice_sets add constraint practice_sets_kind_check
check (kind in ('quiz', 'flashcards', 'mock_exam', 'visual_explanation'));

notify pgrst, 'reload schema';
