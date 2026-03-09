# Sorelo Content Documentation Framework

## Purpose

This document fixes how Sorelo should be described in product copy, help, onboarding, and marketing.

Its job is to remove wording drift and make sure the same object is explained the same way everywhere.

## Core Rule

Every important object, tool, and action in Sorelo must be documented through the same sequence:

1. What it is
2. Why it exists
3. When to use it
4. How to use it
5. What happens next

## Mandatory Vocabulary

The default product vocabulary is:

- `Concept`
- `Link`
- `Inspector`
- `Scenario`

Supporting vocabulary:

- `Evidence`
- `Check`
- `Cluster`
- `Workspace`
- `Share view`

Do not casually replace these with synonyms in different parts of the product.

## Documentation Levels

Each key object should have these layers of explanation:

1. Name
2. One-line definition
3. Purpose
4. Usage guidance
5. Extended explanation
6. Context variants for labels, tooltips, empty states, onboarding, and help

## What Must Be Documented

Sorelo documentation must cover:

- core entities
- tools and panels
- actions
- field meanings
- statuses and signals
- empty states
- onboarding
- marketing layer

## Required Entity Set

At minimum, maintain documentation cards for:

- Concept
- Link
- Inspector
- Scenario
- Evidence
- Check
- Cluster

## Required Tool Set

At minimum, maintain documentation cards for:

- Inspector
- Search
- Quick create
- Scenario panel
- Check panel
- Filters
- Hints
- Help mode

## Required Action Set

At minimum, maintain documentation cards for:

- create
- open
- edit
- link
- delete
- archive
- run scenario
- attach evidence
- share

## Entity Documentation Template

For each entity, document:

1. Official name
2. Short definition
3. Purpose
4. When to use it
5. How to use it
6. What it is not
7. What happens after acting on it
8. Related entities
9. Context variants
10. Common misunderstandings

## Tool Documentation Template

For each tool, document:

1. Name
2. What it is
3. Why it exists
4. When it appears
5. What can be done there
6. Best-practice usage
7. What should not be done through it
8. What data it shows
9. Context variants

## Empty-State Rule

An empty state should not only say that nothing exists. It should explain:

- what is missing
- why that section matters
- what to do now
- what action is the next obvious step

## Naming Rules

- Use one stable name for one object.
- Do not mix technical vocabulary and user-facing vocabulary.
- Do not invent decorative synonyms when the object is the same.
- If a simpler secondary wording is needed, define it explicitly and use it consistently.

## Content Quality Rules

Do:

- write directly
- explain user value
- explain consequences of actions
- keep labels short
- keep terminology stable

Do not:

- write abstract slogans instead of meaning
- overload tooltips
- let product, help, and marketing drift apart
- hide meaning behind technical or vague language

## Implementation Consequence

As Sorelo is rebuilt around Concepts, Links, Inspector, and Scenarios, every new screen and panel should ship with matching content definitions instead of ad hoc copy.
