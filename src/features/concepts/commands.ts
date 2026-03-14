import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  deriveConceptLineageTransitions,
  recordEntityLineageTransition,
  recordMapManualVersion,
} from "@/features/learning/evolution";
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
        entityType: "concept",
        concept: {
          id: concept.id,
          title: concept.title,
          conceptType: concept.conceptType,
          summary: concept.summary,
          description: concept.description,
          x: concept.x,
          y: concept.y,
          archivedAt: concept.archivedAt,
        },
      },
      diffJson: {
        action: "concept.created",
        conceptId: concept.id,
        before: null,
        after: {
          title: concept.title,
          conceptType: concept.conceptType,
          summary: concept.summary,
          description: concept.description,
          x: concept.x,
          y: concept.y,
        },
      },
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
    const [existingConcept] = await tx
      .select({
        id: concepts.id,
        title: concepts.title,
        conceptType: concepts.conceptType,
        summary: concepts.summary,
        description: concepts.description,
        x: concepts.x,
        y: concepts.y,
        archivedAt: concepts.archivedAt,
      })
      .from(concepts)
      .where(
        and(
          eq(concepts.id, input.conceptId),
          eq(concepts.mapId, input.mapId),
          eq(concepts.workspaceId, input.workspaceId),
          isNull(concepts.archivedAt)
        )
      )
      .limit(1);

    if (!existingConcept) {
      throw new Error("Concept not found.");
    }

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
        entityType: "concept",
        concept: {
          id: concept.id,
          title: concept.title,
          conceptType: concept.conceptType,
          summary: concept.summary,
          description: concept.description,
          x: concept.x,
          y: concept.y,
          archivedAt: concept.archivedAt,
        },
      },
      diffJson: {
        action: "concept.updated",
        conceptId: concept.id,
        before: {
          title: existingConcept.title,
          conceptType: existingConcept.conceptType,
          summary: existingConcept.summary,
          description: existingConcept.description,
          x: existingConcept.x,
          y: existingConcept.y,
        },
        after: {
          title: concept.title,
          conceptType: concept.conceptType,
          summary: concept.summary,
          description: concept.description,
          x: concept.x,
          y: concept.y,
        },
      },
    });

    const conceptTransitions = deriveConceptLineageTransitions({
      before: {
        title: existingConcept.title,
        conceptType: existingConcept.conceptType,
        archivedAt: existingConcept.archivedAt,
      },
      after: {
        title: concept.title,
        conceptType: concept.conceptType,
        archivedAt: concept.archivedAt,
      },
    });

    for (const transitionType of conceptTransitions) {
      await recordEntityLineageTransition(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        entityType: "concept",
        fromEntityId: concept.id,
        toEntityId: concept.id,
        transitionType,
      });
    }

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
    const [existingConcept] = await tx
      .select({
        id: concepts.id,
        x: concepts.x,
        y: concepts.y,
      })
      .from(concepts)
      .where(
        and(
          eq(concepts.id, input.conceptId),
          eq(concepts.mapId, input.mapId),
          eq(concepts.workspaceId, input.workspaceId),
          isNull(concepts.archivedAt)
        )
      )
      .limit(1);

    if (!existingConcept) {
      throw new Error("Concept not found.");
    }

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
        entityType: "concept",
        concept: {
          id: concept.id,
          x: concept.x,
          y: concept.y,
        },
      },
      diffJson: {
        action: "concept.repositioned",
        conceptId: concept.id,
        before: {
          x: existingConcept.x,
          y: existingConcept.y,
        },
        after: {
          x: concept.x,
          y: concept.y,
        },
      },
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

export async function repositionConceptsBatchCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  positions: Array<{
    conceptId: string;
    x: number;
    y: number;
  }>;
}) {
  await requireWorkspaceMembership(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const dedupedPositions = Array.from(
    new Map(
      input.positions.map((position) => [
        position.conceptId,
        {
          conceptId: position.conceptId,
          x: position.x,
          y: position.y,
        },
      ])
    ).values()
  );

  if (dedupedPositions.length === 0) {
    return [];
  }

  return db.transaction(async (tx) => {
    const updatedConcepts: Array<{
      id: string;
      x: number;
      y: number;
    }> = [];

    for (const position of dedupedPositions) {
      const [concept] = await tx
        .update(concepts)
        .set({
          x: position.x,
          y: position.y,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(concepts.id, position.conceptId),
            eq(concepts.mapId, input.mapId),
            eq(concepts.workspaceId, input.workspaceId),
            isNull(concepts.archivedAt)
          )
        )
        .returning({
          id: concepts.id,
          x: concepts.x,
          y: concepts.y,
        });

      if (concept) {
        updatedConcepts.push(concept);
      }
    }

    if (updatedConcepts.length === 0) {
      return [];
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
        entityType: "map",
        movedConceptCount: updatedConcepts.length,
      },
      diffJson: {
        action: "concept.repositioned.batch",
        concepts: updatedConcepts.map((concept) => ({
          id: concept.id,
          x: concept.x,
          y: concept.y,
        })),
      },
    });

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "map",
      entityId: input.mapId,
      action: "concept.repositioned.batch",
      payload: {
        count: updatedConcepts.length,
      },
    });

    return updatedConcepts;
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
        entityType: "concept",
        concept: {
          id: concept.id,
          title: concept.title,
          conceptType: concept.conceptType,
          archivedAt: concept.archivedAt,
        },
      },
      diffJson: {
        action: "concept.archived",
        conceptId: concept.id,
        after: {
          archivedAt: concept.archivedAt,
        },
      },
    });

    await recordEntityLineageTransition(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      entityType: "concept",
      fromEntityId: concept.id,
      toEntityId: null,
      transitionType: "archive",
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
