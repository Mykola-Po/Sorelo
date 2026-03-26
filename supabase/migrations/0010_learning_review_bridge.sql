do $$
begin
  alter type learning.suggestion_batch_type add value 'inbox_review';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type app_private.inbox_item_status add value 'ready_for_review';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type app_private.inbox_item_status add value 'applied';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type learning.suggestion_apply_status as enum (
    'pending',
    'applied',
    'failed',
    'not_applicable'
  );
exception
  when duplicate_object then null;
end $$;

alter table learning.suggestion_batches
  add column if not exists inbox_item_id uuid references app_private.inbox_items(id) on delete set null,
  add column if not exists inbox_packet_id uuid references app_private.structured_packets(id) on delete set null;

alter table learning.suggestions
  add column if not exists inbox_item_id uuid references app_private.inbox_items(id) on delete set null,
  add column if not exists inbox_packet_id uuid references app_private.structured_packets(id) on delete set null,
  add column if not exists artifact_order integer not null default 0;

alter table learning.suggestion_resolutions
  add column if not exists apply_status learning.suggestion_apply_status not null default 'not_applicable',
  add column if not exists applied_at timestamptz,
  add column if not exists apply_outcome jsonb not null default '{}'::jsonb,
  add column if not exists apply_error text;

alter table learning.map_versions
  add column if not exists caused_by_resolution_id uuid references learning.suggestion_resolutions(id) on delete set null;

create index if not exists learning_suggestion_batches_inbox_item_started_idx
  on learning.suggestion_batches(inbox_item_id, started_at);

create index if not exists learning_suggestion_batches_inbox_packet_started_idx
  on learning.suggestion_batches(inbox_packet_id, started_at);

create index if not exists learning_suggestions_inbox_item_created_idx
  on learning.suggestions(inbox_item_id, created_at);

create index if not exists learning_suggestions_inbox_packet_created_idx
  on learning.suggestions(inbox_packet_id, created_at);

create index if not exists learning_suggestions_batch_artifact_idx
  on learning.suggestions(batch_id, artifact_order);

create index if not exists learning_suggestion_resolutions_apply_status_idx
  on learning.suggestion_resolutions(apply_status, resolved_at);

create index if not exists learning_map_versions_resolution_created_idx
  on learning.map_versions(caused_by_resolution_id, created_at);

update learning.suggestion_batches
set
  inbox_item_id = coalesce(
    inbox_item_id,
    nullif(metadata ->> 'inboxItemId', '')::uuid
  ),
  inbox_packet_id = coalesce(
    inbox_packet_id,
    nullif(metadata ->> 'inboxPacketId', '')::uuid
  )
where
  inbox_item_id is null
  or inbox_packet_id is null;

update learning.suggestions
set
  inbox_item_id = coalesce(
    inbox_item_id,
    nullif(proposed_payload ->> 'inboxItemId', '')::uuid
  ),
  inbox_packet_id = coalesce(
    inbox_packet_id,
    nullif(proposed_payload ->> 'inboxPacketId', '')::uuid,
    nullif(proposed_payload ->> 'packetId', '')::uuid
  )
where
  inbox_item_id is null
  or inbox_packet_id is null;

with ordered_suggestions as (
  select
    id,
    row_number() over (
      partition by batch_id
      order by created_at asc, id asc
    ) - 1 as next_artifact_order
  from learning.suggestions
)
update learning.suggestions as suggestions
set artifact_order = ordered_suggestions.next_artifact_order
from ordered_suggestions
where
  suggestions.id = ordered_suggestions.id
  and suggestions.artifact_order = 0;
