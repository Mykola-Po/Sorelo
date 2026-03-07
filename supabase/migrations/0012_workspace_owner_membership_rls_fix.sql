drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
for insert with check (
  public.is_workspace_owner(workspace_id) and role = 'viewer'
);

drop policy if exists workspace_members_insert_bootstrap_owner on public.workspace_members;
create policy workspace_members_insert_bootstrap_owner on public.workspace_members
for insert with check (
  role = 'owner'
  and user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces w
    where w.id = workspace_id
      and w.owner_id = auth.uid()
  )
);
