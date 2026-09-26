-- Repair stale completion triggers that can break document inserts with:
--   record "old" has no field "completed"
--
-- The application schema uses completed_at on tasks and study_sessions.
-- Documents do not have a completion column. This migration removes any
-- legacy trigger on those tables whose function still references completed,
-- replaces the canonical functions, and restores the expected triggers and
-- upload policies. It is safe to run more than once.

do $$
declare
  stale_trigger record;
begin
  for stale_trigger in
    select namespace.nspname as schema_name, relation.relname as table_name, trg.tgname as trigger_name
    from pg_trigger as trg
    join pg_class as relation on relation.oid = trg.tgrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    join pg_proc as proc on proc.oid = trg.tgfoid
    where not trg.tgisinternal
      and namespace.nspname = 'public'
      and relation.relname in ('documents', 'tasks', 'study_sessions')
      and lower(proc.prosrc) ~ '(^|[^a-z0-9_])(old|new)\.completed([^_a-z0-9]|$)'
  loop
    raise notice 'Dropping stale completion trigger %.%: %',
      stale_trigger.schema_name,
      stale_trigger.table_name,
      stale_trigger.trigger_name;
    execute format(
      'drop trigger if exists %I on %I.%I',
      stale_trigger.trigger_name,
      stale_trigger.schema_name,
      stale_trigger.table_name
    );
  end loop;
end $$;

create or replace function public.notify_real_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'documents' then
    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, kind, title, body, metadata)
      values (
        new.user_id,
        'upload',
        'Upload complete',
        new.name || ' is stored securely.',
        jsonb_build_object('document_id', new.id)
      );
    end if;
    return new;
  end if;

  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if tg_table_name = 'tasks' and old.completed_at is null and new.completed_at is not null then
    insert into public.notifications (user_id, kind, title, body, metadata)
    values (new.user_id, 'task', 'Task completed', new.title, jsonb_build_object('task_id', new.id));
  elsif tg_table_name = 'study_sessions' and old.completed_at is null and new.completed_at is not null then
    insert into public.notifications (user_id, kind, title, body, metadata)
    values (new.user_id, 'study', 'Study session completed', new.title, jsonb_build_object('session_id', new.id));
  end if;

  return new;
end;
$$;

create or replace function public.unlock_real_achievement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  achievement_code text;
  achievement_title text;
  completed_count integer;
  inserted_count integer;
begin
  if tg_op <> 'UPDATE' or old.completed_at is not null or new.completed_at is null then
    return new;
  end if;

  if tg_table_name = 'tasks' then
    achievement_code := 'FIRST_TASK';
    achievement_title := 'First task complete';
  elsif tg_table_name = 'study_sessions' then
    select count(*)
      into completed_count
      from public.study_sessions
      where user_id = new.user_id and completed_at is not null;

    if completed_count >= 5 then
      achievement_code := 'FIVE_SESSIONS';
      achievement_title := 'Five focused sessions';
    else
      achievement_code := 'FIRST_SESSION';
      achievement_title := 'First study session';
    end if;
  else
    return new;
  end if;

  insert into public.achievements (user_id, code, title)
  values (new.user_id, achievement_code, achievement_title)
  on conflict (user_id, code) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    insert into public.notifications (user_id, kind, title, body, metadata)
    values (
      new.user_id,
      'achievement',
      'Achievement unlocked',
      achievement_title,
      jsonb_build_object('code', achievement_code)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists document_event on public.documents;
create trigger document_event
after insert on public.documents
for each row execute procedure public.notify_real_event();

drop trigger if exists task_event on public.tasks;
create trigger task_event
after update on public.tasks
for each row execute procedure public.notify_real_event();

drop trigger if exists session_event on public.study_sessions;
create trigger session_event
after update on public.study_sessions
for each row execute procedure public.notify_real_event();

drop trigger if exists task_achievement on public.tasks;
create trigger task_achievement
after update on public.tasks
for each row execute procedure public.unlock_real_achievement();

drop trigger if exists session_achievement on public.study_sessions;
create trigger session_achievement
after update on public.study_sessions
for each row execute procedure public.unlock_real_achievement();

alter table public.documents enable row level security;
grant select, insert, update, delete on public.documents to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_select_own') then
    create policy documents_select_own on public.documents for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_insert_own') then
    create policy documents_insert_own on public.documents for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_update_own') then
    create policy documents_update_own on public.documents for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_delete_own') then
    create policy documents_delete_own on public.documents for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_storage_select') then
    create policy documents_storage_select on storage.objects
      for select to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_storage_insert') then
    create policy documents_storage_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_storage_delete') then
    create policy documents_storage_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

notify pgrst, 'reload schema';
