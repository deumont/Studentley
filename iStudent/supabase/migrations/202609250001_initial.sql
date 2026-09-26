-- Studentley production schema. Apply with `supabase db push`.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', date_of_birth date, grade_year text, school_system text,
  timezone text not null default 'UTC', daily_study_minutes integer not null default 45 check (daily_study_minutes between 5 and 720),
  preferred_study_time text not null default 'flexible', goals text[] not null default '{}', onboarding_complete boolean not null default false,
  theme_preference text not null default 'system' check (theme_preference in ('light','dark','system')),
  study_reminders boolean not null default false, exam_reminders boolean not null default true,
  achievement_notifications boolean not null default true, subscription_plan text not null default 'free' check (subscription_plan in ('free','plus','pro')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80), color text not null default '#2692f5', icon text not null default 'book',
  archived_at timestamptz, created_at timestamptz not null default now(), unique(user_id, name)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null, title text not null check (char_length(title) between 1 and 180),
  notes text, due_at timestamptz, priority text not null default 'medium' check (priority in ('low','medium','high')),
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.exams (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null, title text not null check (char_length(title) between 1 and 180),
  exam_at timestamptz not null, paper text, topics text[] not null default '{}', notes text,
  preparation_progress integer not null default 0 check (preparation_progress between 0 and 100), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null, title text not null check (char_length(title) between 1 and 180),
  starts_at timestamptz not null, duration_minutes integer not null default 45 check (duration_minutes between 5 and 480),
  notes text, material_document_id uuid, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade, day_of_week integer not null check (day_of_week between 1 and 7),
  start_time time not null, end_time time not null, classroom text, created_at timestamptz not null default now(), check (end_time > start_time)
);
create table public.documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null, name text not null, storage_path text not null unique,
  mime_type text not null, size_bytes bigint not null check (size_bytes between 1 and 26214400),
  category text not null default 'study_material' check (category in ('study_material','timetable','exam_schedule','notes')),
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.study_sessions add constraint study_sessions_material_fkey foreign key (material_document_id) references public.documents(id) on delete set null;
create table public.practice_sets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null, document_id uuid references public.documents(id) on delete set null,
  title text not null, kind text not null check (kind in ('quiz','flashcards','mock_exam')), config jsonb not null default '{}', items jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create table public.practice_results (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  practice_set_id uuid not null references public.practice_sets(id) on delete cascade, score_percent numeric(5,2) not null check (score_percent between 0 and 100),
  answers jsonb not null default '{}', completed_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'info', title text not null, body text not null, metadata jsonb not null default '{}', read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.achievements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  code text not null, title text not null, earned_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(user_id, code)
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique, stripe_subscription_id text unique, plan text not null default 'free' check (plan in ('free','plus','pro')),
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled','canceled','expired','incomplete','unpaid')),
  current_period_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.usage_counters (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('uploads','quizzes','mock_exams','ai_requests')), period_start date not null,
  count integer not null default 0 check (count >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, metric, period_start)
);

create index on public.tasks(user_id, due_at); create index on public.exams(user_id, exam_at); create index on public.study_sessions(user_id, starts_at);
create index on public.documents(user_id, created_at); create index on public.notifications(user_id, read_at); create index on public.timetable_entries(user_id, day_of_week);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, date_of_birth, timezone)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'date_of_birth','')::date, coalesce(new.raw_user_meta_data->>'timezone','UTC'));
  insert into public.subscriptions(user_id, plan, status) values(new.id, 'free', 'active');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger tasks_touch before update on public.tasks for each row execute procedure public.touch_updated_at();
create trigger exams_touch before update on public.exams for each row execute procedure public.touch_updated_at();
create trigger sessions_touch before update on public.study_sessions for each row execute procedure public.touch_updated_at();
create trigger documents_touch before update on public.documents for each row execute procedure public.touch_updated_at();

create or replace function public.notify_real_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'documents' and tg_op = 'INSERT' then insert into notifications(user_id,kind,title,body,metadata) values(new.user_id,'upload','Upload complete',new.name || ' is stored securely.',jsonb_build_object('document_id',new.id)); end if;
  if tg_table_name = 'tasks' and tg_op = 'UPDATE' and old.completed_at is null and new.completed_at is not null then insert into notifications(user_id,kind,title,body,metadata) values(new.user_id,'task','Task completed',new.title,jsonb_build_object('task_id',new.id)); end if;
  if tg_table_name = 'study_sessions' and tg_op = 'UPDATE' and old.completed_at is null and new.completed_at is not null then insert into notifications(user_id,kind,title,body,metadata) values(new.user_id,'study','Study session completed',new.title,jsonb_build_object('session_id',new.id)); end if;
  return new;
end; $$;
create trigger document_event after insert on public.documents for each row execute procedure public.notify_real_event();
create trigger task_event after update on public.tasks for each row execute procedure public.notify_real_event();
create trigger session_event after update on public.study_sessions for each row execute procedure public.notify_real_event();

create or replace function public.unlock_real_achievement() returns trigger language plpgsql security definer set search_path = public as $$
declare achievement_code text; achievement_title text; completed_count integer; inserted_count integer;
begin
  if old.completed_at is not null or new.completed_at is null then return new; end if;
  if tg_table_name = 'tasks' then achievement_code := 'FIRST_TASK'; achievement_title := 'First task complete'; end if;
  if tg_table_name = 'study_sessions' then
    select count(*) into completed_count from study_sessions where user_id = new.user_id and completed_at is not null;
    if completed_count >= 5 then achievement_code := 'FIVE_SESSIONS'; achievement_title := 'Five focused sessions';
    else achievement_code := 'FIRST_SESSION'; achievement_title := 'First study session'; end if;
  end if;
  insert into achievements(user_id,code,title) values(new.user_id,achievement_code,achievement_title) on conflict(user_id,code) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then insert into notifications(user_id,kind,title,body,metadata) values(new.user_id,'achievement','Achievement unlocked',achievement_title,jsonb_build_object('code',achievement_code)); end if;
  return new;
end; $$;
create trigger task_achievement after update on public.tasks for each row execute procedure public.unlock_real_achievement();
create trigger session_achievement after update on public.study_sessions for each row execute procedure public.unlock_real_achievement();

create or replace function public.delete_own_account() returns void language plpgsql security definer set search_path = public as $$ begin delete from auth.users where id = auth.uid(); end; $$;
revoke all on function public.delete_own_account() from public; grant execute on function public.delete_own_account() to authenticated;

alter table public.profiles enable row level security; alter table public.subjects enable row level security; alter table public.tasks enable row level security;
alter table public.exams enable row level security; alter table public.study_sessions enable row level security; alter table public.timetable_entries enable row level security;
alter table public.documents enable row level security; alter table public.practice_sets enable row level security; alter table public.practice_results enable row level security;
alter table public.notifications enable row level security; alter table public.achievements enable row level security; alter table public.subscriptions enable row level security; alter table public.usage_counters enable row level security;

do $$ declare t text; begin
  foreach t in array array['profiles','subjects','tasks','exams','study_sessions','timetable_entries','documents','practice_sets','practice_results','notifications','achievements'] loop
    execute format('create policy %I on public.%I for select using (auth.uid() = %s)', t || '_select_own', t, case when t = 'profiles' then 'id' else 'user_id' end);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = %s)', t || '_insert_own', t, case when t = 'profiles' then 'id' else 'user_id' end);
    execute format('create policy %I on public.%I for update using (auth.uid() = %s) with check (auth.uid() = %s)', t || '_update_own', t, case when t = 'profiles' then 'id' else 'user_id' end, case when t = 'profiles' then 'id' else 'user_id' end);
    execute format('create policy %I on public.%I for delete using (auth.uid() = %s)', t || '_delete_own', t, case when t = 'profiles' then 'id' else 'user_id' end);
  end loop;
end $$;

create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);
create policy usage_counters_select_own on public.usage_counters for select using (auth.uid() = user_id);

create or replace function public.protect_profile_plan() returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' and new.subscription_plan is distinct from old.subscription_plan then
    raise exception 'Subscription plan is server managed';
  end if;
  return new;
end; $$;
create trigger profiles_protect_plan before update on public.profiles for each row execute procedure public.protect_profile_plan();

create or replace function public.consume_weekly_usage(requested_metric text) returns integer language plpgsql security definer set search_path = public as $$
declare current_plan text; plan_limit integer; used integer; week_start date := date_trunc('week', now())::date;
begin
  if requested_metric not in ('uploads','quizzes','mock_exams','ai_requests') then raise exception 'Invalid usage metric'; end if;
  select subscription_plan into current_plan from profiles where id = auth.uid();
  plan_limit := case requested_metric when 'uploads' then case current_plan when 'free' then 3 when 'plus' then 7 else null end when 'quizzes' then case current_plan when 'free' then 5 when 'plus' then 30 else null end when 'mock_exams' then case current_plan when 'free' then 1 when 'plus' then 5 else null end else case current_plan when 'free' then 10 when 'plus' then 100 else 300 end end;
  insert into usage_counters(user_id,metric,period_start,count) values(auth.uid(),requested_metric,week_start,1)
    on conflict(user_id,metric,period_start) do update set count=usage_counters.count+1,updated_at=now() returning count into used;
  if plan_limit is not null and used > plan_limit then
    update usage_counters set count=count-1 where user_id=auth.uid() and metric=requested_metric and period_start=week_start;
    raise exception 'Weekly usage limit reached';
  end if;
  return used;
end; $$;
revoke all on function public.consume_weekly_usage(text) from public; grant execute on function public.consume_weekly_usage(text) to authenticated;
create or replace function public.enforce_upload_limit() returns trigger language plpgsql security definer set search_path = public as $$ begin perform consume_weekly_usage('uploads'); return new; end; $$;
create trigger documents_usage_limit before insert on public.documents for each row execute procedure public.enforce_upload_limit();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('documents','documents',false,26214400,array['application/pdf','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/jpeg','image/png']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy documents_storage_select on storage.objects for select to authenticated using (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy documents_storage_insert on storage.objects for insert to authenticated with check (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy documents_storage_delete on storage.objects for delete to authenticated using (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
