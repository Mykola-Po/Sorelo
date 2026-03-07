create table if not exists public.evidences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  attached_to_type entity_type_t not null,
  attached_to_id uuid not null,
  kind evidence_kind_t not null,
  content text not null,
  source_meta jsonb not null default '{}'::jsonb,
  source_type source_type_t not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0
);

create table if not exists public.scenario_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  seed_node_id uuid,
  seed_cluster_id uuid,
  input_context text not null default '',
  result_text text not null default '',
  explanation_path jsonb not null default '[]'::jsonb,
  confidence_label scenario_confidence_t not null default 'medium',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0,
  constraint scenario_seed_present check (seed_node_id is not null or seed_cluster_id is not null),
  constraint scenario_seed_node_fk foreign key (seed_node_id, workspace_id)
    references public.nodes(id, workspace_id) on delete set null,
  constraint scenario_seed_cluster_fk foreign key (seed_cluster_id, workspace_id)
    references public.clusters(id, workspace_id) on delete set null
);

create table if not exists public.operation_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type entity_type_t not null,
  entity_id uuid not null,
  op_type op_type_t not null,
  payload jsonb not null default '{}'::jsonb,
  local_timestamp timestamptz not null default timezone('utc', now()),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  sync_status sync_status_t not null default 'pending',
  remote_timestamp timestamptz,
  conflict_flag boolean not null default false
);

create or replace function public.validate_evidence_attachment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  found_entity boolean := false;
begin
  if new.attached_to_type = 'node' then
    select exists (
      select 1 from public.nodes n
      where n.id = new.attached_to_id
        and n.workspace_id = new.workspace_id
    ) into found_entity;
  elsif new.attached_to_type = 'edge' then
    select exists (
      select 1 from public.edges e
      where e.id = new.attached_to_id
        and e.workspace_id = new.workspace_id
    ) into found_entity;
  elsif new.attached_to_type = 'cluster' then
    select exists (
      select 1 from public.clusters c
      where c.id = new.attached_to_id
        and c.workspace_id = new.workspace_id
    ) into found_entity;
  elsif new.attached_to_type = 'scenario_run' then
    select exists (
      select 1 from public.scenario_runs s
      where s.id = new.attached_to_id
        and s.workspace_id = new.workspace_id
    ) into found_entity;
  else
    found_entity := false;
  end if;

  if not found_entity then
    raise exception 'evidence attachment does not resolve to workspace entity';
  end if;

  return new;
end;
$$;

drop trigger if exists evidences_validate_attachment on public.evidences;
create trigger evidences_validate_attachment
before insert or update on public.evidences
for each row execute procedure public.validate_evidence_attachment();

create or replace function public.validate_operation_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and new.actor_id <> auth.uid() then
    raise exception 'actor_id must match authenticated user';
  end if;
  return new;
end;
$$;

drop trigger if exists operation_log_validate_actor on public.operation_log;
create trigger operation_log_validate_actor
before insert on public.operation_log
for each row execute procedure public.validate_operation_actor();
