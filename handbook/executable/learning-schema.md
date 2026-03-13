# Learning Schema

## Purpose

This document describes the current learning and provenance layer that already exists alongside the public Sorelo schema.

It records origin, suggestion, resolution, lineage, and scenario feedback data without replacing canonical public entities.

## Current Scope

The learning layer lives in the `learning` schema.

Its tables are internal-only and reserved for service-role access.

## Provenance On Public Entities

The public tables `concepts`, `links`, and `scenarios` currently include:

- `origin_type`
- `origin_suggestion_id`

This means the system already preserves a boundary between canonical entities and suggestion provenance.

## Current Learning Tables

### Source Fragments

`learning.source_fragments` stores raw source text plus normalized text and metadata.

### Suggestion Batches

`learning.suggestion_batches` stores model and prompt execution batches, input hashing, status, and timestamps.

### Suggestions

`learning.suggestions` stores proposed payloads, suggestion type, optional target entity references, rationale, and confidence.

### Suggestion Resolutions

`learning.suggestion_resolutions` stores the accepted, rejected, edited, split, merged, or otherwise resolved outcome.

### Map Versions

`learning.map_versions` stores snapshots and diffs for versioned map state.

### Entity Lineage

`learning.entity_lineage` stores transitions such as:

- split
- merge
- rename
- retype
- archive
- restore

### Scenario Feedback

Current feedback tables:

- `learning.scenario_run_feedback`
- `learning.scenario_step_feedback`

These allow explicit review of run quality and per-step correctness.

## Current Boundary Rule

The learning schema enriches explainability and future refinement, but it does not replace the canonical public model of Maps, Concepts, Links, or Scenarios.
