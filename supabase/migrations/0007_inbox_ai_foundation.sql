create extension if not exists vector;

create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;
grant usage on schema app_private to service_role;

alter default privileges in schema app_private revoke all on tables from public;
alter default privileges in schema app_private revoke all on tables from anon;
alter default privileges in schema app_private revoke all on tables from authenticated;
alter default privileges in schema app_private grant select, insert, update, delete on tables to service_role;

do $$
begin
  create type app_private.inbox_source_type as enum (
    'manual_note',
    'transcript',
    'chat',
    'upload',
    'import'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_item_status as enum (
    'received',
    'persisted',
    'normalized',
    'segmented',
    'interpreted',
    'scored',
    'resolved',
    'clarification_requested',
    'promoted',
    'parked',
    'discarded',
    'failed_needs_review'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_fragment_type as enum (
    'statement',
    'question',
    'constraint',
    'claim',
    'observation',
    'intent',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_hypothesis_type as enum (
    'interpretation',
    'candidate_structure',
    'relation_cluster',
    'actionable_summary'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_atom_type as enum (
    'entity',
    'relation',
    'intent',
    'question',
    'constraint',
    'claim',
    'observation'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_route as enum (
    'promote',
    'clarify',
    'park',
    'discard'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_structured_packet_type as enum (
    'concept_packet',
    'link_packet',
    'mixed_packet',
    'clarification_packet',
    'parked_packet'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_structured_packet_status as enum (
    'draft',
    'ready',
    'emitted'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_merge_target_object_type as enum (
    'concept',
    'link',
    'scenario',
    'map'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_merge_candidate_decision as enum (
    'pending',
    'accepted',
    'rejected'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_clarification_status as enum (
    'pending',
    'answered',
    'dismissed',
    'expired'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_embedding_owner_type as enum (
    'item',
    'fragment',
    'hypothesis',
    'atom',
    'packet'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type app_private.inbox_workflow_event_status as enum (
    'started',
    'completed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists app_private.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type app_private.inbox_source_type not null,
  source_ref text,
  raw_text text not null,
  normalized_text text,
  language varchar(32),
  status app_private.inbox_item_status not null default 'received',
  score numeric(5, 4),
  confidence numeric(5, 4),
  ambiguity numeric(5, 4),
  risk numeric(5, 4),
  route app_private.inbox_route,
  idempotency_key varchar(128) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists app_private.inbox_fragments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  ordinal integer not null,
  fragment_text text not null,
  fragment_type app_private.inbox_fragment_type,
  span_start integer,
  span_end integer
);

create table if not exists app_private.inbox_hypotheses (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  fragment_id uuid references app_private.inbox_fragments(id) on delete set null,
  rank integer not null,
  hypothesis_type app_private.inbox_hypothesis_type not null,
  payload jsonb not null default '{}'::jsonb,
  confidence numeric(5, 4) not null,
  explanation text,
  model_name varchar(160) not null,
  prompt_version varchar(64) not null
);

create table if not exists app_private.inbox_atoms (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  hypothesis_id uuid not null references app_private.inbox_hypotheses(id) on delete cascade,
  atom_type app_private.inbox_atom_type not null,
  canonical_value text,
  payload jsonb not null default '{}'::jsonb,
  confidence numeric(5, 4) not null
);

create table if not exists app_private.structured_packets (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  packet_type app_private.inbox_structured_packet_type not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  route app_private.inbox_route not null,
  status app_private.inbox_structured_packet_status not null default 'draft'
);

create table if not exists app_private.merge_candidates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  target_object_type app_private.inbox_merge_target_object_type not null,
  target_object_id uuid not null,
  similarity numeric(5, 4) not null,
  decision app_private.inbox_merge_candidate_decision
);

create table if not exists app_private.clarification_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  question text not null,
  reason text not null,
  status app_private.inbox_clarification_status not null default 'pending',
  answered_at timestamptz
);

create table if not exists app_private.clarification_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references app_private.clarification_requests(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists app_private.embeddings (
  id uuid primary key default gen_random_uuid(),
  owner_type app_private.inbox_embedding_owner_type not null,
  owner_id uuid not null,
  embedding vector(1536) not null,
  embedding_model varchar(160) not null,
  content_hash varchar(128) not null
);

create table if not exists app_private.workflow_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  event_type varchar(120) not null,
  step_name varchar(64) not null,
  status app_private.inbox_workflow_event_status not null,
  payload jsonb,
  attempt_no integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists inbox_items_idempotency_key_key
  on app_private.inbox_items(idempotency_key);
create index if not exists inbox_items_user_created_idx
  on app_private.inbox_items(user_id, created_at desc);
create index if not exists inbox_items_status_route_idx
  on app_private.inbox_items(status, route);
create unique index if not exists inbox_fragments_item_ordinal_key
  on app_private.inbox_fragments(item_id, ordinal);
create index if not exists inbox_fragments_item_ordinal_idx
  on app_private.inbox_fragments(item_id, ordinal);
create index if not exists inbox_hypotheses_item_rank_idx
  on app_private.inbox_hypotheses(item_id, rank);
create index if not exists inbox_merge_candidates_item_similarity_idx
  on app_private.merge_candidates(item_id, similarity desc);
create unique index if not exists inbox_clarification_answers_request_key
  on app_private.clarification_answers(request_id);
create index if not exists inbox_embeddings_embedding_idx
  on app_private.embeddings using hnsw (embedding vector_cosine_ops);
create unique index if not exists inbox_embeddings_owner_content_hash_key
  on app_private.embeddings(content_hash, embedding_model, owner_type, owner_id);
create index if not exists inbox_workflow_events_item_created_idx
  on app_private.workflow_events(item_id, created_at);

revoke all on all tables in schema app_private from public;
revoke all on all tables in schema app_private from anon;
revoke all on all tables in schema app_private from authenticated;
grant select, insert, update, delete on all tables in schema app_private to service_role;
