create extension if not exists "pgcrypto";

do $$
begin
  create type public.workspace_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_status as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_status as enum ('todo', 'in_progress', 'done');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(320) not null,
  full_name text,
  avatar_url text,
  email_verified_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider varchar(64) not null,
  provider_subject text not null,
  email varchar(320),
  raw_profile jsonb not null default '{}'::jsonb,
  last_sign_in_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug varchar(64) not null,
  name varchar(120) not null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_active_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  invited_by_user_id uuid references public.users(id) on delete set null,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name varchar(160) not null,
  slug varchar(80) not null,
  description text,
  status public.project_status not null default 'active',
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
    where conname = 'workspace_members_workspace_user_key'
      and conrelid = 'public.workspace_members'::regclass
  ) then
    alter table public.workspace_members
      add constraint workspace_members_workspace_user_key
      unique (workspace_id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_id_workspace_key'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_id_workspace_key
      unique (id, workspace_id);
  end if;
end $$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title varchar(160) not null,
  description text,
  status public.task_status not null default 'todo',
  priority integer not null default 0,
  assignee_user_id uuid references public.users(id) on delete set null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_project_workspace_fk
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id)
    on delete cascade,
  constraint tasks_assignee_membership_fk
    foreign key (workspace_id, assignee_user_id)
    references public.workspace_members(workspace_id, user_id)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  entity_type varchar(64) not null,
  entity_id uuid not null,
  action varchar(96) not null,
  request_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists users_email_key
  on public.users(email);
create unique index if not exists auth_identities_provider_subject_key
  on public.auth_identities(provider, provider_subject);
create index if not exists auth_identities_user_idx
  on public.auth_identities(user_id);
create unique index if not exists workspaces_slug_key
  on public.workspaces(slug);
create index if not exists workspace_members_user_idx
  on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_role_idx
  on public.workspace_members(workspace_id, role);
create unique index if not exists projects_workspace_slug_key
  on public.projects(workspace_id, slug);
create index if not exists projects_workspace_idx
  on public.projects(workspace_id);
create index if not exists projects_workspace_status_idx
  on public.projects(workspace_id, status);
create index if not exists tasks_project_idx
  on public.tasks(project_id);
create index if not exists tasks_workspace_idx
  on public.tasks(workspace_id);
create index if not exists tasks_assignee_idx
  on public.tasks(assignee_user_id);
create index if not exists tasks_workspace_status_idx
  on public.tasks(workspace_id, status);
create index if not exists tasks_project_status_idx
  on public.tasks(project_id, status);
create index if not exists activity_log_workspace_created_idx
  on public.activity_log(workspace_id, created_at desc);
create index if not exists activity_log_entity_idx
  on public.activity_log(workspace_id, entity_type, entity_id);
create index if not exists activity_log_actor_idx
  on public.activity_log(actor_user_id, created_at desc);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists auth_identities_set_updated_at on public.auth_identities;
create trigger auth_identities_set_updated_at
before update on public.auth_identities
for each row execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.auth_identities enable row level security;
alter table public.workspaces enable row level security;
alter table public.user_preferences enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  minimum_role public.workspace_role
)
returns boolean
language sql
stable
as $$
  with membership as (
    select wm.role
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
    limit 1
  )
  select case
    when minimum_role = 'member' then exists(select 1 from membership)
    when minimum_role = 'admin' then exists(select 1 from membership where role in ('owner', 'admin'))
    when minimum_role = 'owner' then exists(select 1 from membership where role = 'owner')
    else false
  end;
$$;

drop policy if exists users_select_self on public.users;
create policy users_select_self
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists users_insert_self on public.users;
create policy users_insert_self
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists auth_identities_select_self on public.auth_identities;
create policy auth_identities_select_self
on public.auth_identities
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists auth_identities_insert_self on public.auth_identities;
create policy auth_identities_insert_self
on public.auth_identities
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists auth_identities_update_self on public.auth_identities;
create policy auth_identities_update_self
on public.auth_identities
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_preferences_select_self on public.user_preferences;
create policy user_preferences_select_self
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_preferences_insert_self on public.user_preferences;
create policy user_preferences_insert_self
on public.user_preferences
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    last_active_workspace_id is null
    or public.is_workspace_member(last_active_workspace_id)
  )
);

drop policy if exists user_preferences_update_self on public.user_preferences;
create policy user_preferences_update_self
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    last_active_workspace_id is null
    or public.is_workspace_member(last_active_workspace_id)
  )
);

drop policy if exists workspaces_select_members on public.workspaces;
create policy workspaces_select_members
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner
on public.workspaces
for insert
to authenticated
with check (created_by_user_id = auth.uid());

drop policy if exists workspaces_update_owner on public.workspaces;
create policy workspaces_update_owner
on public.workspaces
for update
to authenticated
using (public.has_workspace_role(id, 'owner'))
with check (public.has_workspace_role(id, 'owner'));

drop policy if exists workspace_members_select_members on public.workspace_members;
create policy workspace_members_select_members
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert_workspace_creator_bootstrap on public.workspace_members;
create policy workspace_members_insert_workspace_creator_bootstrap
on public.workspace_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.workspaces w
    where w.id = workspace_id
      and w.created_by_user_id = auth.uid()
  )
  and not exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_id
  )
);

drop policy if exists workspace_members_insert_admins on public.workspace_members;
create policy workspace_members_insert_admins
on public.workspace_members
for insert
to authenticated
with check (public.has_workspace_role(workspace_id, 'admin'));

drop policy if exists workspace_members_update_role_managers on public.workspace_members;
create policy workspace_members_update_role_managers
on public.workspace_members
for update
to authenticated
using (
  public.has_workspace_role(workspace_id, 'owner')
  or (
    public.has_workspace_role(workspace_id, 'admin')
    and role <> 'owner'
  )
)
with check (
  public.has_workspace_role(workspace_id, 'owner')
  or (
    public.has_workspace_role(workspace_id, 'admin')
    and role in ('admin', 'member')
  )
);

drop policy if exists projects_select_members on public.projects;
create policy projects_select_members
on public.projects
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists projects_insert_admins on public.projects;
create policy projects_insert_admins
on public.projects
for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, 'admin')
  and created_by_user_id = auth.uid()
);

drop policy if exists projects_update_admins on public.projects;
create policy projects_update_admins
on public.projects
for update
to authenticated
using (public.has_workspace_role(workspace_id, 'admin'))
with check (public.has_workspace_role(workspace_id, 'admin'));

drop policy if exists tasks_select_members on public.tasks;
create policy tasks_select_members
on public.tasks
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists tasks_insert_members on public.tasks;
create policy tasks_insert_members
on public.tasks
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by_user_id = auth.uid()
);

drop policy if exists tasks_update_accessible on public.tasks;
create policy tasks_update_accessible
on public.tasks
for update
to authenticated
using (
  public.has_workspace_role(workspace_id, 'admin')
  or created_by_user_id = auth.uid()
  or assignee_user_id = auth.uid()
)
with check (
  public.is_workspace_member(workspace_id)
  and (
    public.has_workspace_role(workspace_id, 'admin')
    or created_by_user_id = auth.uid()
    or assignee_user_id = auth.uid()
  )
);

drop policy if exists tasks_delete_accessible on public.tasks;
create policy tasks_delete_accessible
on public.tasks
for delete
to authenticated
using (
  public.has_workspace_role(workspace_id, 'admin')
  or created_by_user_id = auth.uid()
);

drop policy if exists activity_log_select_members on public.activity_log;
create policy activity_log_select_members
on public.activity_log
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists activity_log_insert_members on public.activity_log;
create policy activity_log_insert_members
on public.activity_log
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and actor_user_id = auth.uid()
);
