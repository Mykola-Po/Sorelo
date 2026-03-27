# Collaboration Runtime Delta Rollout

## Work metadata
- `Date`: `2026-03-27`
- `Start`: `2026-03-27`
- `End`: `TBD`
- `Status`: `planned`
- `Owner`: `engineering`
- `Primary surface`: `Map Runtime`
- `Primary scope`: `delta transport for hot-path graph collaboration`

## Goal
Move Sorela from snapshot-first invalidation toward a scalable hybrid collaboration model that preserves explainability and canonical safety. The first target is durable delta sync for final Concept position updates. Semantic content and structural meaning stay on the stricter command path until the layout path is proven stable.

## Why this work exists
The current system is safe, but it is still coarse for collaboration and scale. Remote changes primarily fan out through `maps.graphRevision`, clients react by fetching the whole graph again, and the runtime has no durable cursor or op replay model. This creates avoidable full-snapshot reads, a hot `maps` row, and no clean reconnect path beyond refreshing the entire graph.

## Current baseline
- The authoritative read model is still full `GraphSnapshot` data from `GET /api/maps/[mapId]/graph`.
- Graph writes are guarded by `maps.graphRevision` compare-and-swap in `src/features/maps/commands.ts`.
- `GraphCanvasRuntime` in `src/features/map-runtime/components/graph-canvas-runtime.tsx` persists final drag positions through `/concepts/positions`, then patches the in-memory snapshot on success.
- Realtime transport is invalidation-only. The client subscribes to the `maps` row and performs full snapshot refresh when `graphRevision` increases.
- `learningMapVersions` and provenance already exist for explainability. They should not be reused as transport history.

## Non-negotiable rules
- Do not replace semantic graph edits with silent last-writer-wins.
- Do not write every pointer move into Postgres.
- Do not use client timestamps as the ordering source.
- Do not replace `learningMapVersions` or provenance with transport operations.
- Do not add more transport complexity directly inside `src/features/map-runtime/components/graph-canvas-runtime.tsx` before extracting dedicated modules.

## Target model
- `position` becomes the first hot-path property that uses durable operations and delta replay.
- `title`, `summary`, `description`, `relationType`, `strength`, endpoints, and review/apply flows remain on command-layer safety rules.
- `maps.graphRevision` remains the coarse fallback cursor and snapshot version.
- A new operational op-log becomes the transport history for replay, reconnect, and echo suppression.
- Full snapshot loading stays available as the fallback bootstrap and recovery path.

## Workstream 1
## Runtime extraction and transport boundaries
Extract the current collaboration logic from `src/features/map-runtime/components/graph-canvas-runtime.tsx` into dedicated modules before changing behavior.

### Deliverables
- Add `src/features/map-runtime/realtime/contracts.ts` for runtime operation types and cursor contracts.
- Add `src/features/map-runtime/hooks/use-graph-snapshot-bootstrap.ts`.
- Add `src/features/map-runtime/hooks/use-map-realtime-invalidation.ts`.
- Add `src/features/map-runtime/hooks/use-graph-mutation-queue.ts`.
- Extend `src/features/map-runtime/store/map-store.ts` with `clientId`, `lastAppliedSeq`, `pendingLocalOps`, `activeLocalEntityLocks`, and `needsSnapshotFallback`.

### Acceptance
- The current behavior remains unchanged after extraction.
- Existing map runtime unit tests and e2e coverage stay green.
- The canvas component no longer owns bootstrap, transport subscription, retry policy, and mutation queue details in one file.

## Workstream 2
## Durable op-log for map graph transport
Introduce an operational graph-transport log that exists beside canonical tables and beside explainability history.

### Deliverables
- Add `map_graph_operations` to `src/shared/db/schema.ts`.
- Add a migration that creates the table and indexes.
- Required columns are `id`, `workspaceId`, `mapId`, `seq`, `actorUserId`, `clientId`, `clientMutationId`, `opKind`, `entityType`, `entityId`, `payload`, and `createdAt`.
- Add unique index on `(mapId, seq)`.
- Add unique index on `(mapId, clientId, clientMutationId)`.
- Add read index on `(mapId, seq)`.
- Add a shared helper near `src/features/maps/commands.ts` that writes canonical state, appends the op row, and returns the new cursor in a single transaction.

### Rules
- `seq` should align with the new `maps.graphRevision` value rather than using a separate counter.
- The op-log is operational and replay-oriented. It is not the explainability ledger.

### Acceptance
- A supported graph write can return `{ revision, seq, op }`.
- Duplicate `clientMutationId` is handled idempotently.
- The write path remains transactional.

## Workstream 3
## Delta transport for final position updates
Replace full snapshot invalidation for final drag positions with durable delta replay.

### Deliverables
- Add `GET /api/maps/[mapId]/ops?afterSeq=...&limit=...`.
- Add the first supported op kind: `concept.position.set`.
- Update the position write path in `app/api/maps/[mapId]/concepts/positions/route.ts`.
- Update the Concept command path in `src/features/concepts/commands.ts` so position writes can append operations.
- Update the client runtime to send `clientMutationId` on drag-end writes.
- Update the runtime to apply incoming position deltas directly to Graphology and Zustand without full snapshot reload.

### Rules
- Only the final rounded drag-end position is written durably.
- Local optimistic movement remains immediate.
- Remote echo from the same `clientId` and `clientMutationId` must be ignored.
- If the same Concept is actively being dragged locally, incoming remote `position` is deferred until drag completion.

### Acceptance
- Two open clients can see final Concept position changes without manual refresh.
- Remote position sync does not cause local self-echo jitter.
- The current full snapshot route remains available as fallback.

## Workstream 4
## Reconnect, replay, and fallback recovery
Teach the runtime to recover through sequence replay instead of jumping straight to a full graph fetch.

### Deliverables
- Track `lastAppliedSeq` in the map runtime store.
- On subscribe or reconnect, fetch op rows after the last applied sequence before falling back to `/graph`.
- If the runtime sees an unknown `opKind`, a missing sequence range, or replay failure, set `needsSnapshotFallback` and refresh the full snapshot.
- Introduce a transport abstraction around the browser realtime client so the UI is not hard-coupled to one Supabase integration detail.

### Acceptance
- Reconnect can recover from a small gap without a full snapshot refresh.
- Full snapshot fallback only happens on gap failure or unsupported operations.
- The fallback path remains deterministic and safe.

## Workstream 5
## Structural tombstones before structural deltas
Prepare create and delete flows for delta transport by removing hard-delete behavior where it would break replay or reconnect.

### Deliverables
- Add `archivedAt` and `archivedByUserId` to Links in `src/shared/db/schema.ts`.
- Update `src/features/links/commands.ts` so link deletion archives the Link instead of physically deleting it.
- Update `src/features/maps/queries.ts` so graph reads exclude archived Links.
- Update Concept archival behavior so incident Links are archived in the same transaction.

### Acceptance
- No dangling edge records remain after Concept archival.
- Snapshot reads and replay logic agree on whether a Link is visible.
- Structural delete no longer depends on hard-delete semantics.

## Workstream 6
## Expand durable delta support to structural graph ops
After position replay is stable, extend the same transport model to structural operations.

### Deliverables
- Add support for `concept.create`.
- Add support for `concept.archive`.
- Add support for `link.create`.
- Add support for `link.archive`.
- Update replay logic to add and remove entities on the live graph.

### Rules
- Unknown op kinds still trigger snapshot fallback.
- Semantic updates still stay on the current command conflict model at this stage.

### Acceptance
- Create and archive actions can sync across clients through delta replay.
- Reconnect can recover structural graph changes through `GET /ops`.

## Workstream 7
## Separate layout conflicts from content conflicts
After the layout path is proven, split spatial collaboration from semantic collaboration so moving a node does not compete with Inspector content edits.

### Deliverables
- Introduce a layout versus content revision model in the Concept and Link command layer.
- Keep layout-safe operations on the op-log replay path.
- Keep semantic content on explicit command validation and conflict surfacing.

### Acceptance
- Concept movement does not conflict with semantic Inspector edits.
- Semantic edits remain explainable and conflict-aware.

## Verification plan
- Add unit coverage for operation contracts, cursor updates, idempotency, and echo suppression.
- Add integration coverage for `appendGraphOperationTx`, replay after `afterSeq`, tombstone behavior, and transaction guarantees.
- Add e2e coverage for two-client position sync, reconnect replay, and snapshot fallback on unsupported operations.
- Track operational counters for `ops_published`, `ops_replayed`, `gap_recovery`, `snapshot_fallback`, `duplicate_client_mutation`, and `transport_resubscribe`.

## Rollout order
1. Runtime extraction and transport boundaries.
2. Durable op-log and transactional helper.
3. `concept.position.set` delta transport.
4. Reconnect and replay recovery.
5. Tombstones for Links and structural safety.
6. Structural delta ops.
7. Layout versus content conflict split.

## Status notes
- This file is the first work record in the new handbook work-files area.
- The current status is `planned` because the roadmap is documented but the follow-up implementation epics have not yet started.
- The end date stays `TBD` until the rollout is explicitly closed or superseded by a newer work file.
