# Project Working Guide

## Purpose

This guide is the engineering entrypoint for working in the Sorelo repository.

Use it when you need to understand where code lives, how changes should flow through the system, which areas are safe to extend, and which areas need extra care because they protect explainability, provenance, and product integrity.

This document is executable-tier guidance. It describes what is currently true in the repository and how to work with that reality safely. If it conflicts with product meaning or implementation rules, follow handbook `canon` first, then `rules`, then return here.

## How To Read This Guide

Use this order when onboarding or scoping a change:

1. `handbook/canon/sorelo-source-of-truth.md`
2. `handbook/canon/product-spec.md`
3. `handbook/rules/implementation-principles.md`
4. this document
5. the specific executable docs for the area you are changing

For UI, visual-system, or surface-direction work, also pair this guide with:

- `handbook/rules/ui-engineering-playbook.md`
- `handbook/surfaces/positioning-surfaces.md`
- `handbook/surfaces/current-user-flows.md`

For work on specific areas, pair this guide with:

- `handbook/executable/public-schema.md`
- `handbook/executable/learning-schema.md`
- `handbook/executable/inbox-ai-core.md`
- `handbook/executable/map-first-routing-and-flows.md`
- `handbook/executable/map-runtime-architecture.md`
- `handbook/executable/scenario-engine-v1.md`

## Product Working Model

The active Sorelo product model is:

- Concepts
- Links
- Inspector
- Scenarios

Supporting product structure currently includes:

- Workspaces as tenancy and collaboration boundaries
- Maps as the active explainable model container inside a workspace
- Inbox and Learning as evidence-to-structure workflows
- Activity, versions, lineage, and provenance as explainability support systems

Important current reality:

- `projects` and `tasks` still exist in schema and compatibility paths
- they are legacy compatibility residue, not active Sorelo product vocabulary
- new product work should extend map-first slices rather than reintroduce project/task-first thinking

## Technical Baseline

Current baseline:

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Node 20.x
- Radix Themes and `@radix-ui/react-icons`
- vanilla CSS in `app/globals.css`
- Supabase SSR/auth
- Drizzle ORM and SQL migrations
- Zod for boundary validation
- Vitest for unit coverage
- Playwright for browser flows

Primary source files for this baseline:

- `package.json`
- `app/layout.tsx`
- `src/shared/config/env.ts`
- `src/shared/db/schema.ts`
- `playwright.config.ts`
- `vitest.config.ts`

## Repository Map

### `app/`

App Router entrypoints, layouts, route handlers, metadata, and thin server composition.

Rules:

- keep route files thin
- resolve auth and access here
- call feature queries and commands here
- avoid hiding business logic in pages or route handlers

Common areas:

- `app/page.tsx` for marketing entry
- `app/app/*` for authenticated product routes
- `app/api/*` for route handlers
- `app/handbook/*` for handbook publishing surfaces

### `src/features/`

Product feature slices. This is where most domain logic belongs.

Current major slices:

- `workspace`
- `maps`
- `map-runtime`
- `concepts`
- `links`
- `inspector`
- `scenarios`
- `inbox`
- `learning`
- `activity`
- `docs-hub`
- `landing`

Typical slice shape:

- `queries.ts` for reads
- `commands.ts` for writes
- `actions.ts` for server actions when needed
- `schemas.ts` for Zod boundaries
- `components/` for feature UI

### `src/shared/`

Cross-cutting primitives that should stay stable across features.

Current shared areas:

- `auth`
- `config`
- `db`
- `i18n`
- `ui`
- `validation`

Use `src/shared/` only for true cross-cutting contracts. Do not move feature-local rules here just because they are reused twice.

### `tests/`

Verification layer.

- `tests/unit/` covers pure logic, contracts, schemas, and architecture helpers
- `tests/e2e/` covers critical user-visible flows

### `supabase/migrations/`

Current SQL migration history and schema evolution trail.

Rules:

- prefer additive changes
- never rewrite committed/shared historical migrations
- add a new migration instead

### `handbook/`

Published internal documentation with explicit source precedence:

- `canon`
- `rules`
- `surfaces`
- `executable`

### `scripts/`

Operational and local support scripts, including build preparation, backup creation, local Playwright web server boot, and inbox runtime checks.

## Stable Architecture Patterns

### 1. Server-first route composition

Most routes should:

1. require the current user or workspace access
2. resolve server-side data
3. render a typed feature component

Example pattern:

- page/layout in `app/`
- access check in `src/shared/auth/session.ts` or a feature access helper
- data fetch through a feature `queries.ts`
- feature component render

### 2. Thin route handlers

API routes should stay focused on:

- access
- request parsing
- validation
- command/query dispatch
- response serialization

Good examples:

- `app/api/maps/[mapId]/graph/route.ts`
- `app/api/maps/[mapId]/concepts/route.ts`
- `src/features/map-runtime/server.ts`

Avoid putting mutation logic directly inside route handlers.

### 3. Command layer for canonical mutations

Writes to Concepts, Links, Scenarios, and related explainability structures should go through feature command modules.

Why:

- membership and map access are enforced there
- graph revision updates happen there
- activity logging happens there
- version snapshots and lineage/provenance hooks happen there

Examples:

- `src/features/concepts/commands.ts`
- `src/features/links/commands.ts`

If you bypass these modules and write directly from a route or component, you are likely to break explainability guarantees.

### 4. Query layer for read models

Read aggregation belongs in feature queries, not in UI components.

Examples:

- `src/features/maps/queries.ts`
- `src/features/workspace/queries.ts`
- `src/features/learning/queries.ts`

Queries often assemble UI-ready read models by joining maps, scenarios, learning feed records, and provenance data.

### 5. Isolated client runtime for the canvas

The map canvas is intentionally isolated from the rest of the product shell.

Working split:

- server shell and page composition in `app/`
- map workspace orchestration in `src/features/maps/components/map-workspace.tsx`
- WebGL and interaction runtime in `src/features/map-runtime/*`

Do not casually move server concerns into the client map runtime.

### 6. Explicit validation boundaries

Untrusted input should be parsed with Zod at the boundary.

Main places:

- route payload schemas in feature `schemas.ts`
- env contract in `src/shared/config/env.ts`
- handbook/docs manifest schema in `src/features/docs-hub/content.ts`

## Feature Slice Guide

### Workspace and auth

Start here when a change affects sign-in, workspace switching, tenancy, or role-based access.

Primary files:

- `src/shared/auth/session.ts`
- `src/shared/auth/supabase/*`
- `src/features/workspace/*`
- `src/shared/config/routes.ts`

Typical concerns:

- authenticated entry
- active workspace resolution
- membership checks
- redirects into map-first paths

### Maps

This slice owns map listing, map workspace chrome data, telemetry, and workspace-home transitions.

Primary files:

- `src/features/maps/queries.ts`
- `src/features/maps/commands.ts`
- `src/features/maps/access.ts`
- `src/features/maps/components/*`

Change here when the user is entering, creating, listing, or framing map work.

### Map runtime

This is the interactive canvas runtime.

Primary files:

- `src/features/map-runtime/components/*`
- `src/features/map-runtime/renderers/*`
- `src/features/map-runtime/store/*`
- `src/features/map-runtime/hooks/*`

Change here when the issue is about:

- selection
- zoom and viewport
- canvas gestures
- concept placement
- link drawing interaction
- runtime overlays and graph snapshots

### Concepts and Links

These slices own canonical graph editing.

Primary files:

- `src/features/concepts/*`
- `src/features/links/*`

Use these slices for:

- creating entities
- updating entities
- archiving or deleting graph structure
- preserving graph revision semantics
- preserving lineage and activity events

### Inspector

Inspector is the detailed understanding and editing surface for selections.

Primary files:

- `src/features/inspector/*`
- map Inspector integrations inside `src/features/maps/components/map-workspace.tsx`

Changes here should preserve the distinction between:

- canonical entity truth
- derived provenance explanation
- UI detail presentation

### Scenarios

Scenarios provide deterministic reaction-path simulation and persisted run records.

Primary files:

- `src/features/scenarios/engine.ts`
- `src/features/scenarios/queries.ts`
- `src/features/scenarios/commands.ts`

Keep this layer inspectable and deterministic. Do not replace explicit inputs with opaque heuristics without documenting the change.

### Inbox and Learning

These slices implement the evidence-to-structure pipeline and provenance layer.

Primary files:

- `src/features/inbox/*`
- `src/features/learning/*`

This area includes:

- normalization
- segmentation
- interpretation
- scoring
- routing
- clarification
- promote/apply contracts
- provenance and review flow

This is one of the highest-risk areas in the repository because it sits between raw evidence and canonical graph changes.

### Docs hub and handbook

This slice powers the internal handbook experience.

Primary files:

- `src/features/docs-hub/*`
- `app/handbook/*`
- `handbook/manifest.json`

When adding or changing handbook content:

- update the markdown file
- update `handbook/manifest.json`
- keep source tiering accurate

## Common Change Playbooks

### Add or change a read-only page

Preferred path:

1. create or update the route in `app/`
2. resolve access on the server
3. add or extend a feature query
4. render a typed feature component
5. keep client state local if interactivity is required

Do not move read aggregation into a client component if server rendering is sufficient.

### Add or change a mutation

Preferred path:

1. define or extend a route/action schema
2. enforce access
3. implement or extend a feature command
4. keep canonical writes inside a transaction when related records must stay in sync
5. return explicit, typed response data
6. add or update tests around the command and the exposed flow

For map graph mutations, confirm whether the change also needs:

- graph revision bump
- activity event
- map version snapshot
- lineage transition
- provenance link to learning/inbox

### Add or change schema

Preferred path:

1. update `src/shared/db/schema.ts`
2. generate or author a new migration under `supabase/migrations/`
3. run `npm run db:check`
4. update executable handbook docs if the model meaning changed
5. update tests that depend on the shape or contract

Do not silently change schema meaning without updating the handbook where that meaning is documented.

### Add or change copy or terminology

Preferred path:

1. confirm canonical term in handbook `canon` and `rules`
2. update shared i18n messages or feature-local user-facing strings
3. avoid introducing synonyms for Concepts, Links, Inspector, or Scenarios
4. update surfaces or handbook docs if the change affects stable wording

Relevant locations:

- `src/shared/i18n/messages/*`
- `handbook/canon/*`
- `handbook/rules/content-documentation-framework.md`
- `handbook/surfaces/*`

### Add or change canvas behavior

Preferred path:

1. identify whether the change belongs to renderers, store, hooks, or map workspace orchestration
2. keep graph math and runtime behavior pure where possible
3. avoid introducing heavy React state for graph internals
4. verify both runtime interaction and surrounding Inspector/Scenario behavior

Pair with:

- `handbook/executable/map-runtime-architecture.md`
- unit tests under `tests/unit/map-runtime/`
- e2e coverage if user-visible behavior changes

### Add or change Inbox or Learning behavior

Preferred path:

1. identify the exact stage: normalize, segment, interpret, score, resolve, route, apply, provenance, review
2. keep boundary schemas explicit
3. preserve explainability of how a conclusion was reached
4. update handbook executable docs if the contract meaning changed
5. add or extend unit coverage because this area is logic-heavy

## Verification Workflow

### Local development

Primary command:

```bash
npm run dev
```

The local app commonly runs on `http://localhost:3000`.

### Core scripts

Use these scripts as the normal verification surface:

```bash
npm run lint
npm run typecheck
npm run db:check
npm run test
npm run test:e2e
npm run build
npm run verify
```

Other important scripts:

```bash
npm run test:coverage
npm run ops:inbox:check -- --base-url http://localhost:3000
npm run db:generate
npm run backup:bundle
```

### Minimum verification by change type

For copy-only or handbook-only changes:

- relevant docs-hub tests when handbook manifest or parsing is touched

For pure UI changes:

- `npm run lint`
- `npm run typecheck`
- relevant unit tests
- relevant Playwright coverage when a critical user flow changes

For domain logic changes:

- `npm run lint`
- `npm run typecheck`
- relevant Vitest coverage

For schema or persistence changes:

- `npm run lint`
- `npm run typecheck`
- `npm run db:check`
- relevant unit tests
- `npm run build` when wiring changed

For critical cross-layer changes:

- `npm run verify`
- `npm run build`
- relevant `npm run test:e2e`

## Risk Map

### Highest-risk areas

- `src/shared/db/schema.ts`
- `supabase/migrations/*`
- `src/features/concepts/commands.ts`
- `src/features/links/commands.ts`
- `src/features/inbox/*`
- `src/features/learning/*`
- `src/features/map-runtime/*`

Why these areas are risky:

- they protect canonical truth or provenance
- they coordinate multiple records in one change
- they affect explainability and deterministic behavior
- they can regress core map interaction or evidence handling

### Medium-risk areas

- `src/features/maps/queries.ts`
- `src/features/maps/components/map-workspace.tsx`
- `src/shared/auth/session.ts`
- `app/api/maps/*`

These areas often orchestrate multiple systems, even when the code itself looks straightforward.

### Safer extension areas

- `src/shared/ui/components/*`
- `src/shared/i18n/messages/*`
- `src/features/workspace/components/*`
- `src/features/landing/components/*`
- handbook markdown files that do not redefine canon or rules

These are still important, but they are less likely to break canonical graph behavior when changed carefully.

## Documentation Update Rules

Update the handbook when the meaning of the system changes, not only when the code compiles.

Use this rule of thumb:

- update `canon` when product meaning or official vocabulary changes
- update `rules` when durable implementation or content standards change
- update `surfaces` when the active user flow or visible expression changes
- update `executable` when current schema, runtime behavior, or technical architecture changes

For common engineering changes:

- schema shape change: update executable schema docs
- map runtime architecture change: update `map-runtime-architecture.md`
- route or redirect behavior change: update `map-first-routing-and-flows.md`
- scenario contract change: update `scenario-engine-v1.md`
- onboarding or user path change: update `surfaces/current-user-flows.md`
- new handbook document: update `handbook/manifest.json`

## Common Mistakes To Avoid

- putting domain logic directly into route files or page components
- bypassing feature commands for canonical mutations
- mixing user-facing vocabulary with legacy technical residue
- adding a second UI system outside Radix plus global CSS
- moving server-only work into client components without a clear need
- changing schema without migration and handbook follow-up
- changing copy for Concepts, Links, Inspector, or Scenarios without checking handbook canon and rules
- treating Inbox or Learning outputs as opaque magic instead of inspectable intermediate structure

## Current Known Residue And Constraints

- the repository codename is still `sorela`, while the product name is `Sorelo`
- legacy `projects/tasks` compatibility remains in schema and some routes
- handbook publishing depends on `handbook/manifest.json`
- docs hub access can be gated by `DOCS_HUB_PASSWORD`
- internal Inbox and Learning runtime routes rely on `INTERNAL_API_SECRET`
- optional LLM-related env flags exist, but deterministic and explainable fallbacks still matter

## Practical Default For Future Work

If you are unsure where to start, use this default sequence:

1. identify the feature slice
2. read its query, command, schema, and component files
3. confirm whether the change touches canonical data, provenance, or routing
4. make the smallest correct change in the owning slice
5. run the smallest relevant verification set first, then expand if the change crosses boundaries
6. update handbook docs when behavior, architecture, or stable meaning changed

That default path is the safest way to move quickly without losing explainability or long-term durability.
