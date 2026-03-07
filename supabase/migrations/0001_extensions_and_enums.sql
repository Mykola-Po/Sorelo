create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_t') then
    create type plan_t as enum ('free', 'pro');
  end if;
  if not exists (select 1 from pg_type where typname = 'workspace_role_t') then
    create type workspace_role_t as enum ('owner', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'node_type_t') then
    create type node_type_t as enum ('fact', 'emotion_state', 'belief', 'trigger_scenario');
  end if;
  if not exists (select 1 from pg_type where typname = 'relation_type_t') then
    create type relation_type_t as enum ('causes', 'strengthens', 'weakens', 'contradicts', 'explains');
  end if;
  if not exists (select 1 from pg_type where typname = 'evidence_kind_t') then
    create type evidence_kind_t as enum ('note', 'quote', 'link', 'transcript_excerpt', 'observation');
  end if;
  if not exists (select 1 from pg_type where typname = 'scenario_confidence_t') then
    create type scenario_confidence_t as enum ('low', 'medium', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'sync_status_t') then
    create type sync_status_t as enum ('pending', 'synced', 'conflict', 'error');
  end if;
  if not exists (select 1 from pg_type where typname = 'entity_type_t') then
    create type entity_type_t as enum ('workspace', 'node', 'edge', 'cluster', 'evidence', 'scenario_run');
  end if;
  if not exists (select 1 from pg_type where typname = 'op_type_t') then
    create type op_type_t as enum ('insert', 'update', 'delete', 'archive', 'restore');
  end if;
  if not exists (select 1 from pg_type where typname = 'share_scope_t') then
    create type share_scope_t as enum ('workspace', 'nodes', 'clusters', 'scenario_run');
  end if;
  if not exists (select 1 from pg_type where typname = 'share_access_mode_t') then
    create type share_access_mode_t as enum ('readonly');
  end if;
  if not exists (select 1 from pg_type where typname = 'source_type_t') then
    create type source_type_t as enum ('manual', 'ai_parse', 'import');
  end if;
end
$$;
