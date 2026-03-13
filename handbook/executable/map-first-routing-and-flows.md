# Map-First Routing and Flows

## Purpose

This document records the route and redirect behavior that currently makes Sorelo map-first instead of dashboard-first.

## Root Entry

### `/`

Unauthenticated users land on the marketing page.

Authenticated users are redirected into `/app`.

## Authenticated Root

### `/app`

The current root flow is:

1. require an authenticated user
2. if no workspaces exist, redirect to `/app/new-workspace`
3. if a last active workspace exists, redirect there
4. otherwise resolve the preferred workspace from cookie or first membership
5. redirect into `/app/[workspaceSlug]`

## Workspace Creation

### `/app/new-workspace`

This remains the only first-time onboarding screen before map work begins.

The created workspace becomes the persistent operating context.

## Workspace Root

### `/app/[workspaceSlug]`

The workspace root is map-first:

- if maps exist, redirect to the first map
- if no maps exist, redirect to maps home

## Maps Home

### `/app/[workspaceSlug]/maps`

Maps home is the transition into active map work.

It currently supports:

- creating a map
- opening an existing map
- viewing recent Scenario runs as secondary context

## Map Workspace

### `/app/[workspaceSlug]/maps/[mapId]`

This is the main working environment:

- canvas-first
- Inspector and Scenario as bounded side surfaces
- map metrics, scenarios, and recent runs loaded from server-side queries

## Legacy Compatibility Routes

### `/app/[workspaceSlug]/projects`
### `/app/[workspaceSlug]/projects/[projectId]`

These routes currently remain in place only as compatibility redirects back into the maps-first path.

They do not represent the active product model.
