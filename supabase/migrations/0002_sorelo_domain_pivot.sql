do $$
begin
  create type public.concept_type as enum (
    'thought',
    'state',
    'belief',
    'experience',
    'fact',
    'trigger',
    'custom'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.relation_type as enum (
    'causes',
    'strengthens',
    'weakens',
    'explains',
    'contradicts'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.scenario_run_status as enum (
    'pending',
    'completed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title varchar(160) not null,
  slug varchar(80) not null,
  subject_label varchar(160) not null,
  description text,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'maps_id_workspace_key'
      and conrelid = 'public.maps'::regclass
  ) then
    alter table public.maps
      add constraint maps_id_workspace_key
      unique (id, workspace_id);
  end if;
end $$;

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title varchar(160) not null,
  concept_type public.concept_type not null default 'custom',
  summary varchar(280),
  description text,
  x integer not null default 160,
  y integer not null default 120,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint concepts_map_workspace_fk
    foreign key (map_id, workspace_id)
    references public.maps(id, workspace_id)
    on delete cascade
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'concepts_id_map_workspace_key'
      and conrelid = 'public.concepts'::regclass
  ) then
    alter table public.concepts
      add constraint concepts_id_map_workspace_key
      unique (id, map_id, workspace_id);
  end if;
end $$;

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_concept_id uuid not null,
  target_concept_id uuid not null,
  relation_type public.relation_type not null,
  strength integer not null default 1,
  description text,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint links_map_workspace_fk
    foreign key (map_id, workspace_id)
    references public.maps(id, workspace_id)
    on delete cascade,
  constraint links_source_concept_fk
    foreign key (source_concept_id, map_id, workspace_id)
    references public.concepts(id, map_id, workspace_id)
    on delete cascade,
  constraint links_target_concept_fk
    foreign key (target_concept_id, map_id, workspace_id)
    references public.concepts(id, map_id, workspace_id)
    on delete cascade
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title varchar(160) not null,
  situation text not null,
  seed_concept_ids jsonb not null default '[]'::jsonb,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scenarios_map_workspace_fk
    foreign key (map_id, workspace_id)
    references public.maps(id, workspace_id)
    on delete cascade
);

create table if not exists public.scenario_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete set null,
  map_id uuid not null references public.maps(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trigger_text text not null,
  started_by_user_id uuid not null references public.users(id) on delete restrict,
  status public.scenario_run_status not null default 'completed',
  summary text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint scenario_runs_map_workspace_fk
    foreign key (map_id, workspace_id)
    references public.maps(id, workspace_id)
    on delete cascade
);

create table if not exists public.scenario_run_steps (
  id uuid primary key default gen_random_uuid(),
  scenario_run_id uuid not null references public.scenario_runs(id) on delete cascade,
  step_order integer not null,
  concept_id uuid not null references public.concepts(id) on delete restrict,
  via_link_id uuid references public.links(id) on delete set null,
  effect_type varchar(64) not null,
  explanation text not null,
  score integer not null default 0
);

create unique index if not exists maps_workspace_slug_key
  on public.maps(workspace_id, slug);
create index if not exists maps_workspace_idx
  on public.maps(workspace_id);
create index if not exists concepts_map_idx
  on public.concepts(map_id);
create index if not exists concepts_workspace_idx
  on public.concepts(workspace_id);
create index if not exists concepts_map_type_idx
  on public.concepts(map_id, concept_type);
create index if not exists links_map_idx
  on public.links(map_id);
create index if not exists links_source_idx
  on public.links(source_concept_id);
create index if not exists links_target_idx
  on public.links(target_concept_id);
create index if not exists scenarios_map_idx
  on public.scenarios(map_id);
create index if not exists scenarios_workspace_idx
  on public.scenarios(workspace_id);
create index if not exists scenario_runs_map_idx
  on public.scenario_runs(map_id, created_at desc);
create index if not exists scenario_runs_scenario_idx
  on public.scenario_runs(scenario_id);
create unique index if not exists scenario_run_steps_run_order_key
  on public.scenario_run_steps(scenario_run_id, step_order);
create index if not exists scenario_run_steps_run_idx
  on public.scenario_run_steps(scenario_run_id);
create index if not exists scenario_run_steps_concept_idx
  on public.scenario_run_steps(concept_id);

drop trigger if exists maps_set_updated_at on public.maps;
create trigger maps_set_updated_at
before update on public.maps
for each row execute function public.set_updated_at();

drop trigger if exists concepts_set_updated_at on public.concepts;
create trigger concepts_set_updated_at
before update on public.concepts
for each row execute function public.set_updated_at();

drop trigger if exists links_set_updated_at on public.links;
create trigger links_set_updated_at
before update on public.links
for each row execute function public.set_updated_at();

drop trigger if exists scenarios_set_updated_at on public.scenarios;
create trigger scenarios_set_updated_at
before update on public.scenarios
for each row execute function public.set_updated_at();

alter table public.maps enable row level security;
alter table public.concepts enable row level security;
alter table public.links enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_runs enable row level security;
alter table public.scenario_run_steps enable row level security;

drop policy if exists maps_select_members on public.maps;
create policy maps_select_members
on public.maps
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists maps_insert_members on public.maps;
create policy maps_insert_members
on public.maps
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by_user_id = auth.uid()
);

drop policy if exists maps_update_members on public.maps;
create policy maps_update_members
on public.maps
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists concepts_select_members on public.concepts;
create policy concepts_select_members
on public.concepts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists concepts_insert_members on public.concepts;
create policy concepts_insert_members
on public.concepts
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by_user_id = auth.uid()
);

drop policy if exists concepts_update_members on public.concepts;
create policy concepts_update_members
on public.concepts
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists links_select_members on public.links;
create policy links_select_members
on public.links
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists links_insert_members on public.links;
create policy links_insert_members
on public.links
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by_user_id = auth.uid()
);

drop policy if exists links_update_members on public.links;
create policy links_update_members
on public.links
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists links_delete_members on public.links;
create policy links_delete_members
on public.links
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists scenarios_select_members on public.scenarios;
create policy scenarios_select_members
on public.scenarios
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists scenarios_insert_members on public.scenarios;
create policy scenarios_insert_members
on public.scenarios
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by_user_id = auth.uid()
);

drop policy if exists scenarios_update_members on public.scenarios;
create policy scenarios_update_members
on public.scenarios
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists scenario_runs_select_members on public.scenario_runs;
create policy scenario_runs_select_members
on public.scenario_runs
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists scenario_runs_insert_members on public.scenario_runs;
create policy scenario_runs_insert_members
on public.scenario_runs
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and started_by_user_id = auth.uid()
);

drop policy if exists scenario_runs_update_starter on public.scenario_runs;
create policy scenario_runs_update_starter
on public.scenario_runs
for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and started_by_user_id = auth.uid()
)
with check (public.is_workspace_member(workspace_id));

drop policy if exists scenario_run_steps_select_members on public.scenario_run_steps;
create policy scenario_run_steps_select_members
on public.scenario_run_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.scenario_runs sr
    where sr.id = scenario_run_id
      and public.is_workspace_member(sr.workspace_id)
  )
);

drop policy if exists scenario_run_steps_insert_starter on public.scenario_run_steps;
create policy scenario_run_steps_insert_starter
on public.scenario_run_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from public.scenario_runs sr
    where sr.id = scenario_run_id
      and sr.started_by_user_id = auth.uid()
      and public.is_workspace_member(sr.workspace_id)
  )
);
