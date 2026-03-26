# Inbox AI Core

## Purpose

This document describes the current Inbox AI Core foundation and the release boundary for the user-facing Inbox section.

It is descriptive of the present implementation, not a promise that the full Inbox UI or orchestration runtime is already active.

## Release Decision

Date: 2026-03-25

For the current release, Inbox is an internal operator workbench exposed as a workspace section on top of the internal Inbox AI Core.

The release decision is:

- User: the signed-in workspace operator who captures raw notes, transcript fragments, or imports that may become map changes.
- Queue unit: workspace queue. `/app/[workspaceSlug]/inbox` lists Inbox items for the current workspace, not a cross-workspace personal feed.
- Review/apply: Inbox owns intake, clarification, routing, and provenance. Review and canonical apply happen in the Learning panel inside the target map workspace after promoted packets materialize review artifacts.
- Navigation: Inbox must stay visible in workspace section navigation. It remains outside the top-level primary product nav while Maps stays the primary working loop.

## Current Boundary

Inbox AI Core remains an internal ingestion and routing layer and separate from the canonical public Sorelo product model.

It does not replace Maps, Concepts, Links, Inspector, or Scenarios.

The current Inbox UI at `/app/[workspaceSlug]/inbox` is user-facing for signed-in workspace operators.

It is the workspace-visible operator workbench for ingestion tracing, clarification reruns, packet inspection, routing provenance, and review-bridge diagnostics before review/apply.

It does not replace the map-first product loop and it does not own final canonical review/apply.

Today the queue is workspace-scoped and review/apply is carried by the Learning panel inside the target map workspace.

Inbox should remain visible in workspace navigation even while the review handoff stays separate.

The boundary is intentionally simple:

1. Inbox accepts signal and records routing provenance.
2. Inbox shows the target Map, the current handoff status, and the next canonical step.
3. Learning in the target Map is where review, decision, and canonical apply happen.

Its current role is to define how raw input can be:

- received
- normalized
- segmented
- interpreted into structured hypotheses
- scored and routed
- clarified once and rerun without mutating the original raw input

## Current Persistence Layer

The persistence foundation lives in the `app_private` schema.

Current internal tables cover:

- `app_migrations`
- `inbox_items`
- `inbox_fragments`
- `inbox_hypotheses`
- `inbox_atoms`
- `structured_packets`
- `merge_candidates`
- `clarification_requests`
- `clarification_answers`
- `embeddings`
- `workflow_events`

This keeps the Inbox layer service-role scoped and separate from the public canonical schema.

`inbox_fragments` also stores per-fragment provenance via `source_kind` and optional `clarification_answer_id`.

## Current Contracts

The repository now includes typed Zod contracts for the core Inbox worker steps:

- normalize
- segment
- interpret
- score
- resolve
- clarify

These contracts are defined as strict structured inputs and outputs rather than free-form text responses.

The clarification answer boundary is also typed and internal-only:

- `POST /api/internal/inbox/clarification-requests/[requestId]/answer`

## Current State Machine

The code now defines explicit Inbox item statuses for:

- receipt and persistence
- normalization through resolution
- clarification requested
- promoted, parked, discarded
- failed needs review

The routing formula and branch thresholds are implemented as pure functions and covered by unit tests.

## Current Workflow Definition

The code now includes a workflow definition that records:

- the base step order
- terminal route branches
- per-step completion status
- retry policy
- worker metadata placeholders for prompt version and model selection

This makes the layer Temporal-ready without committing the repository to a Temporal runtime integration yet.

## Current Clarification Rerun Behavior

If an Inbox item routes to `clarify`, the current implementation allows exactly one answered clarification request for that cycle.

That answer is stored as provenance, segmented separately, appended into the next interpretation pass, and preserved in the packet payload as clarification context.

The original `raw_text` remains immutable and continues to represent the canonical source input for the item.

If the rerun still prefers `clarify`, the route is force-converted to `park` rather than generating a second clarification request.

## Current Internal Auth

Internal Inbox and Learning routes now authenticate only with `INTERNAL_API_SECRET`.

`SUPABASE_SECRET_KEY` remains available only for unrelated service-role flows and is no longer part of internal route auth.

## Current Runtime Operations

Inbox now exposes an internal runtime check at:

- `GET /api/internal/inbox/runtime`

The runtime report is machine-readable and classifies:

- `ok`
- `degraded`
- `failed`

`failed_needs_review` Inbox items are surfaced as `degraded`, not as a deploy blocker.

Env, schema, and migration problems are surfaced as `failed`.
