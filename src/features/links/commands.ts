import "server-only";

import { and, eq } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  requireActiveMap,
  requireWorkspaceMembership,
} from "@/features/maps/access";
import { db } from "@/shared/db/client";
import { concepts, links } from "@/shared/db/schema";

async function assertConceptMembership(
  workspaceId: string,
  mapId: string,
  conceptId: string
) {
  const [concept] = await db
    .select({ id: concepts.id })
    .from(concepts)
    .where(
      and(
        eq(concepts.id, conceptId),
        eq(concepts.workspaceId, workspaceId),
        eq(concepts.mapId, mapId)
      )
    )
    .limit(1);

  if (!concept) {
    throw new Error("One of the Concepts could not be found in this map.");
  }
}

export async function createLinkCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationType:
    | "causes"
    | "strengthens"
    | "weakens"
    | "explains"
    | "contradicts";
  strength: number;
  description?: string | null;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);
  await Promise.all([
    assertConceptMembership(input.workspaceId, input.mapId, input.sourceConceptId),
    assertConceptMembership(input.workspaceId, input.mapId, input.targetConceptId),
  ]);

  return db.transaction(async (tx) => {
    const [link] = await tx
      .insert(links)
      .values({
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        sourceConceptId: input.sourceConceptId,
        targetConceptId: input.targetConceptId,
        relationType: input.relationType,
        strength: input.strength,
        description: input.description || null,
        createdByUserId: input.actorUserId,
      })
      .returning();

    if (!link) {
      throw new Error("Link creation failed.");
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "link",
      entityId: link.id,
      action: "link.created",
      payload: {
        relationType: link.relationType,
        strength: link.strength,
      },
    });

    return link;
  });
}

export async function updateLinkCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  linkId: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationType:
    | "causes"
    | "strengthens"
    | "weakens"
    | "explains"
    | "contradicts";
  strength: number;
  description?: string | null;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);
  await Promise.all([
    assertConceptMembership(input.workspaceId, input.mapId, input.sourceConceptId),
    assertConceptMembership(input.workspaceId, input.mapId, input.targetConceptId),
  ]);

  const [link] = await db
    .update(links)
    .set({
      sourceConceptId: input.sourceConceptId,
      targetConceptId: input.targetConceptId,
      relationType: input.relationType,
      strength: input.strength,
      description: input.description || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(links.id, input.linkId),
        eq(links.workspaceId, input.workspaceId),
        eq(links.mapId, input.mapId)
      )
    )
    .returning();

  if (!link) {
    throw new Error("Link not found.");
  }

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "link",
    entityId: link.id,
    action: "link.updated",
    payload: {
      relationType: link.relationType,
      strength: link.strength,
    },
  });

  return link;
}

export async function deleteLinkCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  linkId: string;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  await db
    .delete(links)
    .where(
      and(
        eq(links.id, input.linkId),
        eq(links.workspaceId, input.workspaceId),
        eq(links.mapId, input.mapId)
      )
    );

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "link",
    entityId: input.linkId,
    action: "link.deleted",
  });
}
