import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  deriveLinkLineageTransitions,
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

type LinkCommandTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateLinkCommandInput = {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedRevision: number;
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
  originType?: EntityOriginType;
  originSuggestionId?: string | null;
  causedByResolutionId?: string | null;
  mapVersionTriggerType?: MapVersionTriggerType;
};

type StructuralGraphOperationClientInput = {
  clientId?: string | null;
  clientMutationId?: string | null;
};

type CreateLinkWithTxInput = CreateLinkCommandInput &
  StructuralGraphOperationClientInput;

export type CreateLinkWithOperationResult = {
  revision: number;
  seq: number;
  link: typeof links.$inferSelect;
  op: ReturnType<typeof serializeMapGraphOperation>;
  duplicate: boolean;
};

export type ArchiveLinkWithOperationResult = {
  revision: number;
  seq: number;
  linkId: string;
  op: ReturnType<typeof serializeMapGraphOperation>;
  duplicate: boolean;
};

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
        eq(concepts.mapId, mapId),
        isNull(concepts.archivedAt)
      )
    )
    .limit(1);

  if (!concept) {
    throw new Error("One of the Concepts could not be found in this map.");
  }
}

async function findLinkRecord(
  tx: Pick<LinkCommandTx, "select">,
  input: {
    workspaceId: string;
    mapId: string;
    linkId: string;
  }
) {
  const [link] = await tx
    .select()
    .from(links)
    .where(
      and(
        eq(links.id, input.linkId),
        eq(links.workspaceId, input.workspaceId),
        eq(links.mapId, input.mapId)
      )
    )
    .limit(1);

  return link ?? null;
}

export async function createLinkWithTx(
  tx: LinkCommandTx,
  input: CreateLinkWithTxInput
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
  const conceptCountAtMoment = Number(conceptCountRows[0]?.value ?? 0);
  const linkCountBefore = Number(linkCountRows[0]?.value ?? 0);
  const isFirstLink = linkCountBefore === 0;

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
      originType: input.originType ?? "manual",
      originSuggestionId: input.originSuggestionId ?? null,
      createdByUserId: input.actorUserId,
    })
    .returning();

  if (!link) {
    throw new Error("Link creation failed.");
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

  if (isFirstLink) {
    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "map",
      entityId: input.mapId,
      action: "core_loop.first_link_created",
      payload: {
        linkId: link.id,
        sourceConceptId: link.sourceConceptId,
        targetConceptId: link.targetConceptId,
        relationType: link.relationType,
        conceptCountAtMoment,
        linkCountBefore,
        linkCountAfter: linkCountBefore + 1,
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
    opKind: MAP_GRAPH_OPERATION_KIND.linkCreate,
    entityType: "link",
    entityId: link.id,
    payload: {
      sourceConceptId: link.sourceConceptId,
      targetConceptId: link.targetConceptId,
      relationType: link.relationType,
      strength: link.strength,
      description: link.description,
      updatedAt: link.updatedAt.toISOString(),
    },
  });

  return {
    link,
    revision: graphRevision,
    op: serializeMapGraphOperation(operation),
  };
}

export async function createLinkCommand(input: CreateLinkCommandInput) {
  const result = await createLinkWithOperationCommand(input);
  return result.link;
}

export async function createLinkWithOperationCommand(
  input: CreateLinkCommandInput & StructuralGraphOperationClientInput
): Promise<CreateLinkWithOperationResult> {
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
  await requireActiveMap(input.workspaceId, input.mapId);
  await Promise.all([
    assertConceptMembership(input.workspaceId, input.mapId, input.sourceConceptId),
    assertConceptMembership(input.workspaceId, input.mapId, input.targetConceptId),
  ]);

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

    if (existingOperation.opKind !== MAP_GRAPH_OPERATION_KIND.linkCreate) {
      throw new Error(
        "Client mutation conflicts with an existing graph operation."
      );
    }

    const link = await findLinkRecord(db, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      linkId: existingOperation.entityId,
    });

    if (!link) {
      throw new Error("Link not found.");
    }

    return {
      revision: existingOperation.seq,
      seq: existingOperation.seq,
      link,
      op: serializeMapGraphOperation(existingOperation),
      duplicate: true,
    } satisfies CreateLinkWithOperationResult;
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
      createLinkWithTx(tx, {
        ...input,
        ...operationClientMetadata,
      })
    );

    return {
      revision: result.revision,
      seq: result.revision,
      link: result.link,
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

export async function updateLinkCommand(input: {
  workspaceId: string;
  actorUserId: string;
  mapId: string;
  expectedContentRevision: number;
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
  await requireWorkspaceGraphEditAccess(input.workspaceId, input.actorUserId);
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
        contentRevision: links.contentRevision,
      })
      .from(links)
      .where(
        and(
          eq(links.id, input.linkId),
          eq(links.workspaceId, input.workspaceId),
          eq(links.mapId, input.mapId),
          isNull(links.archivedAt)
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
        contentRevision: sql`${links.contentRevision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(links.id, input.linkId),
          eq(links.workspaceId, input.workspaceId),
          eq(links.mapId, input.mapId),
          isNull(links.archivedAt),
          eq(links.contentRevision, input.expectedContentRevision)
        )
      )
      .returning();

    if (!link) {
      const currentLink = await findLinkRecord(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        linkId: input.linkId,
      });

      if (!currentLink || currentLink.archivedAt) {
        throw new Error("Link not found.");
      }

      throw new EntityContentRevisionConflictError(
        "link",
        currentLink.contentRevision
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

export async function deleteLinkCommand(
  input: {
    workspaceId: string;
    actorUserId: string;
    mapId: string;
    expectedRevision: number;
    linkId: string;
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

    if (existingOperation.opKind !== MAP_GRAPH_OPERATION_KIND.linkArchive) {
      throw new Error(
        "Client mutation conflicts with an existing graph operation."
      );
    }

    return {
      revision: existingOperation.seq,
      seq: existingOperation.seq,
      linkId: existingOperation.entityId,
      op: serializeMapGraphOperation(existingOperation),
      duplicate: true,
    } satisfies ArchiveLinkWithOperationResult;
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
    const archivedAt = new Date();
    const graphRevision = await bumpMapGraphRevision(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      expectedRevision: input.expectedRevision,
    });

    const [archivedLink] = await tx
      .update(links)
      .set({
        archivedAt,
        archivedByUserId: input.actorUserId,
        updatedAt: archivedAt,
      })
      .where(
        and(
          eq(links.id, input.linkId),
          eq(links.workspaceId, input.workspaceId),
          eq(links.mapId, input.mapId),
          isNull(links.archivedAt)
        )
      )
      .returning({
        id: links.id,
        sourceConceptId: links.sourceConceptId,
        targetConceptId: links.targetConceptId,
        relationType: links.relationType,
        strength: links.strength,
        description: links.description,
        archivedAt: links.archivedAt,
      });

    if (!archivedLink) {
      throw new Error("Link not found.");
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
        entityType: "link",
        link: {
          id: archivedLink.id,
          sourceConceptId: archivedLink.sourceConceptId,
          targetConceptId: archivedLink.targetConceptId,
          relationType: archivedLink.relationType,
          strength: archivedLink.strength,
          description: archivedLink.description,
          archivedAt: archivedLink.archivedAt,
        },
      },
      diffJson: {
        action: "link.archived",
        linkId: archivedLink.id,
        before: {
          sourceConceptId: archivedLink.sourceConceptId,
          targetConceptId: archivedLink.targetConceptId,
          relationType: archivedLink.relationType,
          strength: archivedLink.strength,
          description: archivedLink.description,
        },
        after: {
          archivedAt: archivedLink.archivedAt,
        },
      },
    });

    await recordEntityLineageTransition(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      entityType: "link",
      fromEntityId: archivedLink.id,
      toEntityId: null,
      transitionType: "archive",
    });

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "link",
      entityId: input.linkId,
      action: "link.archived",
    });
      const operation = await appendGraphOperationTx(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        seq: graphRevision,
        actorUserId: input.actorUserId,
        clientId: operationClientMetadata.clientId,
        clientMutationId: operationClientMetadata.clientMutationId,
        opKind: MAP_GRAPH_OPERATION_KIND.linkArchive,
        entityType: "link",
        entityId: archivedLink.id,
        payload: {
          sourceConceptId: archivedLink.sourceConceptId,
          targetConceptId: archivedLink.targetConceptId,
          archivedAt: archivedLink.archivedAt?.toISOString() ?? archivedAt.toISOString(),
        },
      });

      return {
        revision: graphRevision,
        seq: graphRevision,
        linkId: archivedLink.id,
        op: serializeMapGraphOperation(operation),
        duplicate: false,
      } satisfies ArchiveLinkWithOperationResult;
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
