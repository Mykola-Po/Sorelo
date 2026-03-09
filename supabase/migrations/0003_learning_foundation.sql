create schema if not exists learning;

revoke all on schema learning from public;
revoke all on schema learning from anon;
revoke all on schema learning from authenticated;
grant usage on schema learning to service_role;

alter default privileges in schema learning revoke all on tables from public;
alter default privileges in schema learning revoke all on tables from anon;
alter default privileges in schema learning revoke all on tables from authenticated;
alter default privileges in schema learning grant select, insert, update, delete on tables to service_role;

do $$
begin
  create type public.entity_origin_type as enum ('manual', 'ai_suggested', 'imported');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.source_fragment_type as enum (
    'manual_note',
    'import',
    'chat',
    'scenario_prompt',
    'observation'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.suggestion_batch_type as enum (
    'extract',
    'link',
    'retype',
    'scenario_seed',
    'scenario_eval'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.suggestion_batch_status as enum (
    'pending',
    'completed',
    'failed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.suggestion_type as enum (
    'create_concept',
    'update_concept',
    'create_link',
    'update_link',
    'create_scenario_seed',
    'scenario_hypothesis'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.suggestion_target_entity_type as enum (
    'concept',
    'link',
    'scenario',
    'map',
    'none'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.suggestion_resolution_type as enum (
    'accepted',
    'rejected',
    'edited',
    'split',
    'merged',
    'retyped',
    'relinked',
    'confidence_changed',
    'context_limited'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists learning.source_fragments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  author_user_id uuid references public.users(id) on delete set null,
  source_type learning.source_fragment_type not null,
  raw_text text not null,
  normalized_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists learning.suggestion_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  initiated_by_user_id uuid references public.users(id) on delete set null,
  batch_type learning.suggestion_batch_type not null,
  model_name varchar(160) not null,
  model_version varchar(64) not null,
  prompt_version varchar(64) not null,
  input_hash varchar(128) not null,
  status learning.suggestion_batch_status not null default 'pending',
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists learning.suggestions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references learning.suggestion_batches(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  source_fragment_id uuid references learning.source_fragments(id) on delete set null,
  suggestion_type learning.suggestion_type not null,
  target_entity_type learning.suggestion_target_entity_type not null default 'none',
  target_entity_id uuid,
  proposed_payload jsonb not null default '{}'::jsonb,
  rationale text,
  confidence double precision,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists learning.suggestion_resolutions (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references learning.suggestions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid references public.maps(id) on delete set null,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  resolution_type learning.suggestion_resolution_type not null,
  before_payload jsonb not null default '{}'::jsonb,
  after_payload jsonb not null default '{}'::jsonb,
  reason_text text,
  latency_ms integer,
  resolved_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_source_fragments_workspace_created_idx
  on learning.source_fragments(workspace_id, created_at desc);
create index if not exists learning_source_fragments_map_created_idx
  on learning.source_fragments(map_id, created_at desc);
create index if not exists learning_suggestion_batches_workspace_started_idx
  on learning.suggestion_batches(workspace_id, started_at desc);
create index if not exists learning_suggestion_batches_map_started_idx
  on learning.suggestion_batches(map_id, started_at desc);
create index if not exists learning_suggestion_batches_type_started_idx
  on learning.suggestion_batches(batch_type, started_at desc);
create index if not exists learning_suggestion_batches_input_hash_idx
  on learning.suggestion_batches(input_hash);
create index if not exists learning_suggestions_batch_created_idx
  on learning.suggestions(batch_id, created_at);
create index if not exists learning_suggestions_workspace_created_idx
  on learning.suggestions(workspace_id, created_at desc);
create index if not exists learning_suggestions_map_created_idx
  on learning.suggestions(map_id, created_at desc);
create index if not exists learning_suggestions_target_entity_idx
  on learning.suggestions(target_entity_type, target_entity_id);
create unique index if not exists learning_suggestion_resolutions_suggestion_key
  on learning.suggestion_resolutions(suggestion_id);
create index if not exists learning_suggestion_resolutions_workspace_resolved_idx
  on learning.suggestion_resolutions(workspace_id, resolved_at desc);
create index if not exists learning_suggestion_resolutions_map_resolved_idx
  on learning.suggestion_resolutions(map_id, resolved_at desc);
create index if not exists learning_suggestion_resolutions_type_resolved_idx
  on learning.suggestion_resolutions(resolution_type, resolved_at desc);

alter table public.concepts
  add column if not exists origin_type public.entity_origin_type not null default 'manual',
  add column if not exists origin_suggestion_id uuid;

alter table public.links
  add column if not exists origin_type public.entity_origin_type not null default 'manual',
  add column if not exists origin_suggestion_id uuid;

alter table public.scenarios
  add column if not exists origin_type public.entity_origin_type not null default 'manual',
  add column if not exists origin_suggestion_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'concepts_origin_suggestion_fk'
      and conrelid = 'public.concepts'::regclass
  ) then
    alter table public.concepts
      add constraint concepts_origin_suggestion_fk
      foreign key (origin_suggestion_id)
      references learning.suggestions(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'links_origin_suggestion_fk'
      and conrelid = 'public.links'::regclass
  ) then
    alter table public.links
      add constraint links_origin_suggestion_fk
      foreign key (origin_suggestion_id)
      references learning.suggestions(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scenarios_origin_suggestion_fk'
      and conrelid = 'public.scenarios'::regclass
  ) then
    alter table public.scenarios
      add constraint scenarios_origin_suggestion_fk
      foreign key (origin_suggestion_id)
      references learning.suggestions(id)
      on delete set null;
  end if;
end $$;

revoke all on all tables in schema learning from public;
revoke all on all tables in schema learning from anon;
revoke all on all tables in schema learning from authenticated;
grant select, insert, update, delete on all tables in schema learning to service_role;
