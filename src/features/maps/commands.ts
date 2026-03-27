import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  requireActiveMap,
  requireWorkspaceGraphEditAccess,
  requireWorkspaceMapMetadataAccess,
} from "@/features/maps/access";
import { normalizeMapSlug } from "@/features/maps/utils";
import { db } from "@/shared/db/client";
import { maps } from "@/shared/db/schema";

type MapRevisionWriter = Pick<typeof db, "select" | "update">;

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
