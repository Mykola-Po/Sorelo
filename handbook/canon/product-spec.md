# Sorelo Product Spec

## Purpose

This document fixes the working product contract for Sorelo v1.

It exists to keep product, UX, engineering, and documentation aligned while the system is still moving fast.

## Product Definition

Sorelo is a visual tool for building an explainable map of a person through Concepts, Links, the Inspector, and deterministic Scenarios.

The product is built to replace disconnected notes with a structure that answers:

- what exists in the person model
- why a Concept matters
- how Concepts influence each other
- how a reaction path is likely to unfold

## Audience

Sorelo is designed for people who need to build a structured, explainable model of a person instead of keeping fragmented observations.

Initial audience is intentionally mixed, but the product must still serve one concrete use case well:

- build a useful first map quickly
- refine it without losing structure
- inspect and test reaction logic through Scenarios

## Core Product Model

### Map

A Map is the container for one explainable person model inside a Workspace.

The Map gives the user one bounded surface where Concepts, Links, and Scenarios belong together.

### Concept

A Concept is one meaningful unit inside the map.

Examples:

- thought
- state
- belief
- experience
- fact
- trigger
- another significant internal factor

### Link

A Link expresses directed influence between two Concepts.

Supported relation language in v1:

- causes
- strengthens
- weakens
- explains
- contradicts

### Inspector

The Inspector is the working detail surface for the selected Map item.

It is where the user:

- clarifies meaning
- edits summaries and descriptions
- understands connected Links
- keeps the model explainable

### Scenario

A Scenario is a concrete situation tested against the map.

In v1 the Scenario engine is deterministic and explainable, not generative. The output must show a reaction path the user can inspect and challenge.

## Product Promise

Sorelo should make it easier to:

- build a human map faster than with raw notes
- keep the structure understandable over time
- inspect why a reaction path appeared
- refine the model after new observations

## First-User Value

The first useful session is successful if a new user can:

1. create a Workspace
2. create a Map
3. place at least two Concepts
4. connect them with one Link
5. run one Scenario
6. understand why the Scenario path appeared

This is the primary v1 product loop.

## V1 Scope

Included in v1:

- Google sign-in
- workspace-first tenancy
- Maps
- Concepts
- Links
- Inspector editing
- deterministic Scenario runs
- predictable interaction surfaces with clear navigation context
- access roles sufficient for shared usage

## Out Of Scope For V1

Not part of the current v1 contract:

- realtime collaboration
- live cursors or presence
- AI-generated reasoning in Scenario output
- fully automated Concept extraction in the main user flow
- invite and billing system expansion
- Evidence, Checks, and Clusters as first-class user flows

These can be added later, but they must not blur the core value of map building.

## Product Principles

- The canvas is the main working surface.
- The Inspector is the main detail surface.
- The product must expose structure, not hide it.
- Primary actions must be direct and calm.
- Scrolling behavior should support clarity and preserve user context.
- Terminology must stay stable across product, docs, help, and marketing.
- A Scenario result must be explainable enough to inspect, not just plausible enough to accept blindly.

## UX Rules That Follow From This

- Map building must be possible directly from the canvas.
- The next recommended step should be visible for new users.
- Secondary actions should move into progressive disclosure before they steal canvas space.
- Desktop and mobile must both preserve the same conceptual workflow.

## Technical Consequences

The current technical foundation remains correct:

- auth
- workspace tenancy
- permissions
- canonical operational schema
- learning schema
- server-first architecture

But every user-facing decision should now be evaluated against the Sorelo model, not against legacy `projects/tasks` compatibility patterns.

## Glossary

### Workspace

The security and tenancy boundary that contains Maps and members.

### Map

The explainable model of one person or one bounded human system.

### Concept

A meaningful unit in the model.

### Link

A directional relationship between Concepts.

### Inspector

The panel where the selected object is understood and edited.

### Scenario

A deterministic test run over the map in response to a situation.

## Product Test

A feature is aligned only if it improves at least one of these questions:

- What is this part of the model?
- Why is it connected this way?
- What reaction path does this structure create?
- How can the user refine the map to make it more accurate?
