-- Allow focused explanations to be saved alongside the other generated topic resources.
alter table public.practice_sets drop constraint if exists practice_sets_kind_check;
alter table public.practice_sets add constraint practice_sets_kind_check
check (kind in ('quiz', 'flashcards', 'mock_exam', 'visual_explanation', 'topic_summary'));

notify pgrst, 'reload schema';
