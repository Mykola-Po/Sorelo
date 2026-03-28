import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import {
  archiveConceptCommand,
  createConceptWithOperationCommand,
  repositionConceptWithOperationCommand,
  updateConceptCommand,
} from "@/features/concepts/commands";
import {
  createLinkWithOperationCommand,
  deleteLinkCommand,
  updateLinkCommand,
} from "@/features/links/commands";
import { EntityContentRevisionConflictError } from "@/features/maps/commands";
import {
  getFullGraphSnapshot,
  getMapGraphMetrics,
  getMapRevision,
  listMapGraphOperationsAfterSeq,
} from "@/features/maps/queries";
import { db, sqlClient } from "@/shared/db/client";
import {
  activityLog,
  concepts,
  links,
  mapGraphOperations,
  maps,
  users,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";

type MapScopeFixture = {
  userId: string;
  workspaceId: string;
  mapId: string;
  conceptId: string;
};

const trackedWorkspaceIds: string[] = [];
const trackedUserIds: string[] = [];

function createSlug(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function ensureMapGraphOperationsTable() {
  await sqlClient`
    create table if not exists public.map_graph_operations (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references public.workspaces(id) on delete cascade,
      map_id uuid not null,
      seq bigint not null,
      actor_user_id uuid not null references public.users(id) on delete restrict,
      client_id uuid not null,
      client_mutation_id uuid not null,
      op_kind varchar(96) not null,
      entity_type varchar(64) not null,
      entity_id uuid not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      constraint map_graph_operations_map_workspace_fk
        foreign key (map_id, workspace_id)
        references public.maps(id, workspace_id)
        on delete cascade
    )
  `;

  await sqlClient`
    create unique index if not exists map_graph_operations_map_seq_key
      on public.map_graph_operations(map_id, seq)
  `;

  await sqlClient`
    create unique index if not exists map_graph_operations_map_client_mutation_key
      on public.map_graph_operations(map_id, client_id, client_mutation_id)
  `;

  await sqlClient`
    create index if not exists map_graph_operations_map_seq_idx
      on public.map_graph_operations(map_id, seq)
  `;
}

async function ensureLinksTombstoneColumns() {
  await sqlClient`
    alter table public.links
      add column if not exists archived_at timestamptz
  `;

  await sqlClient`
    alter table public.links
      add column if not exists archived_by_user_id uuid references public.users(id) on delete set null
  `;
}

async function ensureLayoutContentRevisionColumns() {
  await sqlClient`
    alter table public.maps
      add column if not exists version_revision bigint not null default 0
  `;

  await sqlClient`
    alter table public.concepts
      add column if not exists content_revision bigint not null default 0
  `;

  await sqlClient`
    alter table public.links
      add column if not exists content_revision bigint not null default 0
  `;
}

async function createMapScopeFixture(label: string) {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const mapId = randomUUID();
  const conceptId = randomUUID();
  const workspaceSlug = createSlug(`graph-ops-${label}`);
  const now = new Date();
  const nowIso = now.toISOString();

  await sqlClient`
    insert into auth.users (
      id,
      aud,
      role,
      email,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    ) values (
      ${userId},
      'authenticated',
      'authenticated',
      ${`${workspaceSlug}@example.com`},
      ${nowIso},
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      ${nowIso},
      ${nowIso},
      false,
      false
    )
  `;

  await db.insert(users).values({
    id: userId,
    email: `${workspaceSlug}@example.com`,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaces).values({
    id: workspaceId,
    slug: workspaceSlug,
    name: `Graph Ops ${label}`,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: randomUUID(),
    workspaceId,
    userId,
    role: "owner",
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(maps).values({
    id: mapId,
    workspaceId,
    title: `Map ${label}`,
    slug: createSlug(`map-${label}`),
    subjectLabel: "Alex",
    description: "Graph operation integration fixture.",
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(concepts).values({
    id: conceptId,
    workspaceId,
    mapId,
    title: `Concept ${label}`,
    conceptType: "custom",
    x: 100,
    y: 120,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  trackedWorkspaceIds.push(workspaceId);
  trackedUserIds.push(userId);

  return {
    userId,
    workspaceId,
    mapId,
    conceptId,
  } satisfies MapScopeFixture;
}

describe.sequential("map graph operations integration", () => {
  beforeEach(async () => {
    trackedWorkspaceIds.length = 0;
    trackedUserIds.length = 0;
    await ensureMapGraphOperationsTable();
    await ensureLinksTombstoneColumns();
    await ensureLayoutContentRevisionColumns();
  });

  afterEach(async () => {
    if (trackedWorkspaceIds.length > 0) {
      await db
        .delete(workspaces)
        .where(inArray(workspaces.id, [...trackedWorkspaceIds]));
    }

    if (trackedUserIds.length > 0) {
      for (const userId of trackedUserIds) {
        await sqlClient`
          delete from auth.users
          where id = ${userId}
        `;
      }
    }
  });

  it("appends a durable concept.position.set operation and replays duplicate client mutations idempotently", async () => {
    const scope = await createMapScopeFixture("reposition");
    const clientId = randomUUID();
    const clientMutationId = randomUUID();

    const first = await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 240,
      y: 320,
      clientId,
      clientMutationId,
    });

    const replay = await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 240,
      y: 320,
      clientId,
      clientMutationId,
    });

    expect(first.revision).toBe(1);
    expect(first.seq).toBe(1);
    expect(first.op.opKind).toBe("concept.position.set");
    expect(first.op.payload).toEqual({
      x: 240,
      y: 320,
    });

    expect(replay.revision).toBe(1);
    expect(replay.seq).toBe(1);
    expect(replay.op.id).toBe(first.op.id);
    expect(replay.concept).toEqual({
      id: scope.conceptId,
      x: 240,
      y: 320,
    });

    const persistedRevision = await getMapRevision(scope.mapId, scope.workspaceId);
    expect(persistedRevision).toBe(1);

    const persistedOps = await db
      .select({
        id: mapGraphOperations.id,
      })
      .from(mapGraphOperations)
      .where(eq(mapGraphOperations.mapId, scope.mapId));

    expect(persistedOps).toHaveLength(1);
  });

  it("records transport activity for published and duplicate client mutations", async () => {
    const scope = await createMapScopeFixture("transport-activity");
    const clientId = randomUUID();
    const clientMutationId = randomUUID();

    const first = await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 240,
      y: 320,
      clientId,
      clientMutationId,
    });

    const replay = await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 240,
      y: 320,
      clientId,
      clientMutationId,
    });

    const transportActivity = await db
      .select({
        action: activityLog.action,
        payload: activityLog.payload,
      })
      .from(activityLog)
      .where(eq(activityLog.entityId, scope.mapId));

    const publishActivity = transportActivity.find(
      (entry) => entry.action === "map_transport.ops_published"
    );
    const duplicateActivity = transportActivity.find(
      (entry) => entry.action === "map_transport.duplicate_client_mutation"
    );

    expect(first.seq).toBe(1);
    expect(replay.seq).toBe(1);
    expect(publishActivity).toMatchObject({
      action: "map_transport.ops_published",
      payload: expect.objectContaining({
        seq: 1,
        opKind: "concept.position.set",
        entityType: "concept",
        entityId: scope.conceptId,
      }),
    });
    expect(duplicateActivity).toMatchObject({
      action: "map_transport.duplicate_client_mutation",
      payload: expect.objectContaining({
        seq: 1,
        opKind: "concept.position.set",
        entityType: "concept",
        entityId: scope.conceptId,
        clientId,
        clientMutationId,
      }),
    });
  });

  it("allows concept movement after a semantic concept edit without reusing the content conflict path", async () => {
    const scope = await createMapScopeFixture("content-split-concept");

    const updatedConcept = await updateConceptCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedContentRevision: 0,
      conceptId: scope.conceptId,
      title: "Edited concept",
      conceptType: "belief",
      summary: "Semantic update",
      description: "Inspector content changed first",
    });

    const move = await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 260,
      y: 300,
      clientId: randomUUID(),
      clientMutationId: randomUUID(),
    });

    await expect(
      updateConceptCommand({
        workspaceId: scope.workspaceId,
        actorUserId: scope.userId,
        mapId: scope.mapId,
        expectedContentRevision: 0,
        conceptId: scope.conceptId,
        title: "Stale edit",
        conceptType: "belief",
        summary: "Outdated content",
        description: "Should conflict on content revision",
      })
    ).rejects.toBeInstanceOf(EntityContentRevisionConflictError);

    await expect(
      updateConceptCommand({
        workspaceId: scope.workspaceId,
        actorUserId: scope.userId,
        mapId: scope.mapId,
        expectedContentRevision: 0,
        conceptId: scope.conceptId,
        title: "Stale edit",
        conceptType: "belief",
        summary: "Outdated content",
        description: "Should conflict on content revision",
      })
    ).rejects.toMatchObject({
      code: "entity_content_revision_conflict",
      currentRevision: 1,
    });

    const [persistedConcept] = await db
      .select({
        title: concepts.title,
        conceptType: concepts.conceptType,
        summary: concepts.summary,
        description: concepts.description,
        x: concepts.x,
        y: concepts.y,
        contentRevision: concepts.contentRevision,
      })
      .from(concepts)
      .where(eq(concepts.id, scope.conceptId));

    const metrics = await getMapGraphMetrics(scope.mapId, scope.workspaceId);
    const revision = await getMapRevision(scope.mapId, scope.workspaceId);
    const ops = await listMapGraphOperationsAfterSeq({
      mapId: scope.mapId,
      workspaceId: scope.workspaceId,
      afterSeq: 0,
      limit: 10,
    });

    expect(updatedConcept).toMatchObject({
      title: "Edited concept",
      conceptType: "belief",
      summary: "Semantic update",
      description: "Inspector content changed first",
      contentRevision: 1,
    });
    expect(move.revision).toBe(1);
    expect(persistedConcept).toMatchObject({
      title: "Edited concept",
      conceptType: "belief",
      summary: "Semantic update",
      description: "Inspector content changed first",
      x: 260,
      y: 300,
      contentRevision: 1,
    });
    expect(metrics).toMatchObject({
      revision: 1,
      conceptCount: 1,
      linkCount: 0,
    });
    expect(revision).toBe(1);
    expect(ops.ops).toHaveLength(1);
    expect(ops.ops[0]).toMatchObject({
      seq: 1,
      opKind: "concept.position.set",
      entityId: scope.conceptId,
    });
  });

  it("publishes durable concept.create and link.create operations for structural writes", async () => {
    const scope = await createMapScopeFixture("structural-create");
    const conceptClientId = randomUUID();
    const conceptMutationId = randomUUID();
    const linkClientId = randomUUID();
    const linkMutationId = randomUUID();

    const conceptResult = await createConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      title: "Created concept",
      conceptType: "belief",
      summary: "New meaning",
      description: "Created through durable transport",
      x: 320,
      y: 220,
      clientId: conceptClientId,
      clientMutationId: conceptMutationId,
    });

    const conceptReplay = await createConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      title: "Created concept",
      conceptType: "belief",
      summary: "New meaning",
      description: "Created through durable transport",
      x: 320,
      y: 220,
      clientId: conceptClientId,
      clientMutationId: conceptMutationId,
    });

    const linkResult = await createLinkWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: conceptResult.revision,
      sourceConceptId: scope.conceptId,
      targetConceptId: conceptResult.concept.id,
      relationType: "causes",
      strength: 4,
      description: "Structural delta link",
      clientId: linkClientId,
      clientMutationId: linkMutationId,
    });

    expect(conceptResult.revision).toBe(1);
    expect(conceptResult.seq).toBe(1);
    expect(conceptResult.op.opKind).toBe("concept.create");
    expect(conceptResult.op.payload).toMatchObject({
      title: "Created concept",
      conceptType: "belief",
      summary: "New meaning",
      description: "Created through durable transport",
      x: 320,
      y: 220,
    });
    expect(conceptReplay.duplicate).toBe(true);
    expect(conceptReplay.op.id).toBe(conceptResult.op.id);

    expect(linkResult.revision).toBe(2);
    expect(linkResult.seq).toBe(2);
    expect(linkResult.op.opKind).toBe("link.create");
    expect(linkResult.op.payload).toMatchObject({
      sourceConceptId: scope.conceptId,
      targetConceptId: conceptResult.concept.id,
      relationType: "causes",
      strength: 4,
      description: "Structural delta link",
    });

    const replay = await listMapGraphOperationsAfterSeq({
      mapId: scope.mapId,
      workspaceId: scope.workspaceId,
      afterSeq: 0,
      limit: 10,
    });

    expect(replay.revision).toBe(2);
    expect(replay.hasMore).toBe(false);
    expect(replay.ops).toHaveLength(2);
    expect(replay.ops[0]).toMatchObject({
      seq: 1,
      opKind: "concept.create",
      entityType: "concept",
      entityId: conceptResult.concept.id,
    });
    expect(replay.ops[1]).toMatchObject({
      seq: 2,
      opKind: "link.create",
      entityType: "link",
      entityId: linkResult.link.id,
    });
  });

  it("allows semantic link edits after graph revision changes and keeps stale content conflicts explicit", async () => {
    const scope = await createMapScopeFixture("content-split-link");
    const secondConceptId = randomUUID();
    const linkId = randomUUID();
    const now = new Date();

    await db.insert(concepts).values({
      id: secondConceptId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      title: "Linked concept",
      conceptType: "custom",
      x: 240,
      y: 180,
      createdByUserId: scope.userId,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(links).values({
      id: linkId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceConceptId: scope.conceptId,
      targetConceptId: secondConceptId,
      relationType: "causes",
      strength: 2,
      description: "Original link",
      createdByUserId: scope.userId,
      createdAt: now,
      updatedAt: now,
    });

    await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 190,
      y: 210,
      clientId: randomUUID(),
      clientMutationId: randomUUID(),
    });

    const updatedLink = await updateLinkCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedContentRevision: 0,
      linkId,
      sourceConceptId: scope.conceptId,
      targetConceptId: secondConceptId,
      relationType: "explains",
      strength: 5,
      description: "Semantic link update after drag",
    });

    await expect(
      updateLinkCommand({
        workspaceId: scope.workspaceId,
        actorUserId: scope.userId,
        mapId: scope.mapId,
        expectedContentRevision: 0,
        linkId,
        sourceConceptId: scope.conceptId,
        targetConceptId: secondConceptId,
        relationType: "weakens",
        strength: 1,
        description: "Outdated link edit",
      })
    ).rejects.toBeInstanceOf(EntityContentRevisionConflictError);

    await expect(
      updateLinkCommand({
        workspaceId: scope.workspaceId,
        actorUserId: scope.userId,
        mapId: scope.mapId,
        expectedContentRevision: 0,
        linkId,
        sourceConceptId: scope.conceptId,
        targetConceptId: secondConceptId,
        relationType: "weakens",
        strength: 1,
        description: "Outdated link edit",
      })
    ).rejects.toMatchObject({
      code: "entity_content_revision_conflict",
      currentRevision: 1,
    });

    const [persistedLink] = await db
      .select({
        relationType: links.relationType,
        strength: links.strength,
        description: links.description,
        contentRevision: links.contentRevision,
      })
      .from(links)
      .where(eq(links.id, linkId));

    const metrics = await getMapGraphMetrics(scope.mapId, scope.workspaceId);
    const ops = await listMapGraphOperationsAfterSeq({
      mapId: scope.mapId,
      workspaceId: scope.workspaceId,
      afterSeq: 0,
      limit: 10,
    });

    expect(updatedLink).toMatchObject({
      relationType: "explains",
      strength: 5,
      description: "Semantic link update after drag",
      contentRevision: 1,
    });
    expect(persistedLink).toMatchObject({
      relationType: "explains",
      strength: 5,
      description: "Semantic link update after drag",
      contentRevision: 1,
    });
    expect(metrics).toMatchObject({
      revision: 1,
      conceptCount: 2,
      linkCount: 1,
    });
    expect(ops.ops).toHaveLength(1);
    expect(ops.ops[0]).toMatchObject({
      seq: 1,
      opKind: "concept.position.set",
      entityId: scope.conceptId,
    });
  });

  it("lists ordered graph operations after a sequence cursor", async () => {
    const scope = await createMapScopeFixture("query");

    await repositionConceptWithOperationCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      x: 180,
      y: 220,
      clientId: randomUUID(),
      clientMutationId: randomUUID(),
    });

    const result = await listMapGraphOperationsAfterSeq({
      mapId: scope.mapId,
      workspaceId: scope.workspaceId,
      afterSeq: 0,
      limit: 10,
    });

    expect(result.revision).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]).toMatchObject({
      mapId: scope.mapId,
      seq: 1,
      opKind: "concept.position.set",
      entityType: "concept",
      entityId: scope.conceptId,
      payload: {
        x: 180,
        y: 220,
      },
    });
  });

  it("archives a deleted Link without leaving it visible in graph reads", async () => {
    const scope = await createMapScopeFixture("link-archive");
    const secondConceptId = randomUUID();
    const linkId = randomUUID();
    const clientId = randomUUID();
    const clientMutationId = randomUUID();
    const now = new Date();

    await db.insert(concepts).values({
      id: secondConceptId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      title: "Connected concept",
      conceptType: "custom",
      x: 240,
      y: 260,
      createdByUserId: scope.userId,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(links).values({
      id: linkId,
      workspaceId: scope.workspaceId,
      mapId: scope.mapId,
      sourceConceptId: scope.conceptId,
      targetConceptId: secondConceptId,
      relationType: "causes",
      strength: 2,
      createdByUserId: scope.userId,
      createdAt: now,
      updatedAt: now,
    });

    const deleteResult = await deleteLinkCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      linkId,
      clientId,
      clientMutationId,
    });

    const deleteReplay = await deleteLinkCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      linkId,
      clientId,
      clientMutationId,
    });

    const [persistedLink] = await db
      .select({
        id: links.id,
        archivedAt: links.archivedAt,
        archivedByUserId: links.archivedByUserId,
      })
      .from(links)
      .where(eq(links.id, linkId));

    const snapshot = await getFullGraphSnapshot(scope.mapId, scope.workspaceId);
    const metrics = await getMapGraphMetrics(scope.mapId, scope.workspaceId);
    const ops = await listMapGraphOperationsAfterSeq({
      mapId: scope.mapId,
      workspaceId: scope.workspaceId,
      afterSeq: 0,
      limit: 10,
    });

    expect(persistedLink).toMatchObject({
      id: linkId,
      archivedByUserId: scope.userId,
    });
    expect(persistedLink?.archivedAt).toBeInstanceOf(Date);
    expect(deleteResult.revision).toBe(1);
    expect(deleteResult.op.opKind).toBe("link.archive");
    expect(deleteResult.op.payload).toMatchObject({
      sourceConceptId: scope.conceptId,
      targetConceptId: secondConceptId,
    });
    expect(deleteReplay.duplicate).toBe(true);
    expect(deleteReplay.op.id).toBe(deleteResult.op.id);
    expect(snapshot?.counts.linkCount).toBe(0);
    expect(snapshot?.links).toEqual([]);
    expect(metrics).toMatchObject({
      revision: 1,
      conceptCount: 2,
      linkCount: 0,
    });
    expect(ops.ops).toHaveLength(1);
    expect(ops.ops[0]).toMatchObject({
      seq: 1,
      opKind: "link.archive",
      entityId: linkId,
    });
  });

  it("archives incident Links when a Concept is archived", async () => {
    const scope = await createMapScopeFixture("concept-archive");
    const outgoingConceptId = randomUUID();
    const incomingConceptId = randomUUID();
    const outgoingLinkId = randomUUID();
    const incomingLinkId = randomUUID();
    const clientId = randomUUID();
    const clientMutationId = randomUUID();
    const now = new Date();

    await db.insert(concepts).values([
      {
        id: outgoingConceptId,
        workspaceId: scope.workspaceId,
        mapId: scope.mapId,
        title: "Outgoing target",
        conceptType: "custom",
        x: 280,
        y: 180,
        createdByUserId: scope.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: incomingConceptId,
        workspaceId: scope.workspaceId,
        mapId: scope.mapId,
        title: "Incoming source",
        conceptType: "custom",
        x: 80,
        y: 180,
        createdByUserId: scope.userId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.insert(links).values([
      {
        id: outgoingLinkId,
        workspaceId: scope.workspaceId,
        mapId: scope.mapId,
        sourceConceptId: scope.conceptId,
        targetConceptId: outgoingConceptId,
        relationType: "strengthens",
        strength: 3,
        createdByUserId: scope.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: incomingLinkId,
        workspaceId: scope.workspaceId,
        mapId: scope.mapId,
        sourceConceptId: incomingConceptId,
        targetConceptId: scope.conceptId,
        relationType: "explains",
        strength: 1,
        createdByUserId: scope.userId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const archiveResult = await archiveConceptCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      clientId,
      clientMutationId,
    });

    const archiveReplay = await archiveConceptCommand({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      mapId: scope.mapId,
      expectedRevision: 0,
      conceptId: scope.conceptId,
      clientId,
      clientMutationId,
    });

    const archivedLinks = await db
      .select({
        id: links.id,
        archivedAt: links.archivedAt,
        archivedByUserId: links.archivedByUserId,
      })
      .from(links)
      .where(inArray(links.id, [outgoingLinkId, incomingLinkId]));

    const snapshot = await getFullGraphSnapshot(scope.mapId, scope.workspaceId);
    const metrics = await getMapGraphMetrics(scope.mapId, scope.workspaceId);
    const ops = await listMapGraphOperationsAfterSeq({
      mapId: scope.mapId,
      workspaceId: scope.workspaceId,
      afterSeq: 0,
      limit: 10,
    });

    expect(archivedLinks).toHaveLength(2);
    for (const archivedLink of archivedLinks) {
      expect(archivedLink.archivedAt).toBeInstanceOf(Date);
      expect(archivedLink.archivedByUserId).toBe(scope.userId);
    }

    expect(archiveResult.revision).toBe(1);
    expect(archiveResult.op.opKind).toBe("concept.archive");
    expect(archiveResult.archivedLinkIds.sort()).toEqual(
      [incomingLinkId, outgoingLinkId].sort()
    );
    expect(archiveReplay.duplicate).toBe(true);
    expect(archiveReplay.op.id).toBe(archiveResult.op.id);
    expect(snapshot?.counts).toEqual({
      conceptCount: 2,
      linkCount: 0,
    });
    expect(snapshot?.concepts.map((concept) => concept.id).sort()).toEqual(
      [incomingConceptId, outgoingConceptId].sort()
    );
    expect(snapshot?.links).toEqual([]);
    expect(metrics).toMatchObject({
      revision: 1,
      conceptCount: 2,
      linkCount: 0,
    });
    expect(ops.ops).toHaveLength(1);
    expect(ops.ops[0]).toMatchObject({
      seq: 1,
      opKind: "concept.archive",
      entityId: scope.conceptId,
      payload: {
        archivedLinkIds: expect.arrayContaining([outgoingLinkId, incomingLinkId]),
      },
    });
  });
});
