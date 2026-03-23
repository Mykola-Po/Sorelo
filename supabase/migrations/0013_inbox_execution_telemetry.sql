do $$
begin
  create type app_private.inbox_pipeline_attempt_trigger_kind as enum (
    'manual_process',
    'clarification_rerun'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_pipeline_run_status as enum (
    'running',
    'completed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_execution_failure_code as enum (
    'conflict',
    'validation',
    'persistence',
    'pipeline',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists app_private.inbox_pipeline_attempts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  attempt_no integer not null,
  trigger_kind app_private.inbox_pipeline_attempt_trigger_kind not null,
  runner_kind varchar(64) not null,
  status app_private.inbox_pipeline_run_status not null default 'running',
  route app_private.inbox_route,
  reason text,
  failure_code app_private.inbox_execution_failure_code,
  failure_message text,
  clarification_request_id uuid references app_private.clarification_requests(id) on delete set null,
  clarification_answer_id uuid references app_private.clarification_answers(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  latency_ms integer,
  constraint inbox_pipeline_attempts_item_attempt_key unique (item_id, attempt_no)
);

create table if not exists app_private.inbox_step_runs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references app_private.inbox_pipeline_attempts(id) on delete cascade,
  step_name varchar(64) not null,
  step_order integer not null,
  run_no integer not null default 1,
  status app_private.inbox_pipeline_run_status not null default 'running',
  model_name varchar(160),
  prompt_version varchar(64),
  route app_private.inbox_route,
  reason text,
  input_hash varchar(128),
  output_hash varchar(128),
  failure_code app_private.inbox_execution_failure_code,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  latency_ms integer,
  constraint inbox_step_runs_attempt_step_run_key unique (attempt_id, step_order, run_no)
);

create index if not exists inbox_pipeline_attempts_item_attempt_idx
  on app_private.inbox_pipeline_attempts(item_id, attempt_no desc);

create index if not exists inbox_pipeline_attempts_status_started_idx
  on app_private.inbox_pipeline_attempts(status, started_at desc);

create index if not exists inbox_pipeline_attempts_failure_started_idx
  on app_private.inbox_pipeline_attempts(failure_code, started_at desc);

create index if not exists inbox_step_runs_attempt_step_idx
  on app_private.inbox_step_runs(attempt_id, step_order, run_no);

create index if not exists inbox_step_runs_status_started_idx
  on app_private.inbox_step_runs(status, started_at desc);

create index if not exists inbox_step_runs_failure_started_idx
  on app_private.inbox_step_runs(failure_code, started_at desc);

insert into app_private.app_migrations (version)
values ('0013_inbox_execution_telemetry.sql')
on conflict (version) do nothing;
