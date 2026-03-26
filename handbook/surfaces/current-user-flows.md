# Current Sorelo User Flows

## Purpose

This document fixes the primary user flows that matter for v1.

Its role is to keep product, UX, and engineering aligned on how a user should move through the system without dead ends, ambiguity, or unnecessary friction.

## Core Rule

Every important flow in Sorelo must help the user reach a more explainable map faster than they could through disconnected notes.

The product should not force users to understand the whole system before they can produce value.

## Primary V1 Flow

The main v1 loop is:

1. sign in
2. enter or create a Workspace
3. create a Map
4. place the first Concept
5. place the second Concept
6. connect the first Link
7. run the first Scenario
8. inspect the explanation path

If the product makes this loop unclear, v1 is failing its main job.

## First User Journey

### Entry

The unauthenticated user lands on the marketing page and sees a clear explanation of what Sorelo is.

Primary action:

- continue with Google

### After Sign-In

If the user has no Workspace yet:

- send them directly to Workspace creation

If the user already belongs to one or more Workspaces:

- resolve the active Workspace
- send them into the map-first product path, not into an abstract dashboard

## Workspace Creation Flow

### Goal

Create the tenancy container with as little friction as possible.

### Expected Behavior

The form should ask only for what is necessary:

- workspace name
- workspace slug if explicitly needed

After successful creation:

- the user becomes `owner`
- the Workspace becomes active
- the user is sent to the maps home inside that Workspace

### What Must Not Happen

- no dead-end success state
- no need to manually choose the just-created Workspace again
- no redirect into legacy compatibility routes

## Maps Home Flow

### Purpose

Maps home is not a dashboard for unrelated widgets. It is the transition into active map building.

### If No Maps Exist

Show one primary onboarding state:

- explain that a Map is the container for one explainable person model
- show one clear CTA to create the first Map
- explain the next expected steps briefly:
  - first Concept
  - second Concept
  - first Link
  - first Scenario

### If Maps Exist

Maps home should support two things:

- open an existing Map quickly
- create another Map quickly

Recent Scenario runs are useful, but they must remain secondary to entering or creating a Map.

## Inbox Flow

### Purpose

Inbox is the workspace-visible operator workbench for evidence that may become map changes.

### Current Release Contract

- signed-in workspace operators can open Inbox from workspace section navigation
- the queue is scoped to the current workspace
- the user chooses a target Map before creating an Inbox item
- clarification and processing reruns happen in Inbox
- Inbox explains routing status and provenance
- review/apply happen in the Learning panel inside the target Map after promotion

### Expected Path

1. open Inbox from workspace navigation
2. pick the target Map and create an Inbox item
3. process the item or answer one clarification request
4. open the target Map Learning panel
5. resolve the promoted Learning suggestions

## Map Workspace Flow

### Purpose

The map screen is the main working environment of the product.

### Structural Rule

The screen should be understood as:

- top bar and compact map header for orientation and actions
- canvas as the primary work surface
- Inspector and Scenario as secondary bounded panels

### UX Rule

The user should never wonder where the main action is.

The canvas must visually dominate the screen.

## Guided Onboarding Flow Inside A Map

Onboarding inside the map is derived from actual state, not from a separate stored progress model.

### Step 1: No Concepts

Condition:

- zero Concepts

The product should tell the user:

- create the first Concept
- click on the canvas to place it

### Step 2: One Concept, No Link

Condition:

- one Concept
- zero Links

The product should tell the user:

- create the second Concept

### Step 3: Multiple Concepts, No Link

Condition:

- two or more Concepts
- zero Links

The product should tell the user:

- connect the first Link

### Step 4: Has Links, No Scenario Run

Condition:

- one or more Links
- zero Scenario runs

The product should tell the user:

- run the first Scenario

### Step 5: Done

Condition:

- the map already has Scenario runs

The product should shift from onboarding to active work:

- inspect
- refine
- run more Scenarios

## Concept Creation Flow

### Preferred Path

Canvas-first.

The expected path is:

1. click `New Concept`
2. click on the canvas
3. open Inspector with position already prefilled
4. enter title, type, summary, and optional description
5. save

### Why

This keeps the mental model correct:

- the user is building a structure in space
- not filling out a detached form first

### Acceptance Standard

Creating a Concept should feel faster than writing a loose note and coming back later to structure it.

## Link Creation Flow

### Preferred Path

Canvas-first.

The expected path is:

1. click `Create Link`
2. click source Concept
3. click target Concept
4. open Inspector with source and target already set
5. confirm or adjust relation type and strength
6. save

### Required Defaults

- relation type defaults to `causes`
- strength defaults to `3`

### Why

The user should feel that Links are created from structure, not from form ceremony.

## Inspector Flow

### Purpose

The Inspector is the detailed editing and understanding surface for the currently selected object.

### Expected Behavior

If a Concept is selected:

- show title
- show type
- show summary
- show description
- show connected Links in a compact way

If a Link is selected:

- show source
- show target
- show relation type
- show strength
- show explanation text

If nothing is selected:

- show only the current next step
- do not waste large vertical space on generic empty copy

### Rule

The Inspector should help the user understand and refine, not distract them from the canvas.

## Scenario Flow

### Purpose

A Scenario tests how the current map reacts to a concrete situation.

### Expected Path

1. open Scenario panel
2. enter a concrete situation
3. optionally save the Scenario
4. run it
5. inspect the ordered explanation path

### Required Outcome

The user must be able to answer:

- which Concepts activated
- which Links carried the logic
- why this path appeared

### Non-Goal For V1

The output does not need to feel "creative".

It needs to feel inspectable and coherent.

## Mobile Flow

Mobile must preserve the same conceptual workflow as desktop:

- canvas remains primary
- Inspector and Scenario open in a bounded sheet or drawer
- long content uses scrolling patterns that keep actions discoverable and context clear
- primary actions stay visible and understandable

The mobile version may be denser, but it must not become a different product model.

## Empty States

Every empty state must answer:

- what is missing
- why it matters
- what to do next

Required empty states in v1:

- no Workspaces
- no Maps
- no Concepts
- no Links
- no Scenario runs
- no saved Scenarios

## Error States

Critical paths must fail in a product-safe way.

Minimum requirement:

- create Workspace failure
- create Map failure
- create Concept failure
- create Link failure
- run Scenario failure
- permission denied
- not found

The user should understand:

- what failed
- whether data was saved or not
- what they can do next

## Permission-Denied Flow

The user must not enter screens or actions that obviously imply permissions they do not have.

If access is denied:

- explain that the action is unavailable in the current role
- keep the user inside the valid Workspace context
- avoid redirecting them into unrelated surfaces

## Flow Quality Test

A user flow is acceptable only if it is:

- direct
- explainable
- low-friction
- structurally aligned with the map model

If a flow adds clicks but not clarity, it should be reconsidered.
