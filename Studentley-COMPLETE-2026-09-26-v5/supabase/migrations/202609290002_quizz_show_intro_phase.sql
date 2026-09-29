-- Adds the synchronized spoken-question intro used by Rivals Quizz Show.
-- Safe to run more than once and safe for projects that ran the original party migration.

begin;

alter table if exists public.rival_study_parties
  drop constraint if exists rival_study_parties_phase_check;

alter table if exists public.rival_study_parties
  add constraint rival_study_parties_phase_check
  check (phase in ('waiting','intermission','intro','question','reveal','completed'));

notify pgrst, 'reload schema';

commit;
