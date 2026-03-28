import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  requireActiveMap,
  requireWorkspaceGraphEditAccess,
  requireWorkspaceMapMetadataAccess,
} from "@/features/maps/access";
import {
  mapTransportTelemetryActions,
  type MapTransportTelemetryAction,
} from "@/features/map-runtime/realtime/transport-telemetry";
import { normalizeMapSlug } from "@/features/maps/utils";
import { db } from "@/shared/db/client";
import { learningMapVersions, mapGraphOperations, maps } from "@/shared/db/schema";

type MapRevisionWriter = Pick<typeof db, "select" | "update" | "insert">;
type MapGraphOperationWriter = Pick<typeof db, "select" | "insert">;
type MapTransportActivityWriter = Pick<typeof db, "insert">;

export const MAP_GRAPH_OPERATION_KIND = {
  conceptPositionSet: "concept.position.set",
  conceptCreate: "concept.create",
  conceptArchive: "concept.archive",
  linkCreate: "link.create",
  linkArchive: "link.archive",
} as const;

export type MapGraphOperationKind =
  (typeof MAP_GRAPH_OPERATION_KIND)[keyof typeof MAP_GRAPH_OPERATION_KIND];

export type MapGraphOperationRow = typeof mapGraphOperations.$inferSelect;

export type SerializedMapGraphOperation = {
  id: string;
  workspaceId: string;
  mapId: string;
  seq: number;
  actorUserId: string;
  clientId: string;
  clientMutationId: string;
  opKind: MapGraphOperationKind;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function createServerGraphOperationClientMetadata() {
  return {
    clientId: randomUUID(),
    clientMutationId: randomUUID(),
  };
}

export class MapRevisionConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "map_revision_conflict";
  readonly currentRevision: number;

  constructor(currentRevision: number) {
    super("Map changed since your last snapshot. Refresh and try again.");
    this.name = "MapRevisionConflictError";
    this.currentRevision = currentRevision;
  }
}

export class EntityContentRevisionConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "entity_content_revision_conflict";
  readonly entityType: "concept" | "link";
  readonly currentRevision: number;

  constructor(entityType: "concept" | "link", currentRevision: number) {
    super(
      entityType === "concept"
        ? "Concept changed since you opened Inspector. Refresh and try again."
        : "Link changed since you opened Inspector. Refresh and try again."
    );
    this.name = "EntityContentRevisionConflictError";
    this.entityType = entityType;
    this.currentRevision = currentRevision;
  }
}

export async function bumpMapGraphRevision(
  dbOrTx: MapRevisionWriter,
  input: {
    workspaceId: string;
    mapId: string;
    expectedRevision: number;
  }
) {
  const [map] = await dbOrTx
    .update(maps)
    .set({
      graphRevision: sql`${maps.graphRevision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(maps.id, input.mapId),
        eq(maps.workspaceId, input.workspaceId),
        isNull(maps.archivedAt),
        eq(maps.graphRevision, input.expectedRevision)
      )
    )
    .returning({ graphRevision: maps.graphRevision });

  if (!map) {
    const [currentMap] = await dbOrTx
      .select({
        revision: maps.graphRevision,
      })
      .from(maps)
      .where(
        and(
          eq(maps.id, input.mapId),
          eq(maps.workspaceId, input.workspaceId),
          isNull(maps.archivedAt)
        )
      )
      .limit(1);

    if (!currentMap) {
      throw new Error("Map not found.");
    }

    throw new MapRevisionConflictError(currentMap.revision);
  }

  return map.graphRevision;
}

export async function bumpMapVersionRevision(
  dbOrTx: MapRevisionWriter,
  input: {
    workspaceId: string;
    mapId: string;
  }
) {
  const [map] = await dbOrTx
    .update(maps)
    .set({
      versionRevision: sql<number>`greatest(
        ${maps.versionRevision},
        coalesce(
          (
            select max(${learningMapVersions.versionNo})::bigint
            from ${learningMapVersions}
            where ${learningMapVersions.mapId} = ${maps.id}
          ),
          0
        )
      ) + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(maps.id, input.mapId),
        eq(maps.workspaceId, input.workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .returning({ versionRevision: maps.versionRevision });

  if (!map) {
    throw new Error("Map not found.");
  }

  return map.versionRevision;
}

export function serializeMapGraphOperation(
  row: MapGraphOperationRow
): SerializedMapGraphOperation {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    mapId: row.mapId,
    seq: row.seq,
    actorUserId: row.actorUserId,
    clientId: row.clientId,
    clientMutationId: row.clientMutationId,
    opKind: row.opKind as MapGraphOperationKind,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: row.payload as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function appendGraphOperationTx(
  dbOrTx: MapGraphOperationWriter,
  input: {
    workspaceId: string;
    mapId: string;
    seq: number;
    actorUserId: string;
    clientId: string;
    clientMutationId: string;
    opKind: MapGraphOperationKind;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }
) {
  const [operation] = await dbOrTx
    .insert(mapGraphOperations)
    .values({
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      seq: input.seq,
      actorUserId: input.actorUserId,
      clientId: input.clientId,
      clientMutationId: input.clientMutationId,
      opKind: input.opKind,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
    })
    .returning();

  if (!operation) {
    throw new Error("Unable to append graph operation.");
  }

  await recordMapTransportActivity(dbOrTx, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    mapId: input.mapId,
    action: mapTransportTelemetryActions.opsPublished,
    payload: {
      seq: operation.seq,
      opKind: operation.opKind,
      entityType: operation.entityType,
      entityId: operation.entityId,
    },
  });

  return operation;
}

export async function findGraphOperationByClientMutation(
  dbOrTx: MapGraphOperationWriter,
  input: {
    mapId: string;
    clientId: string;
    clientMutationId: string;
  }
) {
  const [operation] = await dbOrTx
    .select()
    .from(mapGraphOperations)
    .where(
      and(
        eq(mapGraphOperations.mapId, input.mapId),
        eq(mapGraphOperations.clientId, input.clientId),
        eq(mapGraphOperations.clientMutationId, input.clientMutationId)
      )
    )
    .limit(1);

  return operation ?? null;
}

export async function recordMapTransportActivity(
  dbOrTx: MapTransportActivityWriter,
  input: {
    workspaceId: string;
    actorUserId: string;
    mapId: string;
    action: MapTransportTelemetryAction;
    payload?: Record<string, unknown>;
  }
) {
  await recordActivity(dbOrTx, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "map",
    entityId: input.mapId,
    action: input.action,
    ...(input.payload ? { payload: input.payload } : {}),
  });
}

export async function recordDuplicateClientMutationActivity(
  dbOrTx: MapTransportActivityWriter,
  input: {
    workspaceId: string;
    actorUserId: string;
    mapId: string;
    operation: Pick<
      MapGraphOperationRow,
      "seq" | "opKind" | "entityType" | "entityId" | "clientId" | "clientMutationId"
    >;
  }
) {
  await recordMapTransportActivity(dbOrTx, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    mapId: input.mapId,
    action: mapTransportTelemetryActions.duplicateClientMutation,
    payload: {
      seq: input.operation.seq,
      opKind: input.operation.opKind,
      entityType: input.operation.entityType,
      entityId: input.operation.entityId,
      clientId: input.operation.clientId,
      clientMutationId: input.operation.clientMutationId,
    },
  });
}

export async function createMapCommand(input: {
  workspaceId: string;
  actorUserId: string;
  title: string;
  slug?: string | null;
  subjectLabel: string;
  description?: string | null;
}) {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);

  return db.transaction(async (tx) => {
    const [map] = await tx
      .insert(maps)
      .values({
        workspaceId: input.workspaceId,
        createdByUserId: input.actorUserId,
        title: input.title,
        slug: normalizeMapSlug(input.slug || input.title),
        subjectLabel: input.subjectLabel,
        description: input.description || null,
      })
      .returning();

    if (!map) {
      throw new Error("Map creation failed.");
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "map",
      entityId: map.id,
      action: "map.created",
      payload: {
        title: map.title,
        subjectLabel: map.subjectLabel,
      },
    });

    return map;
  });
}

export async function renameMapCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  title: string;
  subjectLabel: string;
  description?: string | null;
}) {
  await requireWorkspaceMapMetadataAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const [map] = await db
    .update(maps)
    .set({
      title: input.title,
      subjectLabel: input.subjectLabel,
      description: input.description || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(maps.id, input.mapId),
        eq(maps.workspaceId, input.workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .returning();

  if (!map) {
    throw new Error("Map not found.");
  }

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "map",
    entityId: map.id,
    action: "map.renamed",
    payload: {
      title: map.title,
      subjectLabel: map.subjectLabel,
    },
  });

  return map;
}

export async function archiveMapCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
}) {
  await requireWorkspaceMapMetadataAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const [map] = await db
    .update(maps)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(maps.id, input.mapId),
        eq(maps.workspaceId, input.workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .returning();

  if (!map) {
    throw new Error("Map not found.");
  }

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "map",
    entityId: map.id,
    action: "map.archived",
  });
}
