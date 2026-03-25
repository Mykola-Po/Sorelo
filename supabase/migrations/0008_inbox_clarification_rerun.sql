do $$
begin
  create type app_private.inbox_fragment_source_kind as enum (
    'item_raw',
    'clarification_answer'
  );
exception
  when duplicate_object then null;
end $$;

alter table app_private.inbox_fragments
  add column if not exists source_kind app_private.inbox_fragment_source_kind;

update app_private.inbox_fragments
set source_kind = 'item_raw'
where source_kind is null;

alter table app_private.inbox_fragments
  alter column source_kind set default 'item_raw';

alter table app_private.inbox_fragments
  alter column source_kind set not null;

alter table app_private.inbox_fragments
  add column if not exists clarification_answer_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_fragments_clarification_answer_id_fkey'
  ) then
    alter table app_private.inbox_fragments
      add constraint inbox_fragments_clarification_answer_id_fkey
      foreign key (clarification_answer_id)
      references app_private.clarification_answers(id)
      on delete set null;
  end if;
end $$;
