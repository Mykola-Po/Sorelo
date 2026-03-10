alter table public.maps
  add column if not exists graph_revision bigint not null default 0;

create index if not exists concepts_map_archived_xy_idx
  on public.concepts(map_id, archived_at, x, y);

create index if not exists links_map_source_idx
  on public.links(map_id, source_concept_id);

create index if not exists links_map_target_idx
  on public.links(map_id, target_concept_id);
