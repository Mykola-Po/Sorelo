# Sorelo Implementation Principles

## Purpose

This document distills the stable implementation rules that currently matter most for Sorelo.

It is derived from `AGENTS.md`, but it exists as a durable human-readable rule set instead of an agent/runtime instruction file.

## Priority Order

When requirements conflict, use this priority order:

1. correctness and safety
2. explainability of behavior and data
3. UX clarity
4. performance
5. developer convenience

## Domain Integrity

- Concepts, Links, Inspector, and Scenarios are the active Sorelo product model.
- Canonical entities stay separate from derived or simulated outputs.
- Scenarios must not silently overwrite observed facts.
- Stable identifiers are required for core entities.
- Provenance should be preserved where the system already supports it.

## Architectural Rules

- Keep the architecture domain-first, not page-first.
- Keep route files thin.
- Put domain logic in feature modules, not page components.
- Keep transformations and derived calculations pure where possible.
- Prefer explicit typed boundaries over implicit behavior.

## UI And UX Rules

- The canvas is the main working surface.
- Inspector and Scenario remain secondary bounded surfaces.
- Full-page scrolling should not exist in the authenticated shell.
- Radix primitives and vanilla CSS remain the active UI baseline.
- Interactive islands should stay small and isolated.

## Data And Validation Rules

- Supabase provides auth/session/platform capabilities.
- Drizzle is the primary typed access layer for application tables.
- External input is validated at the boundary with Zod.
- Environment variables are defined through the shared env module.

## Change Control

- Prefer the smallest correct change that solves the task.
- Reuse existing patterns before introducing new abstractions.
- Avoid cosmetic refactors unless they directly support the task.
- Keep legacy compatibility explicit when it cannot be removed yet.

## Current Split-State Rule

`projects/tasks` still exist as technical residue in schema and compatibility routes.

They must be treated as legacy compatibility, not as active Sorelo product vocabulary.
