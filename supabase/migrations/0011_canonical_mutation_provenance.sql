do $$
begin
  create type learning.canonical_mutation_type as enum (
    'create_concept',
    'update_concept',
    'create_link'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists learning.canonical_mutation_provenance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  map_version_id uuid not null references learning.map_versions(id) on delete cascade,
  entity_type learning.lineage_entity_type not null,
  entity_id uuid not null,
  mutation_type learning.canonical_mutation_type not null,
  origin_suggestion_id uuid not null references learning.suggestions(id) on delete cascade,
  review_resolution_id uuid not null references learning.suggestion_resolutions(id) on delete cascade,
  inbox_item_id uuid not null references app_private.inbox_items(id) on delete cascade,
  inbox_packet_id uuid references app_private.structured_packets(id) on delete set null,
  applied_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists learning_canonical_mutation_provenance_map_version_key
  on learning.canonical_mutation_provenance(map_version_id);

create index if not exists learning_canonical_mutation_provenance_entity_idx
  on learning.canonical_mutation_provenance(entity_type, entity_id);

create index if not exists learning_canonical_mutation_provenance_resolution_idx
  on learning.canonical_mutation_provenance(review_resolution_id);

create index if not exists learning_canonical_mutation_provenance_suggestion_idx
  on learning.canonical_mutation_provenance(origin_suggestion_id);

create index if not exists learning_canonical_mutation_provenance_inbox_item_idx
  on learning.canonical_mutation_provenance(inbox_item_id);

create table if not exists learning.canonical_mutation_evidence (
  id uuid primary key default gen_random_uuid(),
  provenance_id uuid not null references learning.canonical_mutation_provenance(id) on delete cascade,
  inbox_fragment_id uuid not null references app_private.inbox_fragments(id) on delete cascade,
  clarification_answer_id uuid references app_private.clarification_answers(id) on delete set null,
  evidence_order integer not null,
  fragment_ordinal integer not null
);

create unique index if not exists learning_canonical_mutation_evidence_fragment_key
  on learning.canonical_mutation_evidence(provenance_id, inbox_fragment_id);

create index if not exists learning_canonical_mutation_evidence_provenance_order_idx
  on learning.canonical_mutation_evidence(provenance_id, evidence_order);

with backfill_candidates as (
  select
    mv.id as map_version_id,
    mv.workspace_id,
    mv.map_id,
    mv.created_at,
    mv.actor_user_id,
    mv.caused_by_resolution_id as review_resolution_id,
    sr.suggestion_id as origin_suggestion_id,
    coalesce(
      s.inbox_item_id,
      sb.inbox_item_id,
      nullif(s.proposed_payload ->> 'inboxItemId', '')::uuid
    ) as inbox_item_id,
    coalesce(
      s.inbox_packet_id,
      sb.inbox_packet_id,
      nullif(s.proposed_payload ->> 'inboxPacketId', '')::uuid,
      nullif(s.proposed_payload ->> 'packetId', '')::uuid
    ) as inbox_packet_id,
    case
      when mv.diff_json ->> 'action' = 'concept.created'
        then 'create_concept'::learning.canonical_mutation_type
      when mv.diff_json ->> 'action' = 'concept.updated'
        then 'update_concept'::learning.canonical_mutation_type
      when mv.diff_json ->> 'action' = 'link.created'
        then 'create_link'::learning.canonical_mutation_type
      else null
    end as mutation_type,
    case
      when mv.diff_json ->> 'action' in ('concept.created', 'concept.updated')
        then 'concept'::learning.lineage_entity_type
      when mv.diff_json ->> 'action' = 'link.created'
        then 'link'::learning.lineage_entity_type
      else null
    end as entity_type,
    case
      when mv.diff_json ->> 'action' in ('concept.created', 'concept.updated')
        then coalesce(
          nullif(mv.diff_json ->> 'conceptId', '')::uuid,
          nullif(mv.snapshot_json -> 'concept' ->> 'id', '')::uuid
        )
      when mv.diff_json ->> 'action' = 'link.created'
        then coalesce(
          nullif(mv.diff_json ->> 'linkId', '')::uuid,
          nullif(mv.snapshot_json -> 'link' ->> 'id', '')::uuid
        )
      else null
    end as entity_id
  from learning.map_versions mv
  inner join learning.suggestion_resolutions sr
    on sr.id = mv.caused_by_resolution_id
  inner join learning.suggestions s
    on s.id = sr.suggestion_id
  left join learning.suggestion_batches sb
    on sb.id = s.batch_id
  where mv.caused_by_resolution_id is not null
)
insert into learning.canonical_mutation_provenance (
  workspace_id,
  map_id,
  map_version_id,
  entity_type,
  entity_id,
  mutation_type,
  origin_suggestion_id,
  review_resolution_id,
  inbox_item_id,
  inbox_packet_id,
  applied_by_user_id,
  created_at
)
select
  candidate.workspace_id,
  candidate.map_id,
  candidate.map_version_id,
  candidate.entity_type,
  candidate.entity_id,
  candidate.mutation_type,
  candidate.origin_suggestion_id,
  candidate.review_resolution_id,
  candidate.inbox_item_id,
  candidate.inbox_packet_id,
  candidate.actor_user_id,
  candidate.created_at
from backfill_candidates as candidate
where
  candidate.mutation_type is not null
  and candidate.entity_type is not null
  and candidate.entity_id is not null
  and candidate.inbox_item_id is not null
  and not exists (
    select 1
    from learning.canonical_mutation_provenance existing
    where existing.map_version_id = candidate.map_version_id
  );

with evidence_candidates as (
  select
    provenance.id as provenance_id,
    fragment.id as inbox_fragment_id,
    fragment.clarification_answer_id,
    evidence_ordinal.ordinal_value as fragment_ordinal,
    evidence_ordinal.evidence_order
  from learning.canonical_mutation_provenance as provenance
  inner join learning.suggestion_resolutions as resolution
    on resolution.id = provenance.review_resolution_id
  inner join learning.suggestions as suggestion
    on suggestion.id = resolution.suggestion_id
  inner join lateral (
    select
      value::integer as ordinal_value,
      ordinality::integer - 1 as evidence_order
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(suggestion.proposed_payload -> 'evidenceFragmentOrdinals') = 'array'
          then suggestion.proposed_payload -> 'evidenceFragmentOrdinals'
        when jsonb_typeof(suggestion.proposed_payload -> 'operation' -> 'evidenceFragmentOrdinals') = 'array'
          then suggestion.proposed_payload -> 'operation' -> 'evidenceFragmentOrdinals'
        else '[]'::jsonb
      end
    ) with ordinality as ordinals(value, ordinality)
  ) as evidence_ordinal
    on true
  inner join app_private.inbox_fragments as fragment
    on fragment.item_id = provenance.inbox_item_id
   and fragment.ordinal = evidence_ordinal.ordinal_value
)
insert into learning.canonical_mutation_evidence (
  provenance_id,
  inbox_fragment_id,
  clarification_answer_id,
  evidence_order,
  fragment_ordinal
)
select distinct on (candidate.provenance_id, candidate.inbox_fragment_id)
  candidate.provenance_id,
  candidate.inbox_fragment_id,
  candidate.clarification_answer_id,
  candidate.evidence_order,
  candidate.fragment_ordinal
from evidence_candidates as candidate
where not exists (
  select 1
  from learning.canonical_mutation_evidence existing
  where
    existing.provenance_id = candidate.provenance_id
    and existing.inbox_fragment_id = candidate.inbox_fragment_id
)
order by
  candidate.provenance_id,
  candidate.inbox_fragment_id,
  candidate.evidence_order;
