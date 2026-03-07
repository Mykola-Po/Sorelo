create table if not exists public.semantic_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_entity_type entity_type_t not null,
  source_entity_id uuid not null,
  content text not null,
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists semantic_chunks_content_tsv_idx
  on public.semantic_chunks
  using gin (content_tsv);

create index if not exists semantic_chunks_embedding_ivfflat_idx
  on public.semantic_chunks
  using ivfflat (embedding vector_cosine_ops)
  where embedding is not null;
