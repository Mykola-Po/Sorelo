# Scenario Engine V1

## Purpose

This document records the behavior of the current deterministic Scenario engine.

It describes what the engine does today, not a future ML or generative design.

## Input Contract

The current engine consumes:

- trigger text
- graph concepts
- graph links
- optional seed Concept ids

## Seed Resolution

If explicit seed Concept ids are provided, the engine uses them after verifying that they exist in the current graph input.

If no seeds are provided, the engine tokenizes trigger text and matches those tokens against Concept title, summary, and description fields.

The current fallback behavior selects up to three matching Concepts.

## Traversal Rules

The engine currently:

1. builds an outgoing adjacency list by source Concept id
2. sorts outgoing links by strength, relation type, and target title
3. starts a queue from resolved seeds
4. visits Concepts in descending score order
5. stops after twelve steps or when the queue is exhausted

## Step Output

Each persisted step currently includes:

- Concept id
- optional link id used to reach it
- effect type
- explanation
- score

The first steps are marked as `seed` steps. Later steps inherit explanation text from the traversed Link relation.

## Persistence Contract

Scenario execution currently writes:

- a pending row in `scenario_runs`
- ordered rows in `scenario_run_steps`
- a completed or failed run summary

Failures remain explicit through `scenario_runs.status = failed`.

## Current Limits

- deterministic, not generative
- bounded traversal depth
- token matching is lexical, not semantic
- one readable explanation path matters more than creative variation
