import "server-only";

import { and, count, eq, isNull, or, sql } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  deriveConceptLineageTransitions,
  recordEntityLineageTransition,
  recordMapManualVersion,
} from "@/features/learning/evolution";
import {
  appendGraphOperationTx,
  bumpMapGraphRevision,
  bumpMapVersionRevision,
  createServerGraphOperationClientMetadata,
  EntityContentRevisionConflictError,
  findGraphOperationByClientMutation,
  MAP_GRAPH_OPERATION_KIND,
  MapRevisionConflictError,
  recordDuplicateClientMutationActivity,
  serializeMapGraphOperation,
  type SerializedMapGraphOperation,
} from "@/features/maps/commands";
import {
  requireActiveMap,
  requireWorkspaceGraphEditAccess,
} from "@/features/maps/access";
import { db } from "@/shared/db/client";
import {
  concepts,
  links,
  type EntityOriginType,
  type MapVersionTriggerType,
} from "@/shared/db/schema";

type ConceptCommandTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateConceptCommandInput = {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedRevision: number;
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
  originType?: EntityOriginType;
  originSuggestionId?: string | null;
  causedByResolutionId?: string | null;
  mapVersionTriggerType?: MapVersionTriggerType;
};

type UpdateConceptCommandInput = {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedContentRevision: number;
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
  originType?: EntityOriginType;
  originSuggestionId?: string | null;
  causedByResolutionId?: string | null;
  mapVersionTriggerType?: MapVersionTriggerType;
};

type StructuralGraphOperationClientInput = {
  clientId?: string | null;
  clientMutationId?: string | null;
};

type CreateConceptWithTxInput = CreateConceptCommandInput &
  StructuralGraphOperationClientInput;

export type CreateConceptWithOperationResult = {
  revision: number;
  seq: number;
  concept: typeof concepts.$inferSelect;
  op: SerializedMapGraphOperation;
  duplicate: boolean;
};

export type ArchiveConceptWithOperationResult = {
  revision: number;
  seq: number;
  conceptId: string;
  archivedLinkIds: string[];
  op: SerializedMapGraphOperation;
  duplicate: boolean;
};

export type RepositionConceptWithOperationResult = {
  revision: number;
  seq: number;
  concept: {
    id: string;
    x: number;
    y: number;
  };
  op: SerializedMapGraphOperation;
};

async function findActiveConceptPosition(
  tx: Pick<ConceptCommandTx, "select">,
  input: {
    workspaceId: string;
    mapId: string;
    conceptId: string;
  }
) {
  const [concept] = await tx
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

  return concept ?? null;
}

async function findConceptRecord(
  tx: Pick<ConceptCommandTx, "select">,
  input: {
    workspaceId: string;
    mapId: string;
    conceptId: string;
  }
) {
  const [concept] = await tx
    .select()
    .from(concepts)
    .where(
      and(
        eq(concepts.id, input.conceptId),
        eq(concepts.mapId, input.mapId),
        eq(concepts.workspaceId, input.workspaceId)
      )
    )
    .limit(1);

  return concept ?? null;
}

export async function createConceptWithTx(
  tx: ConceptCommandTx,
  input: CreateConceptWithTxInput
) {
  const operationClientMetadata =
    input.clientId && input.clientMutationId
      ? {
          clientId: input.clientId,
          clientMutationId: input.clientMutationId,
        }
      : createServerGraphOperationClientMetadata();
  const graphRevision = await bumpMapGraphRevision(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    expectedRevision: input.expectedRevision,
  });

  const [conceptCountRows, linkCountRows] = await Promise.all([
    tx
      .select({ value: count() })
      .from(concepts)
      .where(
        and(
          eq(concepts.mapId, input.mapId),
          eq(concepts.workspaceId, input.workspaceId),
          isNull(concepts.archivedAt)
        )
      ),
    tx
      .select({ value: count() })
      .from(links)
      .where(
        and(
          eq(links.mapId, input.mapId),
          eq(links.workspaceId, input.workspaceId),
          isNull(links.archivedAt)
        )
      ),
  ]);
  const conceptCountBefore = Number(conceptCountRows[0]?.value ?? 0);
  const linkCountBefore = Number(linkCountRows[0]?.value ?? 0);
  const isFirstConcept = conceptCountBefore === 0;

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
      originType: input.originType ?? "manual",
      originSuggestionId: input.originSuggestionId ?? null,
      x: input.x ?? 180,
      y: input.y ?? 180,
    })
    .returning();

  if (!concept) {
    throw new Error("Concept creation failed.");
  }

  const mapVersionNo = await bumpMapVersionRevision(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
  });

  await recordMapManualVersion(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    actorUserId: input.actorUserId,
    versionNo: mapVersionNo,
    triggerType: input.mapVersionTriggerType,
    causedByResolutionId: input.causedByResolutionId ?? null,
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

  if (isFirstConcept) {
    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "map",
      entityId: input.mapId,
      action: "core_loop.first_concept_created",
      payload: {
        conceptId: concept.id,
        conceptType: concept.conceptType,
        conceptCountBefore,
        conceptCountAfter: conceptCountBefore + 1,
        linkCountAtMoment: linkCountBefore,
      },
    });
  }

  const operation = await appendGraphOperationTx(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    seq: graphRevision,
    actorUserId: input.actorUserId,
    clientId: operationClientMetadata.clientId,
    clientMutationId: operationClientMetadata.clientMutationId,
    opKind: MAP_GRAPH_OPERATION_KIND.conceptCreate,
    entityType: "concept",
    entityId: concept.id,
    payload: {
      title: concept.title,
      conceptType: concept.conceptType,
      summary: concept.summary,
      description: concept.description,
      x: concept.x,
      y: concept.y,
      updatedAt: concept.updatedAt.toISOString(),
    },
  });

  return {
    concept,
    revision: graphRevision,
    op: serializeMapGraphOperation(operation),
  };
}

export async function updateConceptWithTx(
  tx: ConceptCommandTx,
  input: UpdateConceptCommandInput
) {
  const [existingConcept] = await tx
    .select({
      id: concepts.id,
      title: concepts.title,
      conceptType: concepts.conceptType,
      summary: concepts.summary,
      description: concepts.description,
      archivedAt: concepts.archivedAt,
      contentRevision: concepts.contentRevision,
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

  const nextUpdatedAt = new Date();
  const [concept] = await tx
    .update(concepts)
    .set({
      title: input.title,
      conceptType: input.conceptType,
      summary: input.summary || null,
      description: input.description || null,
      ...(input.originType
        ? {
            originType: input.originType,
            originSuggestionId: input.originSuggestionId ?? null,
          }
        : {}),
      contentRevision: sql`${concepts.contentRevision} + 1`,
      updatedAt: nextUpdatedAt,
    })
    .where(
      and(
        eq(concepts.id, input.conceptId),
        eq(concepts.mapId, input.mapId),
        eq(concepts.workspaceId, input.workspaceId),
        isNull(concepts.archivedAt),
        eq(concepts.contentRevision, input.expectedContentRevision)
      )
    )
    .returning();

  if (!concept) {
    const currentConcept = await findConceptRecord(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      conceptId: input.conceptId,
    });

    if (!currentConcept || currentConcept.archivedAt) {
      throw new Error("Concept not found.");
    }

    throw new EntityContentRevisionConflictError(
      "concept",
      currentConcept.contentRevision
    );
  }

  const versionNo = await bumpMapVersionRevision(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
  });

  await recordMapManualVersion(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    actorUserId: input.actorUserId,
    versionNo,
    triggerType: input.mapVersionTriggerType,
    causedByResolutionId: input.causedByResolutionId ?? null,
    snapshotJson: {
      entityType: "concept",
      concept: {
        id: concept.id,
        title: concept.title,
        conceptType: concept.conceptType,
        summary: concept.summary,
        description: concept.description,
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
      },
      after: {
        title: concept.title,
        conceptType: concept.conceptType,
        summary: concept.summary,
        description: concept.description,
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
        causedByResolutionId: input.causedByResolutionId ?? null,
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
}

export async function createConceptCommand(input: CreateConceptCommandInput) {
  const result = await createConceptWithOperationCommand(input);
  return result.concept;
}

export async function createConceptWithOperationCommand(
  input: CreateConceptCommandInput & StructuralGraphOperationClientInput
): Promise<CreateConceptWithOperationResult> {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const operationClientMetadata =
    input.clientId && input.clientMutationId
      ? {
          clientId: input.clientId,
          clientMutationId: input.clientMutationId,
        }
      : createServerGraphOperationClientMetadata();

  const replayDuplicateResult = async () => {
    const existingOperation = await findGraphOperationByClientMutation(db, {
      mapId: input.mapId,
      clientId: operationClientMetadata.clientId,
      clientMutationId: operationClientMetadata.clientMutationId,
    });

    if (!existingOperation) {
      return null;
    }

    if (existingOperation.opKind !== MAP_GRAPH_OPERATION_KIND.conceptCreate) {
      throw new Error(
        "Client mutation conflicts with an existing graph operation."
      );
    }

    const concept = await findConceptRecord(db, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      conceptId: existingOperation.entityId,
    });

    if (!concept) {
      throw new Error("Concept not found.");
    }

    return {
      revision: existingOperation.seq,
      seq: existingOperation.seq,
      concept,
      op: serializeMapGraphOperation(existingOperation),
      duplicate: true,
    } satisfies CreateConceptWithOperationResult;
  };

  const duplicateResult = await replayDuplicateResult();
  if (duplicateResult) {
    await recordDuplicateClientMutationActivity(db, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      mapId: input.mapId,
      operation: duplicateResult.op,
    });
    return duplicateResult;
  }

  try {
    const result = await db.transaction((tx) =>
      createConceptWithTx(tx, {
        ...input,
        ...operationClientMetadata,
      })
    );

    return {
      revision: result.revision,
      seq: result.revision,
      concept: result.concept,
      op: result.op,
      duplicate: false,
    };
  } catch (error) {
    if (error instanceof MapRevisionConflictError) {
      const conflictDuplicateResult = await replayDuplicateResult();
      if (conflictDuplicateResult) {
        await recordDuplicateClientMutationActivity(db, {
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          mapId: input.mapId,
          operation: conflictDuplicateResult.op,
        });
        return conflictDuplicateResult;
      }
    }

    throw error;
  }
}

export async function updateConceptCommand(input: UpdateConceptCommandInput) {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  return db.transaction((tx) => updateConceptWithTx(tx, input));
}

export async function repositionConceptCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedRevision: number;
  conceptId: string;
  x: number;
  y: number;
}) {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  return db.transaction(async (tx) => {
    await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      expectedRevision: input.expectedRevision,
    });

    const existingConcept = await findActiveConceptPosition(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      conceptId: input.conceptId,
    });

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

    const mapVersionNo = await bumpMapVersionRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordMapManualVersion(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      actorUserId: input.actorUserId,
      versionNo: mapVersionNo,
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

export async function repositionConceptWithOperationCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedRevision: number;
  conceptId: string;
  x: number;
  y: number;
  clientId: string;
  clientMutationId: string;
}): Promise<RepositionConceptWithOperationResult> {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const replayDuplicateResult = async () => {
    const existingOperation = await findGraphOperationByClientMutation(db, {
      mapId: input.mapId,
      clientId: input.clientId,
      clientMutationId: input.clientMutationId,
    });

    if (!existingOperation) {
      return null;
    }

    const concept = await findActiveConceptPosition(db, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      conceptId: input.conceptId,
    });

    if (!concept) {
      throw new Error("Concept not found.");
    }

    return {
      revision: existingOperation.seq,
      seq: existingOperation.seq,
      concept,
      op: serializeMapGraphOperation(existingOperation),
    } satisfies RepositionConceptWithOperationResult;
  };

  const duplicateResult = await replayDuplicateResult();
  if (duplicateResult) {
    await recordDuplicateClientMutationActivity(db, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      mapId: input.mapId,
      operation: duplicateResult.op,
    });
    return duplicateResult;
  }

  try {
    return await db.transaction(async (tx) => {
      const graphRevision = await bumpMapGraphRevision(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        expectedRevision: input.expectedRevision,
      });

      const existingConcept = await findActiveConceptPosition(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        conceptId: input.conceptId,
      });

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
        .returning({
          id: concepts.id,
          x: concepts.x,
          y: concepts.y,
        });

      if (!concept) {
        throw new Error("Concept not found.");
      }

      const operation = await appendGraphOperationTx(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        seq: graphRevision,
        actorUserId: input.actorUserId,
        clientId: input.clientId,
        clientMutationId: input.clientMutationId,
        opKind: MAP_GRAPH_OPERATION_KIND.conceptPositionSet,
        entityType: "concept",
        entityId: concept.id,
        payload: {
          x: concept.x,
          y: concept.y,
        },
      });

      const mapVersionNo = await bumpMapVersionRevision(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
      });

      await recordMapManualVersion(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        actorUserId: input.actorUserId,
        versionNo: mapVersionNo,
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

      return {
        revision: graphRevision,
        seq: graphRevision,
        concept,
        op: serializeMapGraphOperation(operation),
      };
    });
  } catch (error) {
    if (error instanceof MapRevisionConflictError) {
      const conflictDuplicateResult = await replayDuplicateResult();
      if (conflictDuplicateResult) {
        await recordDuplicateClientMutationActivity(db, {
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          mapId: input.mapId,
          operation: conflictDuplicateResult.op,
        });
        return conflictDuplicateResult;
      }
    }

    throw error;
  }
}

export async function repositionConceptsBatchCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedRevision: number;
  positions: Array<{
    conceptId: string;
    x: number;
    y: number;
  }>;
}) {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
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

    await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      expectedRevision: input.expectedRevision,
    });

    const mapVersionNo = await bumpMapVersionRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
    });

    await recordMapManualVersion(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      actorUserId: input.actorUserId,
      versionNo: mapVersionNo,
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

export async function archiveConceptCommand(
  input: {
    workspaceId: string;
    actorUserId: string;
    mapId: string;
    expectedRevision: number;
    conceptId: string;
  } & StructuralGraphOperationClientInput
) {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);

  const operationClientMetadata =
    input.clientId && input.clientMutationId
      ? {
          clientId: input.clientId,
          clientMutationId: input.clientMutationId,
        }
      : createServerGraphOperationClientMetadata();

  const replayDuplicateResult = async () => {
    if (!input.clientId || !input.clientMutationId) {
      return null;
    }

    const existingOperation = await findGraphOperationByClientMutation(db, {
      mapId: input.mapId,
      clientId: input.clientId,
      clientMutationId: input.clientMutationId,
    });

    if (!existingOperation) {
      return null;
    }

    if (existingOperation.opKind !== MAP_GRAPH_OPERATION_KIND.conceptArchive) {
      throw new Error(
        "Client mutation conflicts with an existing graph operation."
      );
    }

    const archivedLinkIds = Array.isArray(existingOperation.payload.archivedLinkIds)
      ? existingOperation.payload.archivedLinkIds.filter(
          (value): value is string => typeof value === "string"
        )
      : [];

    return {
      revision: existingOperation.seq,
      seq: existingOperation.seq,
      conceptId: existingOperation.entityId,
      archivedLinkIds,
      op: serializeMapGraphOperation(existingOperation),
      duplicate: true,
    } satisfies ArchiveConceptWithOperationResult;
  };

  const duplicateResult = await replayDuplicateResult();
  if (duplicateResult) {
    await recordDuplicateClientMutationActivity(db, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      mapId: input.mapId,
      operation: duplicateResult.op,
    });
    return duplicateResult;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const archivedAt = new Date();
      const graphRevision = await bumpMapGraphRevision(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        expectedRevision: input.expectedRevision,
      });

      const [concept] = await tx
        .update(concepts)
        .set({
          archivedAt,
          updatedAt: archivedAt,
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

      const archivedLinks = await tx
        .update(links)
        .set({
          archivedAt,
          archivedByUserId: input.actorUserId,
          updatedAt: archivedAt,
        })
        .where(
          and(
            eq(links.mapId, input.mapId),
            eq(links.workspaceId, input.workspaceId),
            isNull(links.archivedAt),
            or(
              eq(links.sourceConceptId, concept.id),
              eq(links.targetConceptId, concept.id)
            )
          )
        )
        .returning({
          id: links.id,
        });

      const mapVersionNo = await bumpMapVersionRevision(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
      });

      await recordMapManualVersion(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        actorUserId: input.actorUserId,
        versionNo: mapVersionNo,
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
            archivedLinkIds: archivedLinks.map((link) => link.id),
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

      for (const link of archivedLinks) {
        await recordEntityLineageTransition(tx, {
          workspaceId: input.workspaceId,
          mapId: input.mapId,
          entityType: "link",
          fromEntityId: link.id,
          toEntityId: null,
          transitionType: "archive",
        });
      }

      await recordActivity(tx, {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        entityType: "concept",
        entityId: concept.id,
        action: "concept.archived",
        payload: {
          archivedLinkCount: archivedLinks.length,
        },
      });

      for (const link of archivedLinks) {
        await recordActivity(tx, {
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          entityType: "link",
          entityId: link.id,
          action: "link.archived",
          payload: {
            archivedReason: "incident_concept_archived",
            conceptId: concept.id,
          },
        });
      }

      const operation = await appendGraphOperationTx(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        seq: graphRevision,
        actorUserId: input.actorUserId,
        clientId: operationClientMetadata.clientId,
        clientMutationId: operationClientMetadata.clientMutationId,
        opKind: MAP_GRAPH_OPERATION_KIND.conceptArchive,
        entityType: "concept",
        entityId: concept.id,
        payload: {
          archivedAt:
            concept.archivedAt?.toISOString() ?? archivedAt.toISOString(),
          archivedLinkIds: archivedLinks.map((link) => link.id),
        },
      });

      return {
        revision: graphRevision,
        seq: graphRevision,
        conceptId: concept.id,
        archivedLinkIds: archivedLinks.map((link) => link.id),
        op: serializeMapGraphOperation(operation),
        duplicate: false,
      } satisfies ArchiveConceptWithOperationResult;
    });

    return result;
  } catch (error) {
    if (error instanceof MapRevisionConflictError) {
      const conflictDuplicateResult = await replayDuplicateResult();
      if (conflictDuplicateResult) {
        await recordDuplicateClientMutationActivity(db, {
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          mapId: input.mapId,
          operation: conflictDuplicateResult.op,
        });
        return conflictDuplicateResult;
      }
    }

    throw error;
  }
}
