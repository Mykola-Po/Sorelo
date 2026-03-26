update app_private.inbox_items as inbox_items
set workspace_id = maps.workspace_id
from public.maps
where
  inbox_items.map_id = maps.id
  and inbox_items.workspace_id is distinct from maps.workspace_id;

do $$
begin
  if exists (
    select 1
    from app_private.inbox_items
    where map_id is null
  ) then
    raise exception
      'Migration 0015 requires every app_private.inbox_items row to have a non-null map_id before enforcing workspace scope.';
  end if;

  if exists (
    select 1
    from app_private.inbox_items as inbox_items
    left join public.maps
      on public.maps.id = inbox_items.map_id
    where public.maps.id is null
  ) then
    raise exception
      'Migration 0015 found app_private.inbox_items rows that reference missing public.maps records.';
  end if;

  if exists (
    select 1
    from app_private.inbox_items as inbox_items
    inner join public.maps
      on public.maps.id = inbox_items.map_id
    where
      inbox_items.workspace_id is null
      or inbox_items.workspace_id <> public.maps.workspace_id
  ) then
    raise exception
      'Migration 0015 found app_private.inbox_items rows with an unrecoverable workspace/map mismatch.';
  end if;

  if exists (
    select 1
    from app_private.inbox_items
    group by workspace_id, map_id, idempotency_key
    having count(*) > 1
  ) then
    raise exception
      'Migration 0015 found duplicate idempotency keys inside the same workspace/map scope.';
  end if;
end $$;

alter table app_private.inbox_items
  alter column workspace_id set not null,
  alter column map_id set not null;

drop index if exists app_private.inbox_items_idempotency_key_key;

create unique index if not exists inbox_items_workspace_map_idempotency_key
  on app_private.inbox_items(workspace_id, map_id, idempotency_key);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_map_workspace_fk'
      and conrelid = 'app_private.inbox_items'::regclass
  ) then
    alter table app_private.inbox_items
      add constraint inbox_items_map_workspace_fk
      foreign key (map_id, workspace_id)
      references public.maps(id, workspace_id)
      on delete restrict;
  end if;
end $$;

insert into app_private.app_migrations (version)
values ('0015_inbox_workspace_scope.sql')
on conflict (version) do nothing;
