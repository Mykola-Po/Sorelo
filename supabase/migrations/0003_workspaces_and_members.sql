create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  plan plan_t not null default 'free',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role workspace_role_t not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version integer not null default 0,
  unique (workspace_id, user_id)
);

create unique index if not exists workspace_members_one_owner_per_workspace_idx
  on public.workspace_members (workspace_id)
  where role = 'owner';

create or replace function public.enforce_owner_membership_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'owner' and new.user_id <> (select owner_id from public.workspaces where id = new.workspace_id) then
    raise exception 'owner membership must match workspaces.owner_id';
  end if;
  return new;
end;
$$;

create or replace function public.create_owner_membership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists workspace_members_owner_guard on public.workspace_members;
create trigger workspace_members_owner_guard
before insert on public.workspace_members
for each row execute procedure public.enforce_owner_membership_insert();

drop trigger if exists workspaces_owner_membership on public.workspaces;
create trigger workspaces_owner_membership
after insert on public.workspaces
for each row execute procedure public.create_owner_membership();

create or replace function public.is_workspace_member(workspace_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_uuid
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(workspace_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_uuid
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;
