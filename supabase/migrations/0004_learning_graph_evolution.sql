do $$
begin
  create type learning.map_version_trigger_type as enum (
    'manual_edit',
    'suggestion_resolution',
    'scenario_feedback',
    'import',
    'system_rebuild'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.lineage_entity_type as enum (
    'concept',
    'link',
    'scenario'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.lineage_transition_type as enum (
    'split',
    'merge',
    'rename',
    'retype',
    'archive',
    'restore'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists learning.map_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  version_no integer not null,
  trigger_type learning.map_version_trigger_type not null,
  actor_user_id uuid references public.users(id) on delete set null,
  snapshot_json jsonb not null default '{}'::jsonb,
  diff_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists learning.entity_lineage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  entity_type learning.lineage_entity_type not null,
  from_entity_id uuid,
  to_entity_id uuid,
  transition_type learning.lineage_transition_type not null,
  caused_by_resolution_id uuid references learning.suggestion_resolutions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists learning_map_versions_map_version_key
  on learning.map_versions(map_id, version_no);
create index if not exists learning_map_versions_map_version_desc_idx
  on learning.map_versions(map_id, version_no desc);
create index if not exists learning_map_versions_workspace_created_idx
  on learning.map_versions(workspace_id, created_at desc);
create index if not exists learning_entity_lineage_from_idx
  on learning.entity_lineage(map_id, entity_type, from_entity_id);
create index if not exists learning_entity_lineage_to_idx
  on learning.entity_lineage(map_id, entity_type, to_entity_id);

revoke all on learning.map_versions from public;
revoke all on learning.map_versions from anon;
revoke all on learning.map_versions from authenticated;
revoke all on learning.entity_lineage from public;
revoke all on learning.entity_lineage from anon;
revoke all on learning.entity_lineage from authenticated;
grant select, insert, update, delete on learning.map_versions to service_role;
grant select, insert, update, delete on learning.entity_lineage to service_role;
