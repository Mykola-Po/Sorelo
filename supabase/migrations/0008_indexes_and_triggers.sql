create index if not exists workspace_members_user_idx on public.workspace_members (user_id);
create index if not exists nodes_workspace_updated_idx on public.nodes (workspace_id, updated_at desc);
create index if not exists nodes_review_due_idx on public.nodes (workspace_id, review_due_at) where archived_at is null;
create index if not exists edges_workspace_idx on public.edges (workspace_id);
create index if not exists clusters_workspace_idx on public.clusters (workspace_id);
create index if not exists evidences_workspace_idx on public.evidences (workspace_id);
create index if not exists scenario_runs_workspace_idx on public.scenario_runs (workspace_id, created_at desc);
create index if not exists operation_log_workspace_sync_idx on public.operation_log (workspace_id, sync_status, local_timestamp);
create index if not exists operation_log_conflict_idx on public.operation_log (workspace_id, conflict_flag) where conflict_flag is true;
create index if not exists share_links_workspace_idx on public.share_links (workspace_id, revoked_at, expires_at);
create index if not exists audit_events_workspace_idx on public.audit_events (workspace_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute procedure public.set_updated_at();

drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute procedure public.set_updated_at();

drop trigger if exists nodes_set_updated_at on public.nodes;
create trigger nodes_set_updated_at
before update on public.nodes
for each row execute procedure public.set_updated_at();

drop trigger if exists edges_set_updated_at on public.edges;
create trigger edges_set_updated_at
before update on public.edges
for each row execute procedure public.set_updated_at();

drop trigger if exists clusters_set_updated_at on public.clusters;
create trigger clusters_set_updated_at
before update on public.clusters
for each row execute procedure public.set_updated_at();

drop trigger if exists evidences_set_updated_at on public.evidences;
create trigger evidences_set_updated_at
before update on public.evidences
for each row execute procedure public.set_updated_at();

drop trigger if exists scenario_runs_set_updated_at on public.scenario_runs;
create trigger scenario_runs_set_updated_at
before update on public.scenario_runs
for each row execute procedure public.set_updated_at();

drop trigger if exists share_links_set_updated_at on public.share_links;
create trigger share_links_set_updated_at
before update on public.share_links
for each row execute procedure public.set_updated_at();

drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
create trigger feature_flags_set_updated_at
before update on public.feature_flags
for each row execute procedure public.set_updated_at();

drop trigger if exists semantic_chunks_set_updated_at on public.semantic_chunks;
create trigger semantic_chunks_set_updated_at
before update on public.semantic_chunks
for each row execute procedure public.set_updated_at();

drop trigger if exists workspaces_bump_version on public.workspaces;
create trigger workspaces_bump_version
before update on public.workspaces
for each row execute procedure public.bump_version();

drop trigger if exists workspace_members_bump_version on public.workspace_members;
create trigger workspace_members_bump_version
before update on public.workspace_members
for each row execute procedure public.bump_version();

drop trigger if exists nodes_bump_version on public.nodes;
create trigger nodes_bump_version
before update on public.nodes
for each row execute procedure public.bump_version();

drop trigger if exists edges_bump_version on public.edges;
create trigger edges_bump_version
before update on public.edges
for each row execute procedure public.bump_version();

drop trigger if exists clusters_bump_version on public.clusters;
create trigger clusters_bump_version
before update on public.clusters
for each row execute procedure public.bump_version();

drop trigger if exists evidences_bump_version on public.evidences;
create trigger evidences_bump_version
before update on public.evidences
for each row execute procedure public.bump_version();

drop trigger if exists scenario_runs_bump_version on public.scenario_runs;
create trigger scenario_runs_bump_version
before update on public.scenario_runs
for each row execute procedure public.bump_version();

drop trigger if exists share_links_bump_version on public.share_links;
create trigger share_links_bump_version
before update on public.share_links
for each row execute procedure public.bump_version();
