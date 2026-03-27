import "server-only";

import { createHash } from "node:crypto";

import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";

import { createConceptWithTx, updateConceptWithTx } from "@/features/concepts/commands";
import {
  inboxApplyContractSchema,
  inboxApplyOperationSchema,
  type InboxApplyConceptRef,
  type InboxApplyOperation,
  type StructuredPacketDraft,
} from "@/features/inbox/schemas";
import { createLinkWithTx } from "@/features/links/commands";
import {
  attachSuggestionOriginInputSchema,
  inboxReviewArtifactPayloadSchema,
  sourceFragmentInputSchema,
  suggestionBatchInputSchema,
  suggestionInputSchema,
  suggestionResolutionInputSchema,
  type AttachSuggestionOriginInput,
  type InboxReviewArtifactPayload,
  type SourceFragmentInput,
  type SuggestionBatchInput,
  type SuggestionInput,
  type SuggestionResolutionInput,
} from "@/features/learning/schemas";
import {
  mapSourceFragmentRecord,
  mapSuggestionBatchRecord,
  mapSuggestionRecord,
  mapSuggestionResolutionRecord,
} from "@/features/learning/mappers";
import { requireWorkspaceLearningReviewAccess } from "@/features/maps/access";
import { db } from "@/shared/db/client";
import {
  concepts,
  inboxFragments,
  inboxItems,
  inboxStructuredPackets,
  inboxWorkflowEvents,
  learningCanonicalMutationEvidence,
  learningCanonicalMutationProvenance,
  learningSourceFragments,
  learningMapVersions,
  learningSuggestionBatches,
  learningSuggestionResolutions,
  learningSuggestions,
  links,
  maps,
  scenarios,
  workspaces,
  type InboxItemStatus,
  type SuggestionResolutionType,
} from "@/shared/db/schema";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type MaterializeInboxReviewBatchInput = {
  item: typeof inboxItems.$inferSelect;
  packetId: string;
  packet: StructuredPacketDraft;
};

type ConceptReviewSnapshot = {
  title: string;
  conceptType:
    | "thought"
    | "state"
    | "belief"
    | "experience"
    | "fact"
    | "trigger"
    | "custom";
  summary: string | null;
  description: string | null;
  x: number;
  y: number;
};

type LinkReviewSnapshot = {
  source: InboxApplyConceptRef;
  target: InboxApplyConceptRef;
  relationType:
    | "causes"
    | "strengthens"
    | "weakens"
    | "explains"
    | "contradicts";
  strength: number;
  description: string | null;
};

type SuggestionApplyOutcome = {
  entityType: "concept" | "link";
  entityId: string;
  operationType: InboxApplyOperation["operationType"];
  provenanceId: string;
  mapVersionId: string;
  evidenceCount: number;
};

export type LearningCommandErrorCode =
  | "learning_suggestion_resolution_conflict";

export class LearningCommandError extends Error {
  readonly statusCode: number;
  readonly code: LearningCommandErrorCode;

  constructor(
    message: string,
    statusCode: number,
    code: LearningCommandErrorCode
  ) {
    super(message);
    this.name = "LearningCommandError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isLearningCommandError(
  error: unknown
): error is LearningCommandError {
  return error instanceof LearningCommandError;
}

function hashValue(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function getLearningConflictError(
  message: string,
  code: LearningCommandErrorCode = "learning_suggestion_resolution_conflict"
) {
  return new LearningCommandError(message, 409, code);
}

function isUniqueConstraintError(error: unknown, constraintName: string) {
  return (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "PostgresError" &&
    "code" in error &&
    error.code === "23505" &&
    "constraint_name" in error &&
    error.constraint_name === constraintName
  );
}

async function requireActiveWorkspace(workspaceId: string) {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), isNull(workspaces.archivedAt)))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return workspace;
}

async function getMapGraphRevisionTx(
  tx: DbTransaction,
  workspaceId: string,
  mapId: string
) {
  const [map] = await tx
    .select({ revision: maps.graphRevision })
    .from(maps)
    .where(
      and(
        eq(maps.id, mapId),
        eq(maps.workspaceId, workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .limit(1);

  if (!map) {
    throw new Error("Map not found.");
  }

  return map.revision;
}

async function assertMapIdsBelongToWorkspace(
  workspaceId: string,
  mapIds: string[]
) {
  if (mapIds.length === 0) {
    return;
  }

  const uniqueMapIds = [...new Set(mapIds)];
  const rows = await db
    .select({ id: maps.id })
    .from(maps)
    .where(
      and(
        eq(maps.workspaceId, workspaceId),
        isNull(maps.archivedAt),
        inArray(maps.id, uniqueMapIds)
      )
    );

  if (rows.length !== uniqueMapIds.length) {
    throw new Error("One or more maps do not belong to the target workspace.");
  }
}

async function getSuggestionRow(suggestionId: string, workspaceId: string) {
  const [suggestion] = await db
    .select()
    .from(learningSuggestions)
    .where(
      and(
        eq(learningSuggestions.id, suggestionId),
        eq(learningSuggestions.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!suggestion) {
    throw new Error("Suggestion not found.");
  }

  return suggestion;
}

function mapInboxSourceTypeToLearningSourceType(
  sourceType: (typeof inboxItems.$inferSelect)["sourceType"]
) {
  switch (sourceType) {
    case "import":
      return "import";
    case "chat":
      return "chat";
    case "manual_note":
    case "transcript":
    case "upload":
      return "manual_note";
  }
}

function getOperationTarget(
  operation: InboxApplyOperation
): {
  targetEntityType: "concept" | "link" | "scenario" | "map" | "none";
  targetEntityId: string | null;
} {
  switch (operation.operationType) {
    case "update_concept":
      return {
        targetEntityType: "concept",
        targetEntityId: operation.conceptId,
      };
    case "merge_candidate":
      return {
        targetEntityType: operation.targetEntityType,
        targetEntityId: operation.targetEntityId,
      };
    default:
      return {
        targetEntityType: "none",
        targetEntityId: null,
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coerceNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseInboxReviewArtifact(
  payload: Record<string, unknown>
): InboxReviewArtifactPayload | null {
  const parsed = inboxReviewArtifactPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function isCanonicalApplyResolution(
  resolutionType: SuggestionResolutionType,
  artifact: InboxReviewArtifactPayload | null
) {
  if (!artifact) {
    return false;
  }

  if (resolutionType !== "accepted" && resolutionType !== "edited") {
    return false;
  }

  return (
    artifact.operation.operationType === "create_concept" ||
    artifact.operation.operationType === "update_concept" ||
    artifact.operation.operationType === "create_link"
  );
}

function deriveConceptCreatePosition(createConceptIndex: number) {
  return {
    x: 180 + createConceptIndex * 160,
    y: 180 + (createConceptIndex % 2) * 120,
  };
}

async function getConceptReviewSnapshotTx(
  tx: DbTransaction,
  workspaceId: string,
  mapId: string,
  conceptId: string
) {
  const [concept] = await tx
    .select({
      id: concepts.id,
      title: concepts.title,
      conceptType: concepts.conceptType,
      summary: concepts.summary,
      description: concepts.description,
      x: concepts.x,
      y: concepts.y,
    })
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
    throw new Error("A review artifact referenced a missing Concept.");
  }

  return {
    title: concept.title,
    conceptType: concept.conceptType,
    summary: concept.summary,
    description: concept.description,
    x: concept.x,
    y: concept.y,
  } satisfies ConceptReviewSnapshot;
}

async function assertExistingConceptTx(
  tx: DbTransaction,
  workspaceId: string,
  mapId: string,
  conceptId: string
) {
  await getConceptReviewSnapshotTx(tx, workspaceId, mapId, conceptId);
}

function buildArtifactAfterSnapshot(
  operation: InboxApplyOperation,
  createConceptIndex: number,
  before: Record<string, unknown>
) {
  switch (operation.operationType) {
    case "create_concept": {
      const position = deriveConceptCreatePosition(createConceptIndex);
      return {
        title: operation.title,
        conceptType: operation.conceptType,
        summary: operation.summary ?? null,
        description: operation.description ?? null,
        x: position.x,
        y: position.y,
      };
    }
    case "update_concept":
      return {
        ...before,
        title: operation.title,
        conceptType: operation.conceptType,
        summary: operation.summary ?? null,
        description: operation.description ?? null,
      };
    case "create_link":
      return {
        source: operation.source,
        target: operation.target,
        relationType: operation.relationType,
        strength: operation.strength,
        description: operation.description ?? null,
      };
    case "merge_candidate":
      return {
        targetEntityType: operation.targetEntityType,
        targetEntityId: operation.targetEntityId,
        title: operation.title,
        reason: operation.reason,
        similarity: operation.similarity,
      };
    case "park_for_review":
      return {
        reason: operation.reason,
        payload: operation.payload ?? {},
      };
  }
}

async function buildInboxReviewArtifactPayloadTx(
  tx: DbTransaction,
  input: {
    workspaceId: string;
    mapId: string;
    operation: InboxApplyOperation;
    inboxItemId: string;
    inboxPacketId: string;
    artifactOrder: number;
    createConceptIndex: number;
  }
) {
  let before: Record<string, unknown> = {};

  if (input.operation.operationType === "update_concept") {
    before = await getConceptReviewSnapshotTx(
      tx,
      input.workspaceId,
      input.mapId,
      input.operation.conceptId
    );
  }

  if (input.operation.operationType === "create_link") {
    if (input.operation.source.source === "existing") {
      await assertExistingConceptTx(
        tx,
        input.workspaceId,
        input.mapId,
        input.operation.source.conceptId
      );
    }

    if (input.operation.target.source === "existing") {
      await assertExistingConceptTx(
        tx,
        input.workspaceId,
        input.mapId,
        input.operation.target.conceptId
      );
    }
  }

  return inboxReviewArtifactPayloadSchema.parse({
    operation: input.operation,
    before,
    after: buildArtifactAfterSnapshot(
      input.operation,
      input.createConceptIndex,
      before
    ),
    evidenceFragmentOrdinals: input.operation.evidenceFragmentOrdinals,
    inboxItemId: input.inboxItemId,
    inboxPacketId: input.inboxPacketId,
    artifactOrder: input.artifactOrder,
  });
}

function getPromotedPacketContract(packet: StructuredPacketDraft) {
  const applyContract = packet.payload.applyContract;
  if (!applyContract) {
    throw new Error("Promoted packet is missing an apply contract.");
  }

  return inboxApplyContractSchema.parse(applyContract);
}

export async function materializeInboxReviewBatchWithTx(
  tx: DbTransaction,
  input: MaterializeInboxReviewBatchInput
) {
  if (!input.item.workspaceId || !input.item.mapId) {
    throw new Error(
      "Promoted packets require a scoped workspace and target map before materialization."
    );
  }

  if (input.packet.status === "emitted") {
    return {
      batchId: null,
      packetStatus: "emitted" as const,
    };
  }

  const applyContract = getPromotedPacketContract(input.packet);
  const materializationVersion = "inbox-review-bridge.v1";
  const [sourceFragment] = await tx
    .insert(learningSourceFragments)
    .values({
      workspaceId: input.item.workspaceId,
      mapId: input.item.mapId,
      authorUserId: input.item.userId,
      sourceType: mapInboxSourceTypeToLearningSourceType(input.item.sourceType),
      rawText: input.item.rawText,
      normalizedText: input.item.normalizedText?.trim() || input.item.rawText.trim(),
      metadata: {
        inboxItemId: input.item.id,
        inboxSourceType: input.item.sourceType,
        sourceRef: input.item.sourceRef,
      },
    })
    .returning();

  if (!sourceFragment) {
    throw new Error("Review source fragment creation failed.");
  }

  const [batch] = await tx
    .insert(learningSuggestionBatches)
    .values({
      workspaceId: input.item.workspaceId,
      mapId: input.item.mapId,
      initiatedByUserId: input.item.userId,
      inboxItemId: input.item.id,
      inboxPacketId: input.packetId,
      batchType: "inbox_review",
      modelName: "inbox-deterministic-compiler",
      modelVersion: materializationVersion,
      promptVersion: materializationVersion,
      inputHash: hashValue(
        JSON.stringify({
          itemId: input.item.id,
          packetId: input.packetId,
          contractVersion: applyContract.contractVersion,
          operations: applyContract.operations,
        })
      ),
      status: "pending",
      startedAt: new Date(),
      metadata: {
        inboxItemId: input.item.id,
        inboxPacketId: input.packetId,
        mapId: input.item.mapId,
        packetSummary: input.packet.summary,
        packetType: input.packet.packetType,
        route: input.packet.route,
        policyVersion: applyContract.contractVersion,
        warningCount: applyContract.warnings.length,
        warnings: applyContract.warnings,
      },
    })
    .returning();

  if (!batch) {
    throw new Error("Review batch creation failed.");
  }

  if (applyContract.operations.length > 0) {
    let createConceptIndex = 0;
    const createdAtBase = Date.now();
    const suggestionsToInsert: Array<typeof learningSuggestions.$inferInsert> = [];

    for (const [artifactOrder, operation] of applyContract.operations.entries()) {
      const parsedOperation = inboxApplyOperationSchema.parse(operation);
      const { targetEntityType, targetEntityId } = getOperationTarget(parsedOperation);
      const artifactPayload = await buildInboxReviewArtifactPayloadTx(tx, {
        workspaceId: input.item.workspaceId,
        mapId: input.item.mapId,
        operation: parsedOperation,
        inboxItemId: input.item.id,
        inboxPacketId: input.packetId,
        artifactOrder,
        createConceptIndex,
      });

      if (parsedOperation.operationType === "create_concept") {
        createConceptIndex += 1;
      }

      suggestionsToInsert.push({
        batchId: batch.id,
        workspaceId: input.item.workspaceId,
        mapId: input.item.mapId,
        inboxItemId: input.item.id,
        inboxPacketId: input.packetId,
        sourceFragmentId: sourceFragment.id,
        artifactOrder,
        suggestionType: parsedOperation.operationType,
        targetEntityType,
        targetEntityId,
        proposedPayload: artifactPayload,
        rationale:
          parsedOperation.operationType === "merge_candidate" ||
          parsedOperation.operationType === "park_for_review"
            ? parsedOperation.reason
            : input.packet.summary,
        confidence: null,
        createdAt: new Date(createdAtBase + artifactOrder),
      });
    }

    await tx.insert(learningSuggestions).values(suggestionsToInsert);
  }

  await tx
    .update(inboxStructuredPackets)
    .set({
      status: "emitted",
    })
    .where(eq(inboxStructuredPackets.id, input.packetId));

  return {
    batchId: batch.id,
    packetStatus: "emitted" as const,
  };
}

async function getNextInboxAttemptNoTx(tx: DbTransaction, itemId: string) {
  const [row] = await tx
    .select({ attemptNo: inboxWorkflowEvents.attemptNo })
    .from(inboxWorkflowEvents)
    .where(eq(inboxWorkflowEvents.itemId, itemId))
    .orderBy(desc(inboxWorkflowEvents.attemptNo))
    .limit(1);

  return (row?.attemptNo ?? 0) + 1;
}

async function syncReviewAggregateStateTx(
  tx: DbTransaction,
  input: {
    batchId: string;
    inboxItemId: string | null;
  }
) {
  const suggestionRows = await tx
    .select({
      suggestionId: learningSuggestions.id,
      resolutionId: learningSuggestionResolutions.id,
      applyStatus: learningSuggestionResolutions.applyStatus,
    })
    .from(learningSuggestions)
    .leftJoin(
      learningSuggestionResolutions,
      eq(learningSuggestions.id, learningSuggestionResolutions.suggestionId)
    )
    .where(eq(learningSuggestions.batchId, input.batchId));

  if (suggestionRows.length === 0) {
    return;
  }

  const allResolved = suggestionRows.every((row) => Boolean(row.resolutionId));
  const anyApplied = suggestionRows.some((row) => row.applyStatus === "applied");
  const nextBatchStatus = allResolved ? "completed" : "pending";

  await tx
    .update(learningSuggestionBatches)
    .set({
      status: nextBatchStatus,
      finishedAt: allResolved ? new Date() : null,
    })
    .where(eq(learningSuggestionBatches.id, input.batchId));

  if (!input.inboxItemId) {
    return;
  }

  const nextItemStatus: InboxItemStatus = allResolved
    ? anyApplied
      ? "applied"
      : "parked"
    : "ready_for_review";

  const [updatedItem] = await tx
    .update(inboxItems)
    .set({
      status: nextItemStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inboxItems.id, input.inboxItemId),
        ne(inboxItems.status, nextItemStatus)
      )
    )
    .returning({ id: inboxItems.id });

  if (!updatedItem) {
    return;
  }

  if (allResolved) {
    const attemptNo = await getNextInboxAttemptNoTx(tx, input.inboxItemId);
    const eventType = nextItemStatus === "applied" ? "item.applied" : "item.parked";

    await tx.insert(inboxWorkflowEvents).values({
      itemId: input.inboxItemId,
      attemptNo,
      eventType,
      stepName: "review_resolution",
      status: "completed",
      payload: {
        batchId: input.batchId,
        finalStatus: nextItemStatus,
      },
    });
  }
}

function areConceptSnapshotsEqual(
  left: ConceptReviewSnapshot,
  right: ConceptReviewSnapshot
) {
  return (
    left.title === right.title &&
    left.conceptType === right.conceptType &&
    left.summary === right.summary &&
    left.description === right.description &&
    left.x === right.x &&
    left.y === right.y
  );
}

function toConceptReviewSnapshot(
  value: Record<string, unknown>,
  fallback: ConceptReviewSnapshot
): ConceptReviewSnapshot {
  return {
    title:
      typeof value.title === "string" && value.title.trim().length > 0
        ? value.title
        : fallback.title,
    conceptType:
      typeof value.conceptType === "string"
        ? (value.conceptType as ConceptReviewSnapshot["conceptType"])
        : fallback.conceptType,
    summary:
      Object.prototype.hasOwnProperty.call(value, "summary")
        ? coerceNullableText(value.summary)
        : fallback.summary,
    description:
      Object.prototype.hasOwnProperty.call(value, "description")
        ? coerceNullableText(value.description)
        : fallback.description,
    x: typeof value.x === "number" ? value.x : fallback.x,
    y: typeof value.y === "number" ? value.y : fallback.y,
  };
}

function toCreateConceptAfterSnapshot(
  value: Record<string, unknown>,
  operation: Extract<InboxApplyOperation, { operationType: "create_concept" }>,
  artifactOrder: number
): ConceptReviewSnapshot {
  const position = deriveConceptCreatePosition(artifactOrder);
  return {
    title:
      typeof value.title === "string" && value.title.trim().length > 0
        ? value.title
        : operation.title,
    conceptType:
      typeof value.conceptType === "string"
        ? (value.conceptType as ConceptReviewSnapshot["conceptType"])
        : operation.conceptType,
    summary:
      Object.prototype.hasOwnProperty.call(value, "summary")
        ? coerceNullableText(value.summary)
        : (operation.summary ?? null),
    description:
      Object.prototype.hasOwnProperty.call(value, "description")
        ? coerceNullableText(value.description)
        : (operation.description ?? null),
    x: typeof value.x === "number" ? value.x : position.x,
    y: typeof value.y === "number" ? value.y : position.y,
  };
}

function toLinkReviewSnapshot(
  value: Record<string, unknown>,
  operation: Extract<InboxApplyOperation, { operationType: "create_link" }>
): LinkReviewSnapshot {
  return {
    source: isRecord(value.source)
      ? (value.source as LinkReviewSnapshot["source"])
      : operation.source,
    target: isRecord(value.target)
      ? (value.target as LinkReviewSnapshot["target"])
      : operation.target,
    relationType:
      typeof value.relationType === "string"
        ? (value.relationType as LinkReviewSnapshot["relationType"])
        : operation.relationType,
    strength:
      typeof value.strength === "number" ? value.strength : operation.strength,
    description:
      Object.prototype.hasOwnProperty.call(value, "description")
        ? coerceNullableText(value.description)
        : (operation.description ?? null),
  };
}

async function resolvePacketConceptRefTx(
  tx: DbTransaction,
  input: {
    workspaceId: string;
    mapId: string;
    batchId: string;
    conceptRef: string;
  }
) {
  const batchSuggestions = await tx
    .select({
      id: learningSuggestions.id,
      proposedPayload: learningSuggestions.proposedPayload,
    })
    .from(learningSuggestions)
    .where(eq(learningSuggestions.batchId, input.batchId))
    .orderBy(asc(learningSuggestions.artifactOrder));

  const matchedSuggestion = batchSuggestions.find((suggestion) => {
    const artifact = parseInboxReviewArtifact(suggestion.proposedPayload ?? {});
    return (
      artifact?.operation.operationType === "create_concept" &&
      artifact.operation.conceptRef === input.conceptRef
    );
  });

  if (!matchedSuggestion) {
    throw new Error("A Link depends on a Concept ref that does not exist.");
  }

  const [concept] = await tx
    .select({ id: concepts.id })
    .from(concepts)
    .where(
      and(
        eq(concepts.workspaceId, input.workspaceId),
        eq(concepts.mapId, input.mapId),
        eq(concepts.originSuggestionId, matchedSuggestion.id),
        isNull(concepts.archivedAt)
      )
    )
    .limit(1);

  if (!concept) {
    throw new Error(
      "A Link depends on a Concept that has not been applied from review yet."
    );
  }

  return concept.id;
}

async function resolveLinkEndpointConceptIdTx(
  tx: DbTransaction,
  input: {
    workspaceId: string;
    mapId: string;
    batchId: string;
    endpoint: InboxApplyConceptRef;
  }
) {
  if (input.endpoint.source === "existing") {
    await assertExistingConceptTx(
      tx,
      input.workspaceId,
      input.mapId,
      input.endpoint.conceptId
    );
    return input.endpoint.conceptId;
  }

  return resolvePacketConceptRefTx(tx, {
    workspaceId: input.workspaceId,
    mapId: input.mapId,
    batchId: input.batchId,
    conceptRef: input.endpoint.conceptRef,
  });
}

async function getAppliedMapVersionByResolutionTx(
  tx: DbTransaction,
  input: {
    workspaceId: string;
    mapId: string;
    resolutionId: string;
  }
) {
  const [mapVersion] = await tx
    .select({
      id: learningMapVersions.id,
    })
    .from(learningMapVersions)
    .where(
      and(
        eq(learningMapVersions.workspaceId, input.workspaceId),
        eq(learningMapVersions.mapId, input.mapId),
        eq(learningMapVersions.causedByResolutionId, input.resolutionId)
      )
    )
    .orderBy(desc(learningMapVersions.createdAt))
    .limit(1);

  if (!mapVersion) {
    throw new Error("Applied map version was not recorded for this resolution.");
  }

  return mapVersion;
}

async function resolveArtifactEvidenceFragmentsTx(
  tx: DbTransaction,
  input: {
    inboxItemId: string;
    evidenceFragmentOrdinals: number[];
  }
) {
  if (input.evidenceFragmentOrdinals.length === 0) {
    return [];
  }

  const uniqueOrdinals = [...new Set(input.evidenceFragmentOrdinals)];
  const rows = await tx
    .select({
      id: inboxFragments.id,
      ordinal: inboxFragments.ordinal,
      clarificationAnswerId: inboxFragments.clarificationAnswerId,
    })
    .from(inboxFragments)
    .where(
      and(
        eq(inboxFragments.itemId, input.inboxItemId),
        inArray(inboxFragments.ordinal, uniqueOrdinals)
      )
    )
    .orderBy(asc(inboxFragments.ordinal));

  const fragmentsByOrdinal = new Map(rows.map((row) => [row.ordinal, row]));
  const resolvedEvidence: typeof rows = [];
  const seenFragmentIds = new Set<string>();

  for (const ordinal of input.evidenceFragmentOrdinals) {
    const fragment = fragmentsByOrdinal.get(ordinal);
    if (!fragment) {
      throw new Error(
        `Evidence fragment ${ordinal} is missing for inbox item ${input.inboxItemId}.`
      );
    }

    if (seenFragmentIds.has(fragment.id)) {
      continue;
    }

    seenFragmentIds.add(fragment.id);
    resolvedEvidence.push(fragment);
  }

  return resolvedEvidence;
}

async function recordCanonicalMutationProvenanceTx(
  tx: DbTransaction,
  input: {
    workspaceId: string;
    mapId: string;
    resolutionId: string;
    suggestionId: string;
    inboxItemId: string;
    inboxPacketId: string;
    appliedByUserId: string;
    entityType: "concept" | "link";
    entityId: string;
    mutationType: Extract<
      InboxApplyOperation["operationType"],
      "create_concept" | "update_concept" | "create_link"
    >;
    evidenceFragmentOrdinals: number[];
  }
) {
  const [mapVersion, evidenceFragments] = await Promise.all([
    getAppliedMapVersionByResolutionTx(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      resolutionId: input.resolutionId,
    }),
    resolveArtifactEvidenceFragmentsTx(tx, {
      inboxItemId: input.inboxItemId,
      evidenceFragmentOrdinals: input.evidenceFragmentOrdinals,
    }),
  ]);

  const [provenance] = await tx
    .insert(learningCanonicalMutationProvenance)
    .values({
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      mapVersionId: mapVersion.id,
      entityType: input.entityType,
      entityId: input.entityId,
      mutationType: input.mutationType,
      originSuggestionId: input.suggestionId,
      reviewResolutionId: input.resolutionId,
      inboxItemId: input.inboxItemId,
      inboxPacketId: input.inboxPacketId,
      appliedByUserId: input.appliedByUserId,
    })
    .returning({ id: learningCanonicalMutationProvenance.id });

  if (!provenance) {
    throw new Error("Canonical mutation provenance was not recorded.");
  }

  if (evidenceFragments.length > 0) {
    await tx.insert(learningCanonicalMutationEvidence).values(
      evidenceFragments.map((fragment, evidenceOrder) => ({
        provenanceId: provenance.id,
        inboxFragmentId: fragment.id,
        clarificationAnswerId: fragment.clarificationAnswerId,
        evidenceOrder,
        fragmentOrdinal: fragment.ordinal,
      }))
    );
  }

  return {
    provenanceId: provenance.id,
    mapVersionId: mapVersion.id,
    evidenceCount: evidenceFragments.length,
  };
}

export async function applyInboxReviewResolutionTx(
  tx: DbTransaction,
  input: {
    suggestion: typeof learningSuggestions.$inferSelect;
    resolutionId: string;
    actorUserId: string;
    workspaceId: string;
    mapId: string;
    afterPayload: Record<string, unknown>;
  }
): Promise<SuggestionApplyOutcome> {
  const artifact = parseInboxReviewArtifact(input.suggestion.proposedPayload ?? {});

  if (!artifact) {
    throw new Error("The review artifact payload is missing canonical apply data.");
  }

  const operation = artifact.operation;

  if (operation.operationType === "create_concept") {
    const afterSnapshot = toCreateConceptAfterSnapshot(
      input.afterPayload,
      operation,
      artifact.artifactOrder
    );
    const { concept } = await createConceptWithTx(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      mapId: input.mapId,
      expectedRevision: await getMapGraphRevisionTx(
        tx,
        input.workspaceId,
        input.mapId
      ),
      title: afterSnapshot.title,
      conceptType: afterSnapshot.conceptType,
      summary: afterSnapshot.summary,
      description: afterSnapshot.description,
      x: afterSnapshot.x,
      y: afterSnapshot.y,
      originType: "ai_suggested",
      originSuggestionId: input.suggestion.id,
      causedByResolutionId: input.resolutionId,
      mapVersionTriggerType: "suggestion_resolution",
    });
    const provenance = await recordCanonicalMutationProvenanceTx(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      resolutionId: input.resolutionId,
      suggestionId: input.suggestion.id,
      inboxItemId: artifact.inboxItemId,
      inboxPacketId: artifact.inboxPacketId,
      appliedByUserId: input.actorUserId,
      entityType: "concept",
      entityId: concept.id,
      mutationType: operation.operationType,
      evidenceFragmentOrdinals: artifact.evidenceFragmentOrdinals,
    });

    return {
      entityType: "concept",
      entityId: concept.id,
      operationType: operation.operationType,
      ...provenance,
    };
  }

  if (operation.operationType === "update_concept") {
    const currentBefore = await getConceptReviewSnapshotTx(
      tx,
      input.workspaceId,
      input.mapId,
      operation.conceptId
    );
    const storedBefore = toConceptReviewSnapshot(artifact.before, currentBefore);

    if (!areConceptSnapshotsEqual(currentBefore, storedBefore)) {
      throw new Error(
        "Canonical Concept changed after review materialization. Refresh the review artifact before applying."
      );
    }

    const afterSnapshot = toConceptReviewSnapshot(input.afterPayload, storedBefore);
    const concept = await updateConceptWithTx(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      mapId: input.mapId,
      conceptId: operation.conceptId,
      expectedRevision: await getMapGraphRevisionTx(
        tx,
        input.workspaceId,
        input.mapId
      ),
      title: afterSnapshot.title,
      conceptType: afterSnapshot.conceptType,
      summary: afterSnapshot.summary,
      description: afterSnapshot.description,
      x: afterSnapshot.x,
      y: afterSnapshot.y,
      causedByResolutionId: input.resolutionId,
      mapVersionTriggerType: "suggestion_resolution",
    });
    const provenance = await recordCanonicalMutationProvenanceTx(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      resolutionId: input.resolutionId,
      suggestionId: input.suggestion.id,
      inboxItemId: artifact.inboxItemId,
      inboxPacketId: artifact.inboxPacketId,
      appliedByUserId: input.actorUserId,
      entityType: "concept",
      entityId: concept.id,
      mutationType: operation.operationType,
      evidenceFragmentOrdinals: artifact.evidenceFragmentOrdinals,
    });

    return {
      entityType: "concept",
      entityId: concept.id,
      operationType: operation.operationType,
      ...provenance,
    };
  }

  if (operation.operationType === "create_link") {
    const afterSnapshot = toLinkReviewSnapshot(input.afterPayload, operation);
    const [sourceConceptId, targetConceptId] = await Promise.all([
      resolveLinkEndpointConceptIdTx(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        batchId: input.suggestion.batchId,
        endpoint: afterSnapshot.source,
      }),
      resolveLinkEndpointConceptIdTx(tx, {
        workspaceId: input.workspaceId,
        mapId: input.mapId,
        batchId: input.suggestion.batchId,
        endpoint: afterSnapshot.target,
      }),
    ]);
    const { link } = await createLinkWithTx(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      mapId: input.mapId,
      expectedRevision: await getMapGraphRevisionTx(
        tx,
        input.workspaceId,
        input.mapId
      ),
      sourceConceptId,
      targetConceptId,
      relationType: afterSnapshot.relationType,
      strength: afterSnapshot.strength,
      description: afterSnapshot.description,
      originType: "ai_suggested",
      originSuggestionId: input.suggestion.id,
      causedByResolutionId: input.resolutionId,
      mapVersionTriggerType: "suggestion_resolution",
    });
    const provenance = await recordCanonicalMutationProvenanceTx(tx, {
      workspaceId: input.workspaceId,
      mapId: input.mapId,
      resolutionId: input.resolutionId,
      suggestionId: input.suggestion.id,
      inboxItemId: artifact.inboxItemId,
      inboxPacketId: artifact.inboxPacketId,
      appliedByUserId: input.actorUserId,
      entityType: "link",
      entityId: link.id,
      mutationType: operation.operationType,
      evidenceFragmentOrdinals: artifact.evidenceFragmentOrdinals,
    });

    return {
      entityType: "link",
      entityId: link.id,
      operationType: operation.operationType,
      ...provenance,
    };
  }

  throw new Error("This review artifact does not support canonical apply.");
}

export async function createSourceFragmentCommand(input: SourceFragmentInput) {
  const parsed = sourceFragmentInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  const [fragment] = await db
    .insert(learningSourceFragments)
    .values({
      workspaceId: parsed.workspaceId,
      mapId: parsed.mapId ?? null,
      authorUserId: parsed.authorUserId ?? null,
      sourceType: parsed.sourceType,
      rawText: parsed.rawText,
      normalizedText: parsed.normalizedText?.trim() || parsed.rawText.trim(),
      metadata: parsed.metadata ?? {},
    })
    .returning();

  if (!fragment) {
    throw new Error("Source fragment creation failed.");
  }

  return mapSourceFragmentRecord(fragment);
}

export async function createSuggestionBatchCommand(input: SuggestionBatchInput) {
  const parsed = suggestionBatchInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  const [batch] = await db
    .insert(learningSuggestionBatches)
    .values({
      workspaceId: parsed.workspaceId,
      mapId: parsed.mapId ?? null,
      initiatedByUserId: parsed.initiatedByUserId ?? null,
      inboxItemId: parsed.inboxItemId ?? null,
      inboxPacketId: parsed.inboxPacketId ?? null,
      batchType: parsed.batchType,
      modelName: parsed.modelName,
      modelVersion: parsed.modelVersion,
      promptVersion: parsed.promptVersion,
      inputHash: parsed.inputHash,
      status: parsed.status ?? "pending",
      startedAt: parsed.startedAt ?? new Date(),
      finishedAt: parsed.finishedAt ?? null,
      metadata: parsed.metadata ?? {},
    })
    .returning();

  if (!batch) {
    throw new Error("Suggestion batch creation failed.");
  }

  return mapSuggestionBatchRecord(batch);
}

export async function createSuggestionsCommand(input: SuggestionInput[]) {
  if (input.length === 0) {
    throw new Error("At least one suggestion is required.");
  }

  const parsedSuggestions = input.map((item) => suggestionInputSchema.parse(item));
  const workspaceIds = [...new Set(parsedSuggestions.map((item) => item.workspaceId))];
  if (workspaceIds.length !== 1) {
    throw new Error("Suggestions in a single request must share one workspace.");
  }

  const workspaceId = workspaceIds[0];
  if (!workspaceId) {
    throw new Error("Workspace is required for suggestions.");
  }

  const explicitMapIds = [
    ...new Set(
      parsedSuggestions
        .map((item) => item.mapId)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  await requireActiveWorkspace(workspaceId);

  if (explicitMapIds.length > 0) {
    await assertMapIdsBelongToWorkspace(workspaceId, explicitMapIds);
  }

  const batchIds = [...new Set(parsedSuggestions.map((item) => item.batchId))];

  const rows = await db.transaction(async (tx) => {
    const batches = await tx
      .select()
      .from(learningSuggestionBatches)
      .where(inArray(learningSuggestionBatches.id, batchIds));

    if (batches.length !== batchIds.length) {
      throw new Error("One or more suggestion batches could not be found.");
    }

    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const sourceFragmentIds = [
      ...new Set(
        parsedSuggestions
          .map((item) => item.sourceFragmentId)
          .filter((value): value is string => Boolean(value))
      ),
    ];

    const sourceFragments =
      sourceFragmentIds.length === 0
        ? []
        : await tx
            .select()
            .from(learningSourceFragments)
            .where(inArray(learningSourceFragments.id, sourceFragmentIds));

    const sourceFragmentById = new Map(
      sourceFragments.map((fragment) => [fragment.id, fragment])
    );

    const suggestionsToInsert = parsedSuggestions.map((rawInput) => {
      const item = rawInput as SuggestionInput;
      const batch = batchById.get(item.batchId);
      if (!batch) {
        throw new Error("Suggestion batch lookup failed.");
      }

      if (batch.workspaceId !== item.workspaceId) {
        throw new Error("Suggestion workspace does not match its batch.");
      }

      const sourceFragment = item.sourceFragmentId
        ? sourceFragmentById.get(item.sourceFragmentId)
        : null;

      if (item.sourceFragmentId && !sourceFragment) {
        throw new Error("Source fragment not found for suggestion.");
      }

      if (sourceFragment && sourceFragment.workspaceId !== item.workspaceId) {
        throw new Error("Source fragment workspace does not match suggestion.");
      }

      const effectiveMapId =
        item.mapId ?? batch.mapId ?? sourceFragment?.mapId ?? null;

      if (batch.mapId && effectiveMapId && batch.mapId !== effectiveMapId) {
        throw new Error("Suggestion map does not match its batch.");
      }

      if (
        sourceFragment?.mapId &&
        effectiveMapId &&
        sourceFragment.mapId !== effectiveMapId
      ) {
        throw new Error("Source fragment map does not match suggestion.");
      }

      return {
        batchId: item.batchId,
        workspaceId: item.workspaceId,
        mapId: effectiveMapId,
        inboxItemId: item.inboxItemId ?? batch.inboxItemId ?? null,
        inboxPacketId: item.inboxPacketId ?? batch.inboxPacketId ?? null,
        sourceFragmentId: item.sourceFragmentId ?? null,
        artifactOrder: item.artifactOrder ?? 0,
        suggestionType: item.suggestionType,
        targetEntityType: item.targetEntityType,
        targetEntityId: item.targetEntityId ?? null,
        proposedPayload: item.proposedPayload ?? {},
        rationale: item.rationale ?? null,
        confidence: item.confidence ?? null,
      };
    });

    return tx.insert(learningSuggestions).values(suggestionsToInsert).returning();
  });

  return rows.map(mapSuggestionRecord);
}

export async function resolveSuggestionCommand(input: SuggestionResolutionInput) {
  const parsed = suggestionResolutionInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );
  await requireWorkspaceLearningReviewAccess(
    parsed.workspaceId,
    parsed.actorUserId
  );

  const suggestion = await getSuggestionRow(parsed.suggestionId, parsed.workspaceId);
  if (parsed.mapId && suggestion.mapId && suggestion.mapId !== parsed.mapId) {
    throw new Error("Resolution map does not match suggestion map.");
  }

  const artifact = parseInboxReviewArtifact(suggestion.proposedPayload ?? {});
  const resolvedBeforePayload = parsed.beforePayload ?? artifact?.before ?? {};
  const resolvedAfterPayload = parsed.afterPayload ?? artifact?.after ?? {};
  const shouldApply = isCanonicalApplyResolution(parsed.resolutionType, artifact);
  const initialApplyStatus = shouldApply ? "pending" : "not_applicable";
  const effectiveMapId = parsed.mapId ?? suggestion.mapId;

  let resolution;
  try {
    [resolution] = await db
      .insert(learningSuggestionResolutions)
      .values({
        suggestionId: parsed.suggestionId,
        workspaceId: parsed.workspaceId,
        mapId: effectiveMapId ?? null,
        actorUserId: parsed.actorUserId,
        resolutionType: parsed.resolutionType,
        beforePayload: resolvedBeforePayload,
        afterPayload: resolvedAfterPayload,
        applyStatus: initialApplyStatus,
        reasonText: parsed.reasonText ?? null,
        latencyMs: parsed.latencyMs ?? null,
        resolvedAt: parsed.resolvedAt ?? new Date(),
      })
      .returning();
  } catch (error) {
    if (
      isUniqueConstraintError(
        error,
        "learning_suggestion_resolutions_suggestion_key"
      )
    ) {
      throw getLearningConflictError(
        "Suggestion already has a terminal resolution."
      );
    }

    throw error;
  }

  if (!resolution) {
    throw new Error("Suggestion resolution failed.");
  }

  if (!shouldApply) {
    const [updatedResolution] = await db.transaction(async (tx) => {
      await syncReviewAggregateStateTx(tx, {
        batchId: suggestion.batchId,
        inboxItemId: suggestion.inboxItemId,
      });

      return tx
        .select()
        .from(learningSuggestionResolutions)
        .where(eq(learningSuggestionResolutions.id, resolution.id))
        .limit(1);
    });

    return mapSuggestionResolutionRecord(updatedResolution ?? resolution);
  }

  try {
    if (!effectiveMapId) {
      throw new Error(
        "Canonical apply requires the suggestion to be scoped to a Map."
      );
    }

    const applyOutcome = await db.transaction((tx) =>
      applyInboxReviewResolutionTx(tx, {
        suggestion,
        resolutionId: resolution.id,
        actorUserId: parsed.actorUserId,
        workspaceId: parsed.workspaceId,
        mapId: effectiveMapId,
        afterPayload: resolvedAfterPayload,
      })
    );

    const updatedResolution = await db.transaction(async (tx) => {
      const [nextResolution] = await tx
        .update(learningSuggestionResolutions)
        .set({
          applyStatus: "applied",
          appliedAt: new Date(),
          applyOutcome,
          applyError: null,
        })
        .where(eq(learningSuggestionResolutions.id, resolution.id))
        .returning();

      await syncReviewAggregateStateTx(tx, {
        batchId: suggestion.batchId,
        inboxItemId: suggestion.inboxItemId,
      });

      return nextResolution;
    });

    if (!updatedResolution) {
      throw new Error("Suggestion resolution update failed after apply.");
    }

    return mapSuggestionResolutionRecord(updatedResolution);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Canonical apply failed.";

    const failedResolution = await db.transaction(async (tx) => {
      const [nextResolution] = await tx
        .update(learningSuggestionResolutions)
        .set({
          applyStatus: "failed",
          appliedAt: null,
          applyOutcome: {},
          applyError: message,
        })
        .where(eq(learningSuggestionResolutions.id, resolution.id))
        .returning();

      await syncReviewAggregateStateTx(tx, {
        batchId: suggestion.batchId,
        inboxItemId: suggestion.inboxItemId,
      });

      return nextResolution;
    });

    if (!failedResolution) {
      throw new Error(message);
    }

    return mapSuggestionResolutionRecord(failedResolution);
  }
}

export async function attachSuggestionOriginToEntityCommand(
  input: AttachSuggestionOriginInput
) {
  const parsed = attachSuggestionOriginInputSchema.parse(input);
  await requireActiveWorkspace(parsed.workspaceId);
  await assertMapIdsBelongToWorkspace(
    parsed.workspaceId,
    parsed.mapId ? [parsed.mapId] : []
  );

  if (parsed.originSuggestionId) {
    const suggestion = await getSuggestionRow(
      parsed.originSuggestionId,
      parsed.workspaceId
    );

    if (parsed.mapId && suggestion.mapId && suggestion.mapId !== parsed.mapId) {
      throw new Error("Origin suggestion map does not match target map.");
    }
  }

  const originUpdate = {
    originType: parsed.originType,
    originSuggestionId: parsed.originSuggestionId ?? null,
  };

  let updatedId: string | null = null;

  switch (parsed.entityType) {
    case "concept": {
      const [concept] = await db
        .update(concepts)
        .set(originUpdate)
        .where(
          and(
            eq(concepts.id, parsed.entityId),
            eq(concepts.workspaceId, parsed.workspaceId),
            ...(parsed.mapId ? [eq(concepts.mapId, parsed.mapId)] : [])
          )
        )
        .returning({ id: concepts.id });
      updatedId = concept?.id ?? null;
      break;
    }
    case "link": {
      const [link] = await db
        .update(links)
        .set(originUpdate)
        .where(
          and(
            eq(links.id, parsed.entityId),
            eq(links.workspaceId, parsed.workspaceId),
            ...(parsed.mapId ? [eq(links.mapId, parsed.mapId)] : [])
          )
        )
        .returning({ id: links.id });
      updatedId = link?.id ?? null;
      break;
    }
    case "scenario": {
      const [scenario] = await db
        .update(scenarios)
        .set(originUpdate)
        .where(
          and(
            eq(scenarios.id, parsed.entityId),
            eq(scenarios.workspaceId, parsed.workspaceId),
            ...(parsed.mapId ? [eq(scenarios.mapId, parsed.mapId)] : [])
          )
        )
        .returning({ id: scenarios.id });
      updatedId = scenario?.id ?? null;
      break;
    }
  }

  if (!updatedId) {
    throw new Error("Canonical entity not found for origin attachment.");
  }

  return {
    entityType: parsed.entityType,
    entityId: updatedId,
    originType: parsed.originType,
    originSuggestionId: parsed.originSuggestionId ?? null,
  };
}
