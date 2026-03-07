create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type node_type_t not null,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  x double precision not null default 0,
  y double precision not null default 0,
  intensity numeric(5,4),
  confidence numeric(5,4) not null default 0.5,
  last_confirmed_at timestamptz not null default timezone('utc', now()),
  volatility numeric(5,4) not null default 0.5,
  review_due_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0,
  unique (id, workspace_id)
);

create table if not exists public.edges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null,
  target_id uuid not null,
  relation_type relation_type_t not null,
  strength numeric(5,4) not null default 0,
  confidence numeric(5,4) not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0,
  constraint edges_no_self_edge check (source_id <> target_id),
  constraint edges_source_fk foreign key (source_id, workspace_id)
    references public.nodes(id, workspace_id) on delete cascade,
  constraint edges_target_fk foreign key (target_id, workspace_id)
    references public.nodes(id, workspace_id) on delete cascade,
  unique (workspace_id, source_id, target_id, relation_type)
);

create table if not exists public.clusters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0,
  unique (id, workspace_id)
);

create table if not exists public.cluster_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  cluster_id uuid not null,
  node_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, cluster_id, node_id),
  constraint cluster_members_cluster_fk foreign key (cluster_id, workspace_id)
    references public.clusters(id, workspace_id) on delete cascade,
  constraint cluster_members_node_fk foreign key (node_id, workspace_id)
    references public.nodes(id, workspace_id) on delete cascade
);
