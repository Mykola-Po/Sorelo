# Public Schema

## Purpose

This document describes the current public operational schema that backs the active Sorelo product loop.

It is descriptive of the code and migrations that exist today. It does not define a future schema migration plan.

## Current Public Enums

The public schema currently defines enums for:

- workspace roles
- project status
- task status
- concept type
- relation type
- scenario run status
- entity origin type

The presence of `project` and `task` enums is legacy compatibility, not active product direction.

## Identity And Workspace Layer

Core public tables:

- `users`
- `auth_identities`
- `workspaces`
- `user_preferences`
- `workspace_members`
- `activity_log`

These tables provide:

- authenticated user identity
- workspace tenancy
- role membership
- last active workspace resolution
- activity recording

## Active Sorelo Domain Tables

The active public Sorelo model is stored in:

- `maps`
- `concepts`
- `links`
- `scenarios`
- `scenario_runs`
- `scenario_run_steps`

### Maps

`maps` is the container for one explainable person model inside a workspace.

### Concepts

`concepts` stores canonical units of meaning plus:

- concept type
- summary and description
- canvas coordinates
- provenance fields

### Links

`links` stores directional relationships between Concepts with:

- explicit endpoints
- relation type
- strength
- optional description
- provenance fields

### Scenarios

`scenarios` stores saved situations and optional seed Concept ids.

### Scenario Runs

`scenario_runs` and `scenario_run_steps` persist the deterministic execution result:

- trigger text
- starter user
- run status
- ordered explanation steps
- per-step score and optional link traversal

## Current Access Model

Access is currently enforced through workspace membership plus role checks in:

- Supabase RLS policies
- server-side access helpers

Current role hierarchy is:

- `member`
- `admin`
- `owner`

## Legacy Compatibility Residue

The public schema still contains:

- `projects`
- `tasks`

These tables remain in place for compatibility and historical transition support.

They are not part of the active Sorelo product vocabulary and should not be used to redefine current product intent.
