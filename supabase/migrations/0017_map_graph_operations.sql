create table if not exists public.map_graph_operations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid not null,
  seq bigint not null,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  client_id uuid not null,
  client_mutation_id uuid not null,
  op_kind varchar(96) not null,
  entity_type varchar(64) not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint map_graph_operations_map_workspace_fk
    foreign key (map_id, workspace_id)
    references public.maps(id, workspace_id)
    on delete cascade
);

create unique index if not exists map_graph_operations_map_seq_key
  on public.map_graph_operations(map_id, seq);

create unique index if not exists map_graph_operations_map_client_mutation_key
  on public.map_graph_operations(map_id, client_id, client_mutation_id);

create index if not exists map_graph_operations_map_seq_idx
  on public.map_graph_operations(map_id, seq);

insert into app_private.app_migrations (version)
values ('0017_map_graph_operations.sql')
on conflict (version) do nothing;
