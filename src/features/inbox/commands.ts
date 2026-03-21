import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { and, asc, desc, eq, isNotNull, ne } from "drizzle-orm";

import {
  finalizeInboxRouteAfterClarification,
  runInboxPipelineDraft,
  type InboxPipelineDraft,
} from "@/features/inbox/engine";
import { mapInboxItemRecord } from "@/features/inbox/mappers";
import { getInboxItemDetailQuery } from "@/features/inbox/queries";
import {
  clarificationAnswerInputSchema,
  inboxFragmentCandidateSchema,
  ingestInboxItemInputSchema,
  type ClarificationAnswerInput,
  type InboxFragmentCandidate,
  type IngestInboxItemInput,
} from "@/features/inbox/schemas";
import { inboxWorkerContracts } from "@/features/inbox/workflow";
import { db } from "@/shared/db/client";
import {
  inboxAtoms,
  inboxClarificationAnswers,
  inboxClarificationRequests,
  inboxFragments,
  inboxHypotheses,
  inboxItems,
  inboxMergeCandidates,
  inboxStructuredPackets,
  inboxWorkflowEvents,
  users,
  type InboxItemStatus,
  type InboxRoute,
  type InboxWorkflowEventStatus,
} from "@/shared/db/schema";

export class InboxCommandError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "InboxCommandError";
    this.statusCode = statusCode;
  }
}

export function isInboxCommandError(error: unknown): error is InboxCommandError {
  return error instanceof InboxCommandError;
}

type WorkflowEventPayload = Record<string, unknown> | undefined;

type PersistAnalysisInput = {
  item: typeof inboxItems.$inferSelect;
  attemptNo: number;
  pipeline: InboxPipelineDraft;
  effectiveRoute: InboxPipelineDraft["route"];
  persistClarificationDraft: boolean;
  emitSegmentEvent: boolean;
  routeEventPayload?: Record<string, unknown> | undefined;
  terminalEventPayload?: Record<string, unknown> | undefined;
};

function hashValue(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function requireUser(userId: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

async function getNextAttemptNo(itemId: string) {
  const [existingAttempt] = await db
    .select({ attemptNo: inboxWorkflowEvents.attemptNo })
    .from(inboxWorkflowEvents)
    .where(eq(inboxWorkflowEvents.itemId, itemId))
    .orderBy(desc(inboxWorkflowEvents.attemptNo))
    .limit(1);

  return (existingAttempt?.attemptNo ?? 0) + 1;
}

async function clearInboxAnalysisState(itemId: string) {
  await db
    .delete(inboxStructuredPackets)
    .where(eq(inboxStructuredPackets.itemId, itemId));
  await db
    .delete(inboxMergeCandidates)
    .where(eq(inboxMergeCandidates.itemId, itemId));
  await db.delete(inboxAtoms).where(eq(inboxAtoms.itemId, itemId));
  await db
    .delete(inboxHypotheses)
    .where(eq(inboxHypotheses.itemId, itemId));
  await db
    .delete(inboxFragments)
    .where(eq(inboxFragments.itemId, itemId));
}

async function clearInboxAnalysisStateTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  itemId: string
) {
  await tx
    .delete(inboxStructuredPackets)
    .where(eq(inboxStructuredPackets.itemId, itemId));
  await tx
    .delete(inboxMergeCandidates)
    .where(eq(inboxMergeCandidates.itemId, itemId));
  await tx.delete(inboxAtoms).where(eq(inboxAtoms.itemId, itemId));
  await tx
    .delete(inboxHypotheses)
    .where(eq(inboxHypotheses.itemId, itemId));
  await tx
    .delete(inboxFragments)
    .where(eq(inboxFragments.itemId, itemId));
}

async function insertWorkflowEvent(input: {
  itemId: string;
  attemptNo: number;
  eventType: string;
  stepName: string;
  status: InboxWorkflowEventStatus;
  payload?: WorkflowEventPayload;
}) {
  await db.insert(inboxWorkflowEvents).values({
    itemId: input.itemId,
    attemptNo: input.attemptNo,
    eventType: input.eventType,
    stepName: input.stepName,
    status: input.status,
    payload: input.payload ?? null,
  });
}

function getTerminalEventType(route: InboxRoute) {
  switch (route) {
    case "promote":
      return "item.promoted";
    case "clarify":
      return "item.clarification_requested";
    case "park":
      return "item.parked";
    case "discard":
      return "item.discarded";
  }
}

function getTerminalStatus(route: InboxRoute): InboxItemStatus {
  switch (route) {
    case "promote":
      return "promoted";
    case "clarify":
      return "clarification_requested";
    case "park":
      return "parked";
    case "discard":
      return "discarded";
  }
}

function getConflictError(message: string) {
  return new InboxCommandError(message, 409);
}

function mapStoredFragmentToCandidate(
  row: typeof inboxFragments.$inferSelect
): InboxFragmentCandidate {
  return inboxFragmentCandidateSchema.parse({
    ordinal: row.ordinal,
    fragmentText: row.fragmentText,
    fragmentType: row.fragmentType,
    sourceKind: row.sourceKind,
    clarificationAnswerId: row.clarificationAnswerId,
    typeCandidates: row.fragmentType ? [row.fragmentType] : [],
    span:
      row.spanStart !== null &&
      row.spanEnd !== null &&
      row.spanEnd > row.spanStart
        ? {
            start: row.spanStart,
            end: row.spanEnd,
          }
        : null,
  });
}

async function getResolveContextForItem(item: typeof inboxItems.$inferSelect) {
  const otherNormalizedRows = await db
    .select({ normalizedText: inboxItems.normalizedText })
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.userId, item.userId),
        ne(inboxItems.id, item.id),
        isNotNull(inboxItems.normalizedText)
      )
    );

  return {
    otherNormalizedTexts: otherNormalizedRows
      .map((row) => row.normalizedText)
      .filter((value): value is string => Boolean(value)),
  };
}

async function persistAnalysisTransaction(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: PersistAnalysisInput
) {
  const fragmentRows = await tx
    .insert(inboxFragments)
    .values(
      input.pipeline.analysisFragments.map((fragment) => ({
        itemId: input.item.id,
        ordinal: fragment.ordinal,
        fragmentText: fragment.fragmentText,
        fragmentType: fragment.fragmentType ?? null,
        sourceKind: fragment.sourceKind,
        clarificationAnswerId: fragment.clarificationAnswerId ?? null,
        spanStart: fragment.span?.start ?? null,
        spanEnd: fragment.span?.end ?? null,
      }))
    )
    .returning();

  const fragmentIdByOrdinal = new Map(
    fragmentRows.map((row) => [row.ordinal, row.id] as const)
  );

  if (input.emitSegmentEvent) {
    await tx
      .update(inboxItems)
      .set({
        status: "segmented",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, input.item.id));

    await tx.insert(inboxWorkflowEvents).values({
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: "item.segmented",
      stepName: "segment",
      status: "completed",
      payload: {
        fragmentCount: fragmentRows.length,
      },
    });
  }

  const interpretContract = inboxWorkerContracts.interpret;
  const hypothesisRows = await tx
    .insert(inboxHypotheses)
    .values(
      input.pipeline.interpreter.hypotheses.map((hypothesis) => ({
        itemId: input.item.id,
        fragmentId:
          hypothesis.fragmentOrdinal !== null &&
          hypothesis.fragmentOrdinal !== undefined
            ? (fragmentIdByOrdinal.get(hypothesis.fragmentOrdinal) ?? null)
            : null,
        rank: hypothesis.rank,
        hypothesisType: hypothesis.hypothesisType,
        payload: hypothesis.payload,
        confidence: hypothesis.confidence,
        explanation: hypothesis.explanation,
        modelName: interpretContract.modelName,
        promptVersion: interpretContract.promptVersion,
      }))
    )
    .returning();

  const primaryHypothesisId = hypothesisRows[0]?.id;
  if (primaryHypothesisId) {
    await tx.insert(inboxAtoms).values(
      input.pipeline.interpreter.atoms.map((atom) => ({
        itemId: input.item.id,
        hypothesisId: primaryHypothesisId,
        atomType: atom.atomType,
        canonicalValue: atom.canonicalValue ?? null,
        payload: atom.payload,
        confidence: atom.confidence,
      }))
    );
  }

  await tx
    .update(inboxItems)
    .set({
      status: "interpreted",
      updatedAt: new Date(),
    })
    .where(eq(inboxItems.id, input.item.id));

  await tx.insert(inboxWorkflowEvents).values({
    itemId: input.item.id,
    attemptNo: input.attemptNo,
    eventType: "item.interpreted",
    stepName: "interpret",
    status: "completed",
    payload: {
      outputHash: hashValue(JSON.stringify(input.pipeline.interpreter)),
      hypothesisCount: hypothesisRows.length,
      atomCount: input.pipeline.interpreter.atoms.length,
      clarificationFragmentCount: input.pipeline.clarificationFragments.length,
    },
  });

  await tx
    .update(inboxItems)
    .set({
      score: input.pipeline.scorer.rInbox,
      confidence: input.pipeline.scorer.confidence,
      ambiguity: input.pipeline.scorer.ambiguity,
      risk: input.pipeline.scorer.risk,
      status: "scored",
      updatedAt: new Date(),
    })
    .where(eq(inboxItems.id, input.item.id));

  await tx.insert(inboxWorkflowEvents).values({
    itemId: input.item.id,
    attemptNo: input.attemptNo,
    eventType: "item.scored",
    stepName: "score",
    status: "completed",
    payload: {
      outputHash: hashValue(JSON.stringify(input.pipeline.scorer)),
      scoreBreakdown: input.pipeline.scorer.scoreBreakdown,
    },
  });

  if (input.pipeline.resolver.mergeCandidates.length > 0) {
    await tx.insert(inboxMergeCandidates).values(
      input.pipeline.resolver.mergeCandidates.map((candidate) => ({
        itemId: input.item.id,
        targetObjectType: candidate.targetObjectType,
        targetObjectId: candidate.targetObjectId,
        similarity: candidate.similarity,
        decision: candidate.decision ?? null,
      }))
    );
  }

  await tx
    .update(inboxItems)
    .set({
      status: "resolved",
      updatedAt: new Date(),
    })
    .where(eq(inboxItems.id, input.item.id));

  await tx.insert(inboxWorkflowEvents).values({
    itemId: input.item.id,
    attemptNo: input.attemptNo,
    eventType: "item.resolved",
    stepName: "resolve",
    status: "completed",
    payload: {
      dedupeSignals: input.pipeline.resolver.dedupeSignals,
      mergeCandidateCount: input.pipeline.resolver.mergeCandidates.length,
    },
  });

  if (input.effectiveRoute.structuredPacket) {
    await tx.insert(inboxStructuredPackets).values({
      itemId: input.item.id,
      packetType: input.effectiveRoute.structuredPacket.packetType,
      summary: input.effectiveRoute.structuredPacket.summary,
      payload: input.effectiveRoute.structuredPacket.payload,
      route: input.effectiveRoute.route,
      status: input.effectiveRoute.structuredPacket.status,
    });
  }

  if (input.persistClarificationDraft && input.effectiveRoute.clarificationDraft) {
    await tx.insert(inboxClarificationRequests).values({
      itemId: input.item.id,
      question: input.effectiveRoute.clarificationDraft.question,
      reason: input.effectiveRoute.clarificationDraft.reason,
      status: input.effectiveRoute.clarificationDraft.status,
    });
  }

  const terminalStatus = getTerminalStatus(input.effectiveRoute.route);
  const terminalEventType = getTerminalEventType(input.effectiveRoute.route);

  await tx
    .update(inboxItems)
    .set({
      route: input.effectiveRoute.route,
      status: terminalStatus,
      updatedAt: new Date(),
    })
    .where(eq(inboxItems.id, input.item.id));

  await tx.insert(inboxWorkflowEvents).values([
    {
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: "item.resolved",
      stepName: "route",
      status: "completed",
      payload: {
        route: input.effectiveRoute.route,
        reason: input.effectiveRoute.reason,
        ...(input.routeEventPayload ?? {}),
      },
    },
    {
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: terminalEventType,
      stepName: input.effectiveRoute.route,
      status: "completed",
      payload: {
        reason: input.effectiveRoute.reason,
        ...(input.terminalEventPayload ?? {}),
      },
    },
    {
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: terminalEventType,
      stepName: "emit_status",
      status: "completed",
      payload: {
        finalStatus: terminalStatus,
      },
    },
  ]);
}

export async function createInboxItemCommand(input: IngestInboxItemInput) {
  const parsed = ingestInboxItemInputSchema.parse(input);
  await requireUser(parsed.userId);

  const [existing] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.idempotencyKey, parsed.idempotencyKey))
    .limit(1);

  if (existing) {
    if (existing.userId !== parsed.userId) {
      throw new Error("Idempotency key already belongs to another user.");
    }

    return {
      created: false,
      item: mapInboxItemRecord(existing),
    };
  }

  const [item] = await db
    .insert(inboxItems)
    .values({
      userId: parsed.userId,
      sourceType: parsed.sourceType,
      sourceRef: parsed.sourceRef ?? null,
      rawText: parsed.rawText,
      idempotencyKey: parsed.idempotencyKey,
      status: "received",
    })
    .returning();

  if (!item) {
    throw new Error("Inbox item creation failed.");
  }

  await insertWorkflowEvent({
    itemId: item.id,
    attemptNo: 1,
    eventType: "item.received",
    stepName: "ingest_item",
    status: "completed",
    payload: {
      sourceType: item.sourceType,
      sourceRef: item.sourceRef,
    },
  });

  return {
    created: true,
    item: mapInboxItemRecord(item),
  };
}

export async function processInboxItemCommand(itemId: string) {
  const [item] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!item) {
    throw new InboxCommandError("Inbox item not found.", 404);
  }

  if (item.status === "clarification_requested") {
    throw getConflictError(
      "Inbox item is waiting for a clarification answer and cannot be blindly reprocessed."
    );
  }

  if (
    item.status === "promoted" ||
    item.status === "parked" ||
    item.status === "discarded"
  ) {
    const detail = await getInboxItemDetailQuery(item.id);
    if (!detail) {
      throw new Error("Inbox item detail could not be loaded.");
    }

    return detail;
  }

  const attemptNo = await getNextAttemptNo(item.id);

  try {
    await clearInboxAnalysisState(item.id);

    const pipeline = runInboxPipelineDraft({
      itemId: item.id,
      rawText: item.rawText,
      sourceType: item.sourceType,
      resolveContext: await getResolveContextForItem(item),
    });

    const persistedHash = hashValue(item.rawText);
    const normalizedHash = hashValue(pipeline.normalizer.normalizedText);

    await db.transaction(async (tx) => {
      await tx
        .update(inboxItems)
        .set({
          status: "persisted",
          updatedAt: new Date(),
        })
        .where(eq(inboxItems.id, item.id));

      await tx.insert(inboxWorkflowEvents).values({
        itemId: item.id,
        attemptNo,
        eventType: "item.received",
        stepName: "persist_raw",
        status: "completed",
        payload: {
          inputHash: persistedHash,
          outputHash: persistedHash,
        },
      });

      await tx
        .update(inboxItems)
        .set({
          normalizedText: pipeline.normalizer.normalizedText,
          language: pipeline.normalizer.language ?? null,
          status: "normalized",
          updatedAt: new Date(),
        })
        .where(eq(inboxItems.id, item.id));

      await tx.insert(inboxWorkflowEvents).values({
        itemId: item.id,
        attemptNo,
        eventType: "item.normalized",
        stepName: "normalize",
        status: "completed",
        payload: {
          inputHash: persistedHash,
          outputHash: normalizedHash,
          notes: pipeline.normalizer.normalizationNotes,
        },
      });

      await persistAnalysisTransaction(tx, {
        item,
        attemptNo,
        pipeline,
        effectiveRoute: pipeline.route,
        persistClarificationDraft: true,
        emitSegmentEvent: true,
      });
    });

    const detail = await getInboxItemDetailQuery(item.id);
    if (!detail) {
      throw new Error("Processed inbox item detail could not be loaded.");
    }

    return detail;
  } catch (error) {
    await db
      .update(inboxItems)
      .set({
        status: "failed_needs_review",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, item.id));

    await insertWorkflowEvent({
      itemId: item.id,
      attemptNo,
      eventType: "item.failed",
      stepName: "emit_status",
      status: "failed",
      payload: {
        message: error instanceof Error ? error.message : "Unknown inbox pipeline error.",
      },
    });

    throw error;
  }
}

export async function answerInboxClarificationCommand(
  requestId: string,
  answerText: ClarificationAnswerInput["answerText"]
) {
  const parsedAnswer = clarificationAnswerInputSchema.parse({
    answerText,
  });

  const [request] = await db
    .select()
    .from(inboxClarificationRequests)
    .where(eq(inboxClarificationRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new InboxCommandError("Clarification request not found.", 404);
  }

  const [item] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, request.itemId))
    .limit(1);

  if (!item) {
    throw new InboxCommandError("Inbox item not found.", 404);
  }

  if (request.status !== "pending") {
    throw getConflictError("Clarification request is no longer pending.");
  }

  if (item.status !== "clarification_requested") {
    throw getConflictError(
      "Parent inbox item is not waiting for a clarification answer."
    );
  }

  const rawFragmentRows = await db
    .select()
    .from(inboxFragments)
    .where(
      and(eq(inboxFragments.itemId, item.id), eq(inboxFragments.sourceKind, "item_raw"))
    )
    .orderBy(asc(inboxFragments.ordinal));

  const answerId = randomUUID();
  const attemptNo = await getNextAttemptNo(item.id);
  const answeredAt = new Date();
  const pipeline = runInboxPipelineDraft({
    itemId: item.id,
    rawText: item.rawText,
    sourceType: item.sourceType,
    baseNormalizedText: item.normalizedText,
    baseLanguage: item.language,
    baseFragments: rawFragmentRows.map(mapStoredFragmentToCandidate),
    clarificationContext: [
      {
        requestId: request.id,
        question: request.question,
        answerId,
        answerText: parsedAnswer.answerText,
      },
    ],
    resolveContext: await getResolveContextForItem(item),
  });

  const effectiveRoute =
    pipeline.route.route === "clarify"
      ? finalizeInboxRouteAfterClarification(pipeline.route)
      : pipeline.route;

  await db.transaction(async (tx) => {
    const [liveRequest] = await tx
      .select()
      .from(inboxClarificationRequests)
      .where(eq(inboxClarificationRequests.id, requestId))
      .limit(1);

    if (!liveRequest) {
      throw new InboxCommandError("Clarification request not found.", 404);
    }

    const [liveItem] = await tx
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.id, liveRequest.itemId))
      .limit(1);

    if (!liveItem) {
      throw new InboxCommandError("Inbox item not found.", 404);
    }

    if (liveRequest.status !== "pending") {
      throw getConflictError("Clarification request is no longer pending.");
    }

    if (liveItem.status !== "clarification_requested") {
      throw getConflictError(
        "Parent inbox item is not waiting for a clarification answer."
      );
    }

    await tx.insert(inboxClarificationAnswers).values({
      id: answerId,
      requestId: liveRequest.id,
      answerText: parsedAnswer.answerText,
    });

    await tx
      .update(inboxClarificationRequests)
      .set({
        status: "answered",
        answeredAt,
      })
      .where(eq(inboxClarificationRequests.id, liveRequest.id));

    await tx.insert(inboxWorkflowEvents).values({
      itemId: liveItem.id,
      attemptNo,
      eventType: "item.clarification_answered",
      stepName: "answer_clarification",
      status: "completed",
      payload: {
        requestId: liveRequest.id,
        answerId,
      },
    });

    await clearInboxAnalysisStateTx(tx, liveItem.id);

    await persistAnalysisTransaction(tx, {
      item: liveItem,
      attemptNo,
      pipeline,
      effectiveRoute,
      persistClarificationDraft: false,
      emitSegmentEvent: false,
      routeEventPayload:
        pipeline.route.route === "clarify"
          ? {
              requestedRoute: "clarify",
              overrideReason: "clarification cap reached",
            }
          : undefined,
      terminalEventPayload:
        pipeline.route.route === "clarify"
          ? {
              overrideReason: "clarification cap reached",
            }
          : undefined,
    });
  });

  const detail = await getInboxItemDetailQuery(item.id);
  if (!detail) {
    throw new Error("Processed inbox item detail could not be loaded.");
  }

  return detail;
}
