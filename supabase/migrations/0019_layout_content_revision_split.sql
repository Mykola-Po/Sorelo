alter table public.maps
  add column if not exists version_revision bigint not null default 0;

alter table public.concepts
  add column if not exists content_revision bigint not null default 0;

alter table public.links
  add column if not exists content_revision bigint not null default 0;

insert into app_private.app_migrations (version)
values ('0019_layout_content_revision_split.sql')
on conflict (version) do nothing;
