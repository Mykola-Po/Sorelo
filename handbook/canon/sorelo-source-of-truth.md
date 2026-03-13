# Sorelo Source of Truth

## Canonical Product Name

- User-facing product name: `Sorelo`
- Current repository/package codename may still appear as `sorela`
- Until a deliberate rename pass is done, `sorela` is technical only and must not define the product model

## What Sorelo Is

Sorelo is a visual tool for building an explainable map of a person: their concepts, links, causes, reactions, and behavior scenarios.

The product is not built around disconnected notes. It is built around a structured model that makes visible:

- what exists
- why it matters
- how one thing influences another
- how a likely reaction unfolds through the system

## Core Product Model

### Concept

A Concept is a meaningful unit in the person's map.

It can represent:

- a thought
- a state
- a belief
- an experience
- a fact
- a trigger
- another important internal factor

### Link

A Link connects Concepts and explains influence between them.

It shows that one Concept:

- causes another
- strengthens another
- weakens another
- explains another
- contradicts another

### Inspector

The Inspector is the main place where the selected Concept or Link is opened, understood, and edited.

The Inspector is where the user:

- sees the selected item in detail
- edits meaning and description
- clarifies interpretation
- attaches supporting information

### Scenario

A Scenario is a testable situation applied to the map.

The user sets a situation and sees how the system is most likely to react:

- which Concepts activate
- which Links carry the logic
- what chain of reaction becomes plausible

## How Sorelo Works

1. The user creates Concepts.
2. The user connects them with Links.
3. The user opens any selected Concept or Link in the Inspector.
4. The map gradually becomes a structured model of a person.
5. The user runs Scenarios on top of that structure.
6. The model is updated as new observations appear.
7. Over time the map becomes more precise, more explainable, and more useful.

## Product Outcome

Sorelo represents a person not as a chaotic set of notes, but as an explainable model made of Concepts, Links, and Scenarios.

## What Sorelo Is Not

Sorelo is not:

- a generic task manager
- a blank whiteboard without meaning
- a note dump
- a collection of isolated observations with no structure

## UX Principles

- The canvas is the main surface.
- The Inspector is the main detail surface.
- The product must explain structure, not hide it.
- Full-page scrolling should be avoided in the app shell.
- Scrolling is allowed only inside bounded panels where density requires it.
- Primary actions must be obvious and calm, not decorative.
- Terminology must stay stable across product, onboarding, help, and marketing.

## Product Layers

### Infrastructure Layer

The current foundation that already exists remains valid:

- auth
- user identity
- workspace tenancy
- permissions
- database structure
- deployment baseline

These are platform capabilities, not the end-user product model.

### Product Layer

The product layer must keep moving away from the legacy `projects/tasks/activity` compatibility residue toward:

- concepts
- links
- inspector
- scenarios
- evidence
- checks
- clusters

`projects/tasks` are not the active domain vocabulary of Sorelo and should be treated as legacy compatibility only.

## Architectural Consequence

The infrastructure foundation should be preserved, but user-facing decisions must treat workspace/project/task surfaces as legacy residue and keep the active product centered on Sorelo-native domain slices.

Target feature slices:

- `concepts`
- `links`
- `inspector`
- `scenarios`
- `evidence`
- `checks`

## Product Test

A change is aligned with Sorelo only if it helps answer at least one of these questions:

- What is this part of the person model?
- Why is it connected this way?
- What reaction path does this create?
- How can the user refine the model to make it more accurate?
