# Positioning Surfaces Inventory

## Purpose

This document records how Sorelo is currently positioned in public and internal product surfaces.

These surfaces are derived from canon and rules. They do not override them.

## Canonical Upstream Sources

Current positioning should stay aligned with:

- `handbook/canon/sorelo-source-of-truth.md`
- `handbook/canon/product-spec.md`
- `handbook/rules/implementation-principles.md`
- `handbook/rules/content-documentation-framework.md`

## Public Surfaces

### Root Metadata

The root application metadata positions Sorelo as a visual workspace for explainable human maps built through Concepts, Links, Inspector workflows, and deterministic Scenarios.

### Landing Surface

The landing page currently presents Sorelo as:

- explainable human mapping
- a calm workspace instead of scattered notes
- a system built around Concepts, Links, and deterministic Scenarios

The landing page is a positioning surface, not the product canon.

## Authenticated Product Surfaces

### App Shell

The authenticated shell positions the product around maps and workspace context rather than generic dashboards.

### Maps Home

The maps home surface reinforces:

- one map per person model
- first Concept -> first Link -> first Scenario
- map-first work instead of dashboard-first exploration

### Map Workspace

The active map workspace positions the canvas as primary and the Inspector and Scenario panels as secondary bounded surfaces.

### Inbox

Inbox is a workspace-visible intake section inside the authenticated product area.

It is user-facing for signed-in workspace members who turn raw notes, transcript snippets, and imports into reviewable structure for a map.

Its current release meaning is:

- the queue is scoped to the current workspace
- clarification, routing, provenance inspection, and packet inspection happen in Inbox
- review/apply happen in the Learning panel inside the target map workspace
- Inbox stays visible in workspace section navigation, but it does not need a top-level primary-nav tab while Maps remains the primary loop

## Localization Rule

Localized strings in landing and app-shell message files are derived surfaces.

They should preserve the canonical product meaning, not reinterpret it per locale.

## Current Guardrails

- Public and authenticated surfaces should say `Sorelo`, not redefine the product through the `sorela` codename.
- Surfaces should not revive `projects/tasks` as active product vocabulary.
- Copy can simplify, but it must not blur explainability, structure, or deterministic Scenario behavior.
