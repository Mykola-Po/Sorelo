update public.maps as maps
set version_revision = greatest(
  maps.version_revision,
  coalesce(map_versions.max_version_no, 0)
)
from (
  select
    map_id,
    max(version_no)::bigint as max_version_no
  from learning.map_versions
  group by map_id
) as map_versions
where map_versions.map_id = maps.id;

insert into app_private.app_migrations (version)
values ('0020_backfill_map_version_revision.sql')
on conflict (version) do nothing;
