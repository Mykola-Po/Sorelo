# Sorelo

Current repository codename is still `sorela`, but the canonical product name is `Sorelo`.

Sorelo is a visual tool for building an explainable map of a person through Concepts, Links, the Inspector, and Scenarios.

## Product baseline

- Product model: Concepts, Links, Inspector, Scenarios
- Auth: Google OAuth through Supabase
- Tenancy: workspace-first
- Current infrastructure slice: workspaces, memberships, activity, and temporary project/task flows
- UI baseline: Radix-only component system with tokenized styling
- UX rule: no full-page scrolling in the product shell; long content scrolls inside bounded panels

## Product source of truth

- [Sorelo source of truth](/C:/Users/matve/.codex/worktrees/56f8/Sorela/docs/product/sorelo-source-of-truth.md)
- [Sorelo content documentation framework](/C:/Users/matve/.codex/worktrees/56f8/Sorela/docs/content/sorelo-content-documentation-framework.md)

## Current architectural position

The infrastructure foundation remains valid:

- auth
- user identity
- workspace tenancy
- permissions
- database schema
- deployment baseline

The next domain rewrite should pivot the product layer away from temporary `projects/tasks` surfaces and toward Sorelo-native slices:

- concepts
- links
- inspector
- scenarios
- evidence
- checks

## Stack

- Next.js App Router
- React 19
- TypeScript strict mode
- Radix Themes
- Supabase Auth
- Drizzle ORM + SQL migrations
- Zod runtime validation
- Vitest
- Playwright

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run format
npm run db:generate
```

## Environment

Copy `.env.example` into a local env file and provide:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `SUPABASE_SECRET_KEY`

The env contract is validated with Zod. Missing required values should fail fast.

## Structure

```text
app/                    Routes, layouts, server page composition
src/features/           Product domain slices
src/shared/             Shared auth, db, config, validation, and UI primitives
supabase/migrations/    SQL schema and RLS
tests/unit/             Unit tests
tests/e2e/              Browser smoke coverage
```

## UX principles

- Keep one stable shell for authenticated work.
- Prefer obvious actions over decorative chrome.
- Use local scroll regions for tables, task lists, and activity streams.
- Keep route logic server-first and interactive state local.
- Keep terminology stable across product, help, onboarding, and marketing.
