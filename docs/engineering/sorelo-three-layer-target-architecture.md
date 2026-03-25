# Sorelo Three-Layer Target Architecture

## Status

Draft engineering target.

This document does not describe what is already true in code. Current truth remains in the handbook, especially:

- `handbook/canon/*`
- `handbook/rules/*`
- `handbook/executable/public-schema.md`
- `handbook/executable/learning-schema.md`
- `handbook/executable/scenario-engine-v1.md`

This document defines the intended architecture for the next domain rewrite so the system can grow without losing explainability, provenance, or stable layer boundaries.

## Purpose

Sorelo needs to evolve into three product layers with explicit ownership:

1. an Intake layer that accepts raw input and turns it into explainable structured candidates
2. a Canonical Knowledge layer that owns Maps, Concepts, Links, the Inspector surface, and user-authored scenario definitions
3. a Derivation layer that runs Scenarios and other derived analysis without silently overwriting canonical knowledge

The current repository already has strong infrastructure and a partial learning/provenance layer, but it does not yet express this full split cleanly.

## Non-Negotiable Rules

- Workspaces remain the tenancy and security boundary.
- Canonical entities remain separate from probabilistic or derived artifacts.
- No external connector writes directly into canonical Concepts, Links, or Scenario runs.
- No AI step is allowed to become the hidden source of truth.
- Provenance must survive every boundary crossing.
- Review and explicit user confirmation remain the default for risky mutations.
- Scenario execution may read canonical state, but it must not mutate canonical state as a side effect.

## Layer Overview

### 1. Intake Layer

#### Purpose

The Intake layer converts raw user or connector input into explainable structured packets.

It exists to preserve signal, preserve provenance, reduce ambiguity, and route input safely before any canonical mutation is considered.

#### Owns

- raw text and raw file references
- normalization output
- fragments and spans
- semantic hypotheses
- score breakdowns
- ambiguity and risk estimates
- merge candidates
- clarification requests
- routing decisions
- workflow event history

#### Does Not Own

- Concepts
- Links
- canonical Scenario definitions
- Scenario run outputs
- Inspector state

#### Inputs

- manual text
- imported pages or notes
- chat messages
- transcripts
- future connector payloads from Notion, Telegram, or similar sources

#### Outputs

- structured packets
- clarification requests
- parked items
- discard decisions
- candidate operations for review

#### Data Boundary

Target storage lives in private inbox tables, for example:

- `app_private.inbox_items`
- `app_private.inbox_fragments`
- `app_private.inbox_hypotheses`
- `app_private.inbox_atoms`
- `app_private.inbox_merge_candidates`
- `app_private.inbox_structured_packets`
- `app_private.inbox_clarification_requests`
- `app_private.inbox_clarification_answers`
- `app_private.inbox_embeddings`
- `app_private.inbox_workflow_events`

#### Feature Ownership

Target slice:

- `src/features/inbox`

Connector adapters should remain thin and emit only typed intake payloads.

### 2. Canonical Knowledge Layer

#### Purpose

The Canonical Knowledge layer owns the explainable person model inside a Map.

It is the only layer allowed to mutate canonical Concepts, Links, their supporting provenance references, and other user-controlled map structure.

#### Owns

- Workspaces and membership access decisions
- Maps
- Concepts
- Links
- Inspector edits
- evidence references and provenance links on canonical entities
- user-authored Scenario definitions
- versioned canonical mutations

#### Does Not Own

- raw connector input
- probabilistic intake hypotheses
- intermediate AI routing decisions
- derived Scenario execution outcomes as a source of truth

#### Data Boundary

This layer remains centered on the public operational schema and its future Sorelo-native evolution.

Current anchor tables already live in the public schema:

- `workspaces`
- `maps`
- `concepts`
- `links`
- `scenarios`

The canonical layer may continue to use the current provenance pointers:

- `origin_type`
- `origin_suggestion_id`

Over time it should expand to first-class evidence and review-oriented mutation records without collapsing into raw intake storage.

#### Feature Ownership

Current and target slices:

- `src/features/workspace`
- `src/features/maps`
- `src/features/concepts`
- `src/features/links`
- `src/features/inspector`
- authored scenario definitions within `src/features/scenarios`

### 3. Derivation Layer

#### Purpose

The Derivation layer computes explainable outputs from canonical state.

Its main example today is Scenario execution. In the future it can also host checks, clustering, scoring, and other derived analysis, but only as derived outputs.

#### Owns

- Scenario execution logic
- Scenario run records
- step-by-step derived explanations
- evaluation feedback
- future checks and derived diagnostics

#### Does Not Own

- direct creation of canonical Concepts or Links
- raw connector input
- review decisions for intake material

#### Data Boundary

Important distinction:

- user-authored `Scenario` definitions are canonical
- Scenario runs and step outputs are derived

This means the Derivation layer must read:

- canonical graph state
- canonical Scenario definition
- explicit run input

And write:

- derived run records
- derived feedback and evaluation records

#### Feature Ownership

Current and target slices:

- `src/features/scenarios`
- future `checks` or other derived-analysis slices

## Transitional Bridge: Current Learning Layer

The current `learning` schema and `src/features/learning` should not be treated as the final architecture of the future system.

Its correct role during the transition is:

1. provenance and review bridge between Intake and Canonical
2. explicit suggestion and resolution log
3. lineage support for accepted or edited mutations

That means:

- the Intake layer should emit structured packets and candidate operations
- those candidate operations should materialize into `learning.suggestion_batches` and `learning.suggestions`
- user review should continue to resolve them through `learning.suggestion_resolutions`
- only then should canonical apply commands mutate public Concepts, Links, or Scenarios

In other words, the current `learning` layer becomes a controlled review gateway, not the permanent home of all probabilistic intake artifacts.

## Source Of Truth Matrix

| Concern | Source of truth | Notes |
| --- | --- | --- |
| Raw external input | Intake layer | Keep file refs and raw text outside canonical tables |
| Canonical map structure | Canonical Knowledge layer | Concepts, Links, user-authored Scenario definitions |
| Review history | Learning bridge during transition | Explicit accept, reject, edit, split, merge lineage |
| Scenario execution output | Derivation layer | Derived, inspectable, never hidden as canonical fact |
| Auth and tenancy | Infrastructure foundation | Workspace-first remains stable |

## Cross-Layer Contracts

### Connector To Intake

Every connector must emit a typed intake payload with:

- `workspace_id`
- optional `map_id`
- `source_type`
- `source_ref`
- `raw_text` or storage reference
- `provenance_json`
- `idempotency_key`

Connectors do not emit Concepts, Links, or Scenario mutations directly.

### Intake To Review

The Intake layer emits a structured packet containing:

- candidate Concepts
- candidate Links
- optional candidate Scenario seeds or definitions
- evidence references
- merge candidates
- explanation
- score breakdown
- recommended route
- policy and prompt versions

For risky or non-trivial changes, this packet becomes a suggestion batch in the learning bridge.

### Review To Canonical

Only explicit review or safe deterministic apply commands may mutate the canonical layer.

Mutation commands must:

- validate workspace and map ownership
- preserve origin and provenance references
- record the review source that caused the mutation
- stay deterministic once input is fixed

### Canonical To Derivation

The Derivation layer reads canonical snapshots and explicit run inputs.

It does not read raw intake artifacts as a hidden dependency.

## Target Runtime Architecture

### Web/App Layer

Owns:

- Inbox surfaces
- review surfaces
- clarification UI
- canvas and Inspector UI
- Scenario run UI

It does not perform heavy processing.

### API Layer

Owns:

- authentication and authorization
- request validation
- first durable write
- workflow start
- narrow DTO responses

It does not perform long-running AI work.

### Workflow Orchestration

Target responsibility:

- durable step orchestration
- retries
- idempotency
- step replay
- event emission

Target platform is Temporal, but the rewrite should not block on immediate full adoption if a transitional orchestrator is needed first.

### AI Workers

Workers stay narrow and schema-driven:

- normalizer
- segmenter
- interpreter
- resolver
- clarifier
- embedder

Routing and score thresholding should be deterministic code once worker output is available.

### Persistence

- Supabase Postgres for durable state
- pgvector for similarity and retrieval
- Supabase Storage for raw and derived files
- Realtime for item status and review updates

### Observability

Target cross-cutting stack:

- OpenTelemetry
- Sentry
- Langfuse

Every step should log:

- `item_id`
- `workflow_id`
- `step_name`
- `attempt_no`
- `model_name`
- `prompt_version`
- `latency_ms`
- `token_cost`

## Target State Machines

### Intake Item Processing Status

Recommended status family:

- `received`
- `persisted`
- `processing`
- `awaiting_clarification`
- `ready_for_review`
- `parked`
- `discarded`
- `failed_needs_review`
- `applied`

### Intake Route Decision

Keep route separate from processing status:

- `promote`
- `clarify`
- `park`
- `discard`

This avoids mixing operational state with policy outcome.

## Recommended Scoring And Routing Rule

The inbox routing formula from the intake blueprint should remain an Intake-layer policy, not a canonical-domain rule.

That means:

- `R_inbox` is used to decide review routing
- `ambiguity`, `confidence`, and `risk` are used to gate whether review is required
- canonical apply logic does not recompute meaning from scratch

Routing thresholds may change over time, but they must always remain versioned through a `policy_version`.

## Target Repository Mapping

The repository can keep `src/features` as the top-level organization if that remains the least disruptive path.

Recommended target grouping:

- Intake layer: `src/features/inbox`
- Review bridge: `src/features/learning`
- Canonical layer: `src/features/workspace`, `maps`, `concepts`, `links`, `inspector`
- Derivation layer: `src/features/scenarios`

This keeps the rewrite domain-first without forcing an unnecessary filesystem revolution before the domain boundaries are stable.

## Migration Strategy

### Phase 0. Freeze The Architecture Contract

Before shipping layer work:

- fix this target architecture
- fix intake worker contracts
- fix state machines
- fix the review bridge role of `learning`

### Phase 1. Introduce The Intake Layer

Add:

- new private inbox tables
- `src/features/inbox`
- typed commands, queries, and internal APIs
- workflow event log
- structured packet generation

Do not replace `learning` yet.

### Phase 2. Bridge Intake To Review

Add:

- packet-to-suggestion materialization
- workspace and optional map-level inbox UI
- clarification request flow
- realtime item timeline

Keep canonical apply behind review.

### Phase 3. Refactor Canonical Apply Paths

Move canonical mutations behind explicit apply commands that consume reviewed suggestions.

The public schema remains the canonical source of truth, but mutations become easier to reason about and test.

### Phase 4. Harden The Derivation Layer

Ensure Scenario execution reads canonical inputs only and writes derived run outputs only.

Future derived systems such as checks should reuse the same rule.

### Phase 5. Introduce Durable Orchestration And Full Observability

Add:

- Temporal
- full step retries and replay
- structured tracing
- prompt and model observability
- cost and quality metrics

At this point the architecture becomes production-hardened rather than merely structurally correct.

## Anti-Patterns

Do not:

- let connectors create canonical Concepts or Links directly
- store all intake and review state in the current `learning` schema forever
- let one universal prompt decide normalization, extraction, routing, and merge in one step
- let Scenario execution mutate canonical facts
- expose private intake tables directly to the browser
- auto-merge with medium confidence
- collapse raw input, candidate meaning, and canonical truth into one table family

## First Engineering Deliverables

The first concrete implementation package for this architecture should produce:

1. `Drizzle` schema for the new inbox tables
2. SQL DDL for the same private schema
3. `Zod` and JSON contracts for each worker
4. Intake item state machine
5. packet-to-learning bridge contract
6. migration plan from current `learning` behavior to explicit review-gateway behavior

These deliverables are the foundation required before connector growth or deeper automation can be introduced safely.
