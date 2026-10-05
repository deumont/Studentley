-- Replace the old task list with reusable study topics.
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents add column if not exists topic_id uuid references public.topics(id) on delete set null;
alter table public.practice_sets add column if not exists topic_id uuid references public.topics(id) on delete set null;

create index if not exists topics_user_created_idx on public.topics(user_id, created_at desc);
create index if not exists documents_topic_idx on public.documents(topic_id, created_at desc);
create index if not exists practice_sets_topic_idx on public.practice_sets(topic_id, created_at desc);

drop trigger if exists topics_touch on public.topics;
create trigger topics_touch before update on public.topics for each row execute procedure public.touch_updated_at();

alter table public.topics enable row level security;
drop policy if exists topics_select_own on public.topics;
drop policy if exists topics_insert_own on public.topics;
drop policy if exists topics_update_own on public.topics;
drop policy if exists topics_delete_own on public.topics;
create policy topics_select_own on public.topics for select using (auth.uid() = user_id);
create policy topics_insert_own on public.topics for insert with check (auth.uid() = user_id);
create policy topics_update_own on public.topics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy topics_delete_own on public.topics for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.topics to authenticated;

-- Preserve the user's old task titles as topics. The task rows remain as a safe backup.
insert into public.topics(user_id, subject_id, title, description, created_at)
select task.user_id, task.subject_id, task.title, task.notes, task.created_at
from public.tasks task
where not exists (
  select 1 from public.topics topic
  where topic.user_id = task.user_id and lower(topic.title) = lower(task.title)
);

notify pgrst, 'reload schema';
