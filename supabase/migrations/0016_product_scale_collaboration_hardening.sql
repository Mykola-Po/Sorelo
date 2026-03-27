do $$
begin
  if exists (
    select 1
    from pg_type type
    inner join pg_enum enum
      on enum.enumtypid = type.oid
    where type.typname = 'workspace_role'
      and enum.enumlabel = 'member'
  ) then
    alter type public.workspace_role rename value 'member' to 'editor';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type type
    inner join pg_enum enum
      on enum.enumtypid = type.oid
    where type.typname = 'workspace_role'
      and enum.enumlabel = 'viewer'
  ) then
    alter type public.workspace_role add value 'viewer' before 'editor';
  end if;
end $$;

alter table public.workspace_members
  alter column role set default 'editor';

alter table app_private.inbox_items
  add column if not exists processing_claim_id uuid,
  add column if not exists processing_claimed_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists processing_lease_expires_at timestamptz,
  add column if not exists processing_attempt_seq integer not null default 0;

with item_attempts as (
  select item_id, max(attempt_no) as max_attempt_no
  from (
    select item_id, attempt_no
    from app_private.inbox_pipeline_attempts
    union all
    select item_id, attempt_no
    from app_private.workflow_events
  ) attempts
  group by item_id
)
update app_private.inbox_items as inbox_items
set processing_attempt_seq = item_attempts.max_attempt_no
from item_attempts
where inbox_items.id = item_attempts.item_id
  and inbox_items.processing_attempt_seq < item_attempts.max_attempt_no;

create index if not exists inbox_items_processing_lease_idx
  on app_private.inbox_items(processing_lease_expires_at);

do $$
begin
  if exists (
    select 1
    from app_private.inbox_pipeline_attempts
    where status = 'running'
    group by item_id
    having count(*) > 1
  ) then
    raise exception
      'Migration 0016 found multiple running inbox pipeline attempts for the same item.';
  end if;
end $$;

create unique index if not exists inbox_pipeline_attempts_item_running_key
  on app_private.inbox_pipeline_attempts(item_id)
  where status = 'running';

do $$
begin
  if exists (
    select 1
    from app_private.clarification_requests
    where status = 'pending'
    group by item_id
    having count(*) > 1
  ) then
    raise exception
      'Migration 0016 found multiple pending clarification requests for the same item.';
  end if;
end $$;

create unique index if not exists inbox_clarification_requests_item_pending_key
  on app_private.clarification_requests(item_id)
  where status = 'pending';

insert into app_private.app_migrations (version)
values ('0016_product_scale_collaboration_hardening.sql')
on conflict (version) do nothing;
