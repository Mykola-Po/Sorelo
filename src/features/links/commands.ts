import "server-only";

import { and, eq } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  deriveLinkLineageTransitions,
  recordEntityLineageTransition,
  recordMapManualVersion,
} from "@/features/learning/evolution";
import { bumpMapGraphRevision } from "@/features/maps/commands";
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

    const versionNo = await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordMapManualVersion(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      actorUserId: input.actorUserId,
      versionNo,
      snapshotJson: {
        entityType: "link",
        link: {
          id: link.id,
          sourceConceptId: link.sourceConceptId,
          targetConceptId: link.targetConceptId,
          relationType: link.relationType,
          strength: link.strength,
          description: link.description,
        },
      },
      diffJson: {
        action: "link.created",
        linkId: link.id,
        before: null,
        after: {
          sourceConceptId: link.sourceConceptId,
          targetConceptId: link.targetConceptId,
          relationType: link.relationType,
          strength: link.strength,
          description: link.description,
        },
      },
    });

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

  return db.transaction(async (tx) => {
    const [existingLink] = await tx
      .select({
        id: links.id,
        sourceConceptId: links.sourceConceptId,
        targetConceptId: links.targetConceptId,
        relationType: links.relationType,
        strength: links.strength,
        description: links.description,
      })
      .from(links)
      .where(
        and(
          eq(links.id, input.linkId),
          eq(links.workspaceId, input.workspaceId),
          eq(links.mapId, input.mapId)
        )
      )
      .limit(1);

    if (!existingLink) {
      throw new Error("Link not found.");
    }

    const [link] = await tx
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

    const versionNo = await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordMapManualVersion(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      actorUserId: input.actorUserId,
      versionNo,
      snapshotJson: {
        entityType: "link",
        link: {
          id: link.id,
          sourceConceptId: link.sourceConceptId,
          targetConceptId: link.targetConceptId,
          relationType: link.relationType,
          strength: link.strength,
          description: link.description,
        },
      },
      diffJson: {
        action: "link.updated",
        linkId: link.id,
        before: {
          sourceConceptId: existingLink.sourceConceptId,
          targetConceptId: existingLink.targetConceptId,
          relationType: existingLink.relationType,
          strength: existingLink.strength,
          description: existingLink.description,
        },
        after: {
          sourceConceptId: link.sourceConceptId,
          targetConceptId: link.targetConceptId,
          relationType: link.relationType,
          strength: link.strength,
          description: link.description,
        },
      },
    });

    const linkTransitions = deriveLinkLineageTransitions({
      beforeRelationType: existingLink.relationType,
      afterRelationType: link.relationType,
    });

    for (const transitionType of linkTransitions) {
      await recordEntityLineageTransition(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        entityType: "link",
        fromEntityId: link.id,
        toEntityId: link.id,
        transitionType,
      });
    }

    await recordActivity(tx, {
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
  });
}

export async function deleteLinkCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  linkId: string;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  await db.transaction(async (tx) => {
    const [deletedLink] = await tx
      .delete(links)
      .where(
        and(
          eq(links.id, input.linkId),
          eq(links.workspaceId, input.workspaceId),
          eq(links.mapId, input.mapId)
        )
      )
      .returning({
        id: links.id,
        sourceConceptId: links.sourceConceptId,
        targetConceptId: links.targetConceptId,
        relationType: links.relationType,
        strength: links.strength,
        description: links.description,
      });

    const versionNo = await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordMapManualVersion(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      actorUserId: input.actorUserId,
      versionNo,
      snapshotJson: {
        entityType: "link",
        linkId: deletedLink?.id ?? input.linkId,
      },
      diffJson: {
        action: "link.deleted",
        linkId: deletedLink?.id ?? input.linkId,
        before: deletedLink
          ? {
              sourceConceptId: deletedLink.sourceConceptId,
              targetConceptId: deletedLink.targetConceptId,
              relationType: deletedLink.relationType,
              strength: deletedLink.strength,
              description: deletedLink.description,
            }
          : null,
        after: null,
      },
    });

    if (deletedLink) {
      await recordEntityLineageTransition(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        entityType: "link",
        fromEntityId: deletedLink.id,
        toEntityId: null,
        transitionType: "archive",
      });
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "link",
      entityId: input.linkId,
      action: "link.deleted",
    });
  });
}
