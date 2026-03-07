create or replace function public.workspace_owned_by_auth_user(workspace_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = workspace_uuid
      and w.owner_id = auth.uid()
  );
$$;

drop policy if exists workspace_members_insert_bootstrap_owner on public.workspace_members;
create policy workspace_members_insert_bootstrap_owner on public.workspace_members
for insert with check (
  role = 'owner'
  and user_id = auth.uid()
  and public.workspace_owned_by_auth_user(workspace_id)
);
