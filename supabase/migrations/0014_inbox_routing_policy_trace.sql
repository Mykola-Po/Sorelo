alter table if exists app_private.structured_packets
  add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into app_private.app_migrations (version)
values ('0014_inbox_routing_policy_trace.sql')
on conflict (version) do nothing;
