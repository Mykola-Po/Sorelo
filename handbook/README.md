# Sorelo Handbook

## Purpose

`./handbook` is the published internal documentation layer for Sorelo.

It does not exist to collect every note. It exists to preserve the stable foundation of the product in one place and make source precedence explicit.

## Authority Tiers

The handbook is organized into four authority tiers:

1. `canon`
2. `rules`
3. `surfaces`
4. `executable`

### Canon

Defines what Sorelo is and which product terms are authoritative.

If another source conflicts with canon, canon wins.

### Rules

Defines durable implementation, UX, copy, and repository rules.

Rules constrain how canon is expressed in product work and engineering decisions.

### Surfaces

Describes how canon and rules are currently expressed in public and internal product surfaces.

Surfaces are derived. They are not the place to redefine the product.

### Executable

Documents what is currently true in code, schema, and tests.

Executable docs should stay descriptive. They explain current behavior and structures without inventing a new product direction.

## Precedence

Use these rules when sources disagree:

1. `canon` overrides everything below it
2. `rules` constrain implementation and copy
3. `surfaces` are derived expressions of canon and rules
4. `executable` records current truth in code, schema, and tests

## Publication Rules

- Published handbook docs live under `./handbook`.
- `docs/` is retained only for drafting assets and templates such as `docs/engineering/adr-template.md`.
- `AGENTS.md` remains at the repository root for tool/runtime instructions and contribution constraints.
- The handbook is the durable human-readable source for stable product and implementation knowledge.

## Structure

```text
handbook/
  manifest.json
  canon/
  rules/
  surfaces/
  executable/
```

## Current Defaults

- User-facing product name is `Sorelo`.
- Technical identifiers may still use `sorela`.
- `projects/tasks` remain legacy compatibility residue in the repository and schema. They are not active Sorelo product vocabulary.
