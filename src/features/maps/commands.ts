import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import { requireActiveMap, requireWorkspaceMembership } from "@/features/maps/access";
import { normalizeMapSlug } from "@/features/maps/utils";
import { db } from "@/shared/db/client";
import { maps } from "@/shared/db/schema";

type MapRevisionWriter = Pick<typeof db, "update">;

export async function bumpMapGraphRevision(
  dbOrTx: MapRevisionWriter,
  input: {
    workspaceId: string;
    mapId: string;
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
        isNull(maps.archivedAt)
      )
    )
    .returning({ graphRevision: maps.graphRevision });

  if (!map) {
    throw new Error("Map not found.");
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
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);

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
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
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
  const membership = await requireWorkspaceMembership(
    input.workspaceId,
    input.actorUserId
  );
  await requireActiveMap(input.workspaceId, input.mapId);

  if (membership.role === "member") {
    throw new Error("Only admins and owners can archive a map.");
  }

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
