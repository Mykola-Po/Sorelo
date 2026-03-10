import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import { bumpMapGraphRevision } from "@/features/maps/commands";
import {
  requireActiveMap,
  requireWorkspaceMembership,
} from "@/features/maps/access";
import { db } from "@/shared/db/client";
import { concepts } from "@/shared/db/schema";

export async function createConceptCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  title: string;
  conceptType:
    | "thought"
    | "state"
    | "belief"
    | "experience"
    | "fact"
    | "trigger"
    | "custom";
  summary?: string | null;
  description?: string | null;
  x?: number | null;
  y?: number | null;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  return db.transaction(async (tx) => {
    const [concept] = await tx
      .insert(concepts)
      .values({
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        createdByUserId: input.actorUserId,
        title: input.title,
        conceptType: input.conceptType,
        summary: input.summary || null,
        description: input.description || null,
        x: input.x ?? 180,
        y: input.y ?? 180,
      })
      .returning();

    if (!concept) {
      throw new Error("Concept creation failed.");
    }

    await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "concept",
      entityId: concept.id,
      action: "concept.created",
      payload: {
        title: concept.title,
        conceptType: concept.conceptType,
      },
    });

    return concept;
  });
}

export async function updateConceptCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  conceptId: string;
  title: string;
  conceptType:
    | "thought"
    | "state"
    | "belief"
    | "experience"
    | "fact"
    | "trigger"
    | "custom";
  summary?: string | null;
  description?: string | null;
  x: number;
  y: number;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  return db.transaction(async (tx) => {
    const [concept] = await tx
      .update(concepts)
      .set({
        title: input.title,
        conceptType: input.conceptType,
        summary: input.summary || null,
        description: input.description || null,
        x: input.x,
        y: input.y,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(concepts.id, input.conceptId),
          eq(concepts.mapId, input.mapId),
          eq(concepts.workspaceId, input.workspaceId),
          isNull(concepts.archivedAt)
        )
      )
      .returning();

    if (!concept) {
      throw new Error("Concept not found.");
    }

    await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "concept",
      entityId: concept.id,
      action: "concept.updated",
      payload: {
        title: concept.title,
        conceptType: concept.conceptType,
      },
    });

    return concept;
  });
}

export async function repositionConceptCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  conceptId: string;
  x: number;
  y: number;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  return db.transaction(async (tx) => {
    const [concept] = await tx
      .update(concepts)
      .set({
        x: input.x,
        y: input.y,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(concepts.id, input.conceptId),
          eq(concepts.mapId, input.mapId),
          eq(concepts.workspaceId, input.workspaceId),
          isNull(concepts.archivedAt)
        )
      )
      .returning();

    if (!concept) {
      throw new Error("Concept not found.");
    }

    await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "concept",
      entityId: concept.id,
      action: "concept.repositioned",
      payload: {
        x: concept.x,
        y: concept.y,
      },
    });

    return concept;
  });
}

export async function archiveConceptCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  conceptId: string;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  await db.transaction(async (tx) => {
    const [concept] = await tx
      .update(concepts)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(concepts.id, input.conceptId),
          eq(concepts.mapId, input.mapId),
          eq(concepts.workspaceId, input.workspaceId),
          isNull(concepts.archivedAt)
        )
      )
      .returning();

    if (!concept) {
      throw new Error("Concept not found.");
    }

    await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "concept",
      entityId: concept.id,
      action: "concept.archived",
    });
  });
}
