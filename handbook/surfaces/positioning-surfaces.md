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

## Internal Product Surfaces

### App Shell

The authenticated shell positions the product around maps and workspace context rather than generic dashboards.

### Maps Home

The maps home surface reinforces:

- one map per person model
- first Concept -> first Link -> first Scenario
- map-first work instead of dashboard-first exploration

### Map Workspace

The active map workspace positions the canvas as primary and the Inspector and Scenario panels as secondary bounded surfaces.

### Inbox Workbench

The Inbox route is currently a hidden internal surface, not a primary product surface.

It is useful for internal creation, processing, clarification, and inspection of Inbox items, but it does not yet represent a complete workspace review product.

Inbox should remain outside the primary navigation until it carries product meaning through:

- workspace-visible queue semantics
- roles or ownership for review work
- filters and status views for review operations
- an explicit review/apply workflow instead of trace-only inspection

## Localization Rule

Localized strings in landing and app-shell message files are derived surfaces.

They should preserve the canonical product meaning, not reinterpret it per locale.

## Current Guardrails

- Public and internal surfaces should say `Sorelo`, not redefine the product through the `sorela` codename.
- Surfaces should not revive `projects/tasks` as active product vocabulary.
- Copy can simplify, but it must not blur explainability, structure, or deterministic Scenario behavior.
