# Sorela V1

Initial greenfield foundation based on:
- final development specification (2026-03-06)
- greenfield DB deployment order (2026-03-06)

## Stack
- Next.js 14 + React 18 + TypeScript
- Zustand (canonical client state)
- Dexie (IndexedDB local-first persistence)
- Supabase (Auth/Postgres/RLS/Realtime/Edge Functions)
- Zod validation
- React Flow adapter layer

## Quick start
```bash
npm install
npm run dev
```

## Environment
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## DB migrations
Order is fixed and already split as:
1. `0001_extensions_and_enums.sql`
2. `0002_functions_and_profiles.sql`
3. `0003_workspaces_and_members.sql`
4. `0004_graph_core.sql`
5. `0005_evidence_scenarios_and_sync.sql`
6. `0006_sharing_audit_and_flags.sql`
7. `0007_semantic_chunks.sql`
8. `0008_indexes_and_triggers.sql`
9. `0009_rls_policies.sql`
10. `0010_seed_and_dev_bootstrap.sql`

Apply in order via Supabase migration workflow.

## Cloud connect (clean greenfield)
If old MVP infra should be discarded, create a fresh Supabase project and a fresh Vercel project.

1. Login Supabase CLI:
```bash
npx supabase login
```
2. Link this repo to your Supabase project (CLI will ask `project-ref`):
```bash
npm run db:link
```
3. Push migrations:
```bash
npm run db:push
```
4. Set frontend env values in Vercel project:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Link and deploy on Vercel:
```bash
npx vercel link
npx vercel --prod
```
