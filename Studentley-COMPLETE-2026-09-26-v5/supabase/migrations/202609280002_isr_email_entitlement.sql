-- Require both an ISR school selection and a real five-digit ISR email for
-- the free Plus School entitlement. This also repairs older school-only grants.

alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists school_plan boolean not null default false;

create or replace function public.protect_profile_subscription_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_isr boolean;
  has_isr_email boolean := false;
  eligible_for_school_plan boolean;
  has_paid_plan boolean := false;
begin
  if tg_op = 'UPDATE'
     and auth.role() = 'authenticated'
     and new.subscription_plan is distinct from old.subscription_plan then
    raise exception 'Subscription plan is server managed';
  end if;

  selected_isr := upper(trim(coalesce(new.school, ''))) = 'ISR';

  select coalesce(lower(account.email) ~ '^[0-9]{5}@isr-school[.]de$' and account.email_confirmed_at is not null, false)
  into has_isr_email
  from auth.users as account
  where account.id = new.id;

  eligible_for_school_plan := selected_isr and coalesce(has_isr_email, false);
  new.school_plan := eligible_for_school_plan;

  if tg_op = 'INSERT' then
    if eligible_for_school_plan and coalesce(new.subscription_plan, 'free') = 'free' then
      new.subscription_plan := 'plus';
    end if;
    return new;
  end if;

  if eligible_for_school_plan and new.subscription_plan = 'free' then
    new.subscription_plan := 'plus';
  elsif not eligible_for_school_plan and old.school_plan and new.subscription_plan = 'plus' then
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

-- Recalculate the entitlement when an account email is changed.
create or replace function public.sync_isr_school_plan_on_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email
     or new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.profiles
    set school = school
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_isr_school_plan_after_email_change on auth.users;
create trigger sync_isr_school_plan_after_email_change
after update of email, email_confirmed_at on auth.users
for each row execute procedure public.sync_isr_school_plan_on_email_change();

-- Correct every existing profile, including school-only grants from the earlier migration.
update public.profiles set school = school;

notify pgrst, 'reload schema';
