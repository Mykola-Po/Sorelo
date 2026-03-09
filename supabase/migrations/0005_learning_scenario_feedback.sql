do $$
begin
  create type learning.scenario_run_feedback_verdict as enum (
    'useful',
    'partly_useful',
    'wrong'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.scenario_step_feedback_verdict as enum (
    'correct',
    'overstated',
    'wrong_link',
    'missing_context',
    'wrong_effect'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists learning.scenario_run_feedback (
  id uuid primary key default gen_random_uuid(),
  scenario_run_id uuid not null references public.scenario_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  reviewer_user_id uuid not null references public.users(id) on delete restrict,
  overall_score integer not null,
  verdict learning.scenario_run_feedback_verdict not null,
  feedback_text text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists learning.scenario_step_feedback (
  id uuid primary key default gen_random_uuid(),
  scenario_run_step_id uuid not null references public.scenario_run_steps(id) on delete cascade,
  scenario_run_id uuid not null references public.scenario_runs(id) on delete cascade,
  verdict learning.scenario_step_feedback_verdict not null,
  corrected_explanation text,
  corrected_score integer,
  reviewer_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists learning_scenario_run_feedback_run_reviewer_key
  on learning.scenario_run_feedback(scenario_run_id, reviewer_user_id);
create unique index if not exists learning_scenario_step_feedback_step_reviewer_key
  on learning.scenario_step_feedback(scenario_run_step_id, reviewer_user_id);

revoke all on learning.scenario_run_feedback from public;
revoke all on learning.scenario_run_feedback from anon;
revoke all on learning.scenario_run_feedback from authenticated;
revoke all on learning.scenario_step_feedback from public;
revoke all on learning.scenario_step_feedback from anon;
revoke all on learning.scenario_step_feedback from authenticated;
grant select, insert, update, delete on learning.scenario_run_feedback to service_role;
grant select, insert, update, delete on learning.scenario_step_feedback to service_role;
