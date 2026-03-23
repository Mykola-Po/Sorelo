create table if not exists app_private.app_migrations (
  version varchar(160) primary key,
  applied_at timestamptz not null default now()
);

revoke all on app_private.app_migrations from public;
revoke all on app_private.app_migrations from anon;
revoke all on app_private.app_migrations from authenticated;
grant select, insert, update, delete on app_private.app_migrations to service_role;

insert into app_private.app_migrations (version)
values
  ('0001_initial_foundation.sql'),
  ('0002_sorelo_domain_pivot.sql'),
  ('0003_learning_foundation.sql'),
  ('0004_learning_graph_evolution.sql'),
  ('0005_learning_scenario_feedback.sql'),
  ('0006_graph_revision_and_scale_indices.sql'),
  ('0007_inbox_ai_foundation.sql'),
  ('0008_inbox_clarification_rerun.sql'),
  ('0009_inbox_promote_apply_scope.sql'),
  ('0010_learning_review_bridge.sql'),
  ('0011_canonical_mutation_provenance.sql'),
  ('0012_inbox_runtime_hardening.sql')
on conflict (version) do nothing;
