alter table public.links
  add column if not exists archived_at timestamptz;

alter table public.links
  add column if not exists archived_by_user_id uuid references public.users(id) on delete set null;
