alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.clusters enable row level security;
alter table public.cluster_members enable row level security;
alter table public.evidences enable row level security;
alter table public.scenario_runs enable row level security;
alter table public.operation_log enable row level security;
alter table public.share_links enable row level security;
alter table public.audit_events enable row level security;
alter table public.feature_flags enable row level security;
alter table public.semantic_chunks enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
for select using (public.is_workspace_member(id));

drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner on public.workspaces
for insert with check (owner_id = auth.uid());

drop policy if exists workspaces_update_owner on public.workspaces;
create policy workspaces_update_owner on public.workspaces
for update using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));

drop policy if exists workspaces_delete_owner on public.workspaces;
create policy workspaces_delete_owner on public.workspaces
for delete using (public.is_workspace_owner(id));

drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member on public.workspace_members
for select using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
for insert with check (public.is_workspace_owner(workspace_id) and role = 'viewer');

drop policy if exists workspace_members_update_owner on public.workspace_members;
create policy workspace_members_update_owner on public.workspace_members
for update using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

drop policy if exists workspace_members_delete_owner on public.workspace_members;
create policy workspace_members_delete_owner on public.workspace_members
for delete using (public.is_workspace_owner(workspace_id) and role <> 'owner');

drop policy if exists nodes_select_member on public.nodes;
create policy nodes_select_member on public.nodes
for select using (public.is_workspace_member(workspace_id));

drop policy if exists nodes_write_owner on public.nodes;
create policy nodes_write_owner on public.nodes
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists edges_select_member on public.edges;
create policy edges_select_member on public.edges
for select using (public.is_workspace_member(workspace_id));

drop policy if exists edges_write_owner on public.edges;
create policy edges_write_owner on public.edges
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists clusters_select_member on public.clusters;
create policy clusters_select_member on public.clusters
for select using (public.is_workspace_member(workspace_id));

drop policy if exists clusters_write_owner on public.clusters;
create policy clusters_write_owner on public.clusters
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists cluster_members_select_member on public.cluster_members;
create policy cluster_members_select_member on public.cluster_members
for select using (public.is_workspace_member(workspace_id));

drop policy if exists cluster_members_write_owner on public.cluster_members;
create policy cluster_members_write_owner on public.cluster_members
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists evidences_select_member on public.evidences;
create policy evidences_select_member on public.evidences
for select using (public.is_workspace_member(workspace_id));

drop policy if exists evidences_write_owner on public.evidences;
create policy evidences_write_owner on public.evidences
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists scenario_runs_select_member on public.scenario_runs;
create policy scenario_runs_select_member on public.scenario_runs
for select using (public.is_workspace_member(workspace_id));

drop policy if exists scenario_runs_write_owner on public.scenario_runs;
create policy scenario_runs_write_owner on public.scenario_runs
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists operation_log_select_member on public.operation_log;
create policy operation_log_select_member on public.operation_log
for select using (public.is_workspace_member(workspace_id));

drop policy if exists operation_log_insert_owner on public.operation_log;
create policy operation_log_insert_owner on public.operation_log
for insert with check (public.is_workspace_owner(workspace_id) and actor_id = auth.uid());

drop policy if exists operation_log_update_owner on public.operation_log;
create policy operation_log_update_owner on public.operation_log
for update using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists share_links_select_member on public.share_links;
create policy share_links_select_member on public.share_links
for select using (public.is_workspace_member(workspace_id));

drop policy if exists share_links_write_owner on public.share_links;
create policy share_links_write_owner on public.share_links
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists audit_events_select_owner on public.audit_events;
create policy audit_events_select_owner on public.audit_events
for select using (public.is_workspace_owner(workspace_id));

drop policy if exists audit_events_insert_owner on public.audit_events;
create policy audit_events_insert_owner on public.audit_events
for insert with check (public.is_workspace_owner(workspace_id));

drop policy if exists semantic_chunks_select_member on public.semantic_chunks;
create policy semantic_chunks_select_member on public.semantic_chunks
for select using (public.is_workspace_member(workspace_id));

drop policy if exists semantic_chunks_write_owner on public.semantic_chunks;
create policy semantic_chunks_write_owner on public.semantic_chunks
for all using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));
