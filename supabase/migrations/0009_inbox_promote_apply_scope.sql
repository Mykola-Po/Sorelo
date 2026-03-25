alter table app_private.inbox_items
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table app_private.inbox_items
  add column if not exists map_id uuid references public.maps(id) on delete set null;

create index if not exists inbox_items_workspace_created_idx
  on app_private.inbox_items(workspace_id, created_at desc);

create index if not exists inbox_items_map_created_idx
  on app_private.inbox_items(map_id, created_at desc);

do $$
begin
  alter type learning.suggestion_batch_type add value 'promote_apply';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type learning.suggestion_type add value 'merge_candidate';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type learning.suggestion_type add value 'park_for_review';
exception
  when duplicate_object then null;
end $$;
