# Inbox Operator Workbench ADR

## Status

Accepted

## Date

2026-03-26

## Context

Inbox now sits on top of the internal Inbox AI Core as a workspace-visible operator surface.

The product flow has stabilized around a simple boundary:

1. Inbox accepts signal and records routing provenance.
2. Inbox explains what happened, what it relates to, and what the next step is.
3. Learning is the review/apply surface inside the target Map.

## Decision

Inbox is an internal operator workbench, not a canonical review/apply surface.

The primary user for this surface is the signed-in workspace operator who is triaging incoming evidence.

## Consequences

- Inbox stays workspace-scoped and operator-facing.
- Inbox copy should explain provenance, routing state, and the next canonical step.
- Learning remains the place where review and apply happen after promotion.
- User-facing wording should avoid implying that Inbox itself is the final apply surface.
