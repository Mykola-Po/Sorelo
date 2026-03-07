-- Dev/staging bootstrap only. Keep disabled in production.

insert into public.feature_flags (key, enabled, description, config)
values
  ('scenario_runner_v1', true, 'Enable manual scenario runner flow', '{}'::jsonb),
  ('inbox_parse_v1', true, 'Enable manual inbox parsing flow', '{}'::jsonb)
on conflict (key) do update
set enabled = excluded.enabled,
    description = excluded.description,
    config = excluded.config,
    updated_at = timezone('utc', now());
