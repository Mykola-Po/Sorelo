import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { and, asc, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";

import {
  buildInboxRouteDraft,
  buildInboxSegmentationDraft,
  finalizeInboxRouteAfterClarification,
  normalizeInboxText,
  resolveInboxInterpretation,
  scoreInboxInterpretation,
} from "@/features/inbox/engine";
import {
  applyInboxRoutingOverride,
  applyInboxRoutingPolicyTraceToRouteOutput,
  deriveInboxRoutingCompatibility,
} from "@/features/inbox/routing-policy";
import {
  classifyInboxExecutionFailure,
  getInboxExecutionStepOrder,
  runRecordedInboxStep,
  type InboxStepRecorder,
} from "@/features/inbox/execution";
import {
  extractInboxInterpretation,
  getConfiguredInboxInterpretRuntime,
} from "@/features/inbox/llm-extractor";
import { mapInboxItemRecord } from "@/features/inbox/mappers";
import { getInboxItemDetailQuery } from "@/features/inbox/queries";
import { materializeInboxReviewBatchWithTx } from "@/features/learning/commands";
import {
  clarificationAnswerInputSchema,
  type InboxClarificationContextEntry,
  ingestInboxItemInputSchema,
  structuredPacketDraftSchema,
  type ClarificationAnswerInput,
  type IngestInboxItemInput,
} from "@/features/inbox/schemas";
import {
  requireActiveMap,
  requireWorkspaceMembership,
} from "@/features/maps/access";
import { db } from "@/shared/db/client";
import {
  concepts,
  inboxAtoms,
  inboxClarificationAnswers,
  inboxClarificationRequests,
  inboxFragments,
  inboxHypotheses,
  inboxItems,
  inboxMergeCandidates,
  inboxPipelineAttempts,
  inboxStructuredPackets,
  inboxStepRuns,
  inboxWorkflowEvents,
  users,
  type InboxItemStatus,
  type InboxPipelineAttemptTriggerKind,
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

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type InboxItemRow = typeof inboxItems.$inferSelect;
type InboxFragmentRow = typeof inboxFragments.$inferSelect;

type InboxProcessingAttemptInput = {
  item: InboxItemRow;
  attemptNo: number;
  triggerKind: InboxPipelineAttemptTriggerKind;
  clarificationContext?: InboxClarificationContextEntry[];
  clarificationRequestId?: string | null;
  clarificationAnswerId?: string | null;
  persistClarificationDraft: boolean;
};

type InboxAttemptRecord = {
  id: string;
  itemId: string;
  attemptNo: number;
  triggerKind: InboxPipelineAttemptTriggerKind;
  clarificationRequestId: string | null;
  clarificationAnswerId: string | null;
  startedAt: Date;
};

type PersistRouteStepInput = {
  item: InboxItemRow;
  attemptNo: number;
  requestedRoute: ReturnType<typeof buildInboxRouteDraft>["route"];
  effectiveRoute: ReturnType<typeof buildInboxRouteDraft>["route"];
  persistClarificationDraft: boolean;
};

type PersistRouteStepResult = {
  packetId: string | null;
  packetStatus: string | null;
  clarificationRequestId: string | null;
};

type PersistTerminalStepInput = {
  item: InboxItemRow;
  attemptNo: number;
  effectiveRoute: ReturnType<typeof buildInboxRouteDraft>["route"];
  packetId: string | null;
  packetStatus: string | null;
};

type PersistTerminalStepResult = {
  terminalStatus: InboxItemStatus;
  terminalEventType: string;
  packetStatus: string | null;
  promotedBatchId: string | null;
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

async function getExistingMapConcepts(mapId: string, workspaceId: string) {
  return db
    .select({
      id: concepts.id,
      title: concepts.title,
      conceptType: concepts.conceptType,
      summary: concepts.summary,
      description: concepts.description,
    })
    .from(concepts)
    .where(
      and(
        eq(concepts.mapId, mapId),
        eq(concepts.workspaceId, workspaceId),
        isNull(concepts.archivedAt)
      )
    )
    .orderBy(asc(concepts.title));
}

async function getNextAttemptNo(itemId: string) {
  const [existingEventAttempt, existingPipelineAttempt] = await Promise.all([
    db
      .select({ attemptNo: inboxWorkflowEvents.attemptNo })
      .from(inboxWorkflowEvents)
      .where(eq(inboxWorkflowEvents.itemId, itemId))
      .orderBy(desc(inboxWorkflowEvents.attemptNo))
      .limit(1),
    db
      .select({ attemptNo: inboxPipelineAttempts.attemptNo })
      .from(inboxPipelineAttempts)
      .where(eq(inboxPipelineAttempts.itemId, itemId))
      .orderBy(desc(inboxPipelineAttempts.attemptNo))
      .limit(1),
  ]);

  return Math.max(
    existingEventAttempt[0]?.attemptNo ?? 0,
    existingPipelineAttempt[0]?.attemptNo ?? 0
  ) + 1;
}

function measureLatencyMs(startedAt: Date, finishedAt: Date) {
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}

function buildDbInboxStepRecorder(): InboxStepRecorder {
  return {
    async startStep(input) {
      const [stepRun] = await db
        .insert(inboxStepRuns)
        .values({
          attemptId: input.attemptId,
          stepName: input.stepName,
          stepOrder: input.stepOrder,
          runNo: input.runNo,
          status: input.status,
          modelName: input.modelName,
          promptVersion: input.promptVersion,
          inputHash: input.inputHash,
          route: input.route,
          reason: input.reason,
          metadata: input.metadata,
          startedAt: input.startedAt,
        })
        .returning({
          id: inboxStepRuns.id,
        });

      if (!stepRun) {
        throw new Error("Inbox step telemetry creation failed.");
      }

      return stepRun.id;
    },
    async finishStep(input) {
      await db
        .update(inboxStepRuns)
        .set({
          status: input.status,
          outputHash: input.outputHash,
          route: input.route,
          reason: input.reason,
          metadata: input.metadata,
          finishedAt: input.finishedAt,
          latencyMs: input.latencyMs,
          failureCode: input.failureCode,
          failureMessage: input.failureMessage,
        })
        .where(eq(inboxStepRuns.id, input.stepRunId));
    },
  };
}

async function createInboxPipelineAttempt(input: {
  itemId: string;
  attemptNo: number;
  triggerKind: InboxPipelineAttemptTriggerKind;
  clarificationRequestId?: string | null;
  clarificationAnswerId?: string | null;
}) {
  const [attempt] = await db
    .insert(inboxPipelineAttempts)
    .values({
      itemId: input.itemId,
      attemptNo: input.attemptNo,
      triggerKind: input.triggerKind,
      runnerKind: "sync_command_chain.v1",
      status: "running",
      clarificationRequestId: input.clarificationRequestId ?? null,
      clarificationAnswerId: input.clarificationAnswerId ?? null,
    })
    .returning({
      id: inboxPipelineAttempts.id,
      itemId: inboxPipelineAttempts.itemId,
      attemptNo: inboxPipelineAttempts.attemptNo,
      triggerKind: inboxPipelineAttempts.triggerKind,
      clarificationRequestId: inboxPipelineAttempts.clarificationRequestId,
      clarificationAnswerId: inboxPipelineAttempts.clarificationAnswerId,
      startedAt: inboxPipelineAttempts.startedAt,
    });

  if (!attempt) {
    throw new Error("Inbox pipeline attempt creation failed.");
  }

  return attempt satisfies InboxAttemptRecord;
}

async function completeInboxPipelineAttempt(input: {
  attemptId: string;
  startedAt: Date;
  route: InboxRoute;
  reason: string;
  clarificationRequestId?: string | null;
}) {
  const finishedAt = new Date();
  await db
    .update(inboxPipelineAttempts)
    .set({
      status: "completed",
      route: input.route,
      reason: input.reason,
      clarificationRequestId: input.clarificationRequestId ?? undefined,
      finishedAt,
      latencyMs: measureLatencyMs(input.startedAt, finishedAt),
    })
    .where(eq(inboxPipelineAttempts.id, input.attemptId));
}

async function failInboxPipelineAttempt(input: {
  attemptId: string;
  startedAt: Date;
  error: unknown;
}) {
  const failure = classifyInboxExecutionFailure(input.error);
  const finishedAt = new Date();

  await db
    .update(inboxPipelineAttempts)
    .set({
      status: "failed",
      failureCode: failure.code,
      failureMessage: failure.message,
      finishedAt,
      latencyMs: measureLatencyMs(input.startedAt, finishedAt),
    })
    .where(eq(inboxPipelineAttempts.id, input.attemptId));

  return failure;
}

async function clearInboxAnalysisStateTx(
  tx: DbTransaction,
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

function buildRouteWorkflowEventPayload(input: {
  route: ReturnType<typeof buildInboxRouteDraft>["route"];
  packetId?: string | null;
  packetStatus?: string | null;
  clarificationRequestId?: string | null;
  suggestionBatchId?: string | null;
}) {
  const compatibility = deriveInboxRoutingCompatibility(input.route.routingPolicy);

  return {
    requestedRoute: compatibility.requestedRoute,
    effectiveRoute: compatibility.effectiveRoute,
    route: compatibility.route,
    reason: compatibility.reason,
    ...(compatibility.overrideReason
      ? { overrideReason: compatibility.overrideReason }
      : {}),
    routingPolicy: input.route.routingPolicy,
    ...(input.packetId ? { packetId: input.packetId } : {}),
    ...(input.packetStatus ? { packetStatus: input.packetStatus } : {}),
    ...(input.clarificationRequestId
      ? { clarificationRequestId: input.clarificationRequestId }
      : {}),
    ...(input.suggestionBatchId ? { suggestionBatchId: input.suggestionBatchId } : {}),
  };
}

function buildRouteStepMetadata(input: {
  route: ReturnType<typeof buildInboxRouteDraft>["route"];
  packetId?: string | null;
  packetStatus?: string | null;
  clarificationRequestId?: string | null;
}) {
  const compatibility = deriveInboxRoutingCompatibility(input.route.routingPolicy);

  return {
    requestedRoute: compatibility.requestedRoute,
    effectiveRoute: compatibility.effectiveRoute,
    reason: compatibility.reason,
    ...(compatibility.overrideReason
      ? { overrideReason: compatibility.overrideReason }
      : {}),
    ...(input.packetId ? { packetId: input.packetId } : {}),
    ...(input.packetStatus ? { packetStatus: input.packetStatus } : {}),
    ...(input.clarificationRequestId
      ? { clarificationRequestId: input.clarificationRequestId }
      : {}),
    routingPolicy: input.route.routingPolicy,
  };
}

function buildTerminalStepMetadata(input: {
  route: ReturnType<typeof buildInboxRouteDraft>["route"];
  terminalStatus: InboxItemStatus;
  packetStatus?: string | null;
  promotedBatchId?: string | null;
}) {
  const compatibility = deriveInboxRoutingCompatibility(input.route.routingPolicy);

  return {
    requestedRoute: compatibility.requestedRoute,
    effectiveRoute: compatibility.effectiveRoute,
    reason: compatibility.reason,
    ...(compatibility.overrideReason
      ? { overrideReason: compatibility.overrideReason }
      : {}),
    terminalStatus: input.terminalStatus,
    ...(input.packetStatus ? { packetStatus: input.packetStatus } : {}),
    ...(input.promotedBatchId ? { promotedBatchId: input.promotedBatchId } : {}),
    routingPolicy: input.route.routingPolicy,
  };
}

function getTerminalEventType(route: InboxRoute) {
  switch (route) {
    case "promote":
      return "item.ready_for_review";
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
      return "ready_for_review";
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

function coerceRouteForPromotionScope(
  item: InboxItemRow,
  route: ReturnType<typeof buildInboxRouteDraft>["route"]
) {
  if (route.route !== "promote" || (item.workspaceId && item.mapId)) {
    return route;
  }

  return applyInboxRoutingPolicyTraceToRouteOutput(
    route,
    applyInboxRoutingOverride(
      route.routingPolicy,
      "override.promotion_scope_requires_target_map"
    )
  );
}

function resolveEffectiveRoute(input: {
  item: InboxItemRow;
  requestedRoute: ReturnType<typeof buildInboxRouteDraft>["route"];
  triggerKind: InboxPipelineAttemptTriggerKind;
}) {
  if (
    input.triggerKind === "clarification_rerun" &&
    input.requestedRoute.route === "clarify"
  ) {
    const effectiveRoute = finalizeInboxRouteAfterClarification(
      input.requestedRoute
    );

    return {
      effectiveRoute,
      overrideReason:
        deriveInboxRoutingCompatibility(effectiveRoute.routingPolicy).overrideReason,
    };
  }

  const effectiveRoute = coerceRouteForPromotionScope(
    input.item,
    input.requestedRoute
  );
  const overrideReason = deriveInboxRoutingCompatibility(
    effectiveRoute.routingPolicy
  ).overrideReason;

  return {
    effectiveRoute,
    overrideReason,
  };
}

async function getResolveContextForItem(item: InboxItemRow) {
  const [otherNormalizedRows, existingConcepts] = await Promise.all([
    db
      .select({ normalizedText: inboxItems.normalizedText })
      .from(inboxItems)
      .where(
        and(
          eq(inboxItems.userId, item.userId),
          ne(inboxItems.id, item.id),
          isNotNull(inboxItems.normalizedText)
        )
      ),
    item.workspaceId && item.mapId
      ? getExistingMapConcepts(item.mapId, item.workspaceId)
      : Promise.resolve([]),
  ]);

  return {
    otherNormalizedTexts: otherNormalizedRows
      .map((row) => row.normalizedText)
      .filter((value): value is string => Boolean(value)),
    existingConcepts,
  };
}

async function persistRawStep(
  item: InboxItemRow,
  attemptNo: number,
  rawHash: string
) {
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
        inputHash: rawHash,
        outputHash: rawHash,
      },
    });
  });
}

async function persistNormalizeStep(input: {
  item: InboxItemRow;
  attemptNo: number;
  normalizer: ReturnType<typeof normalizeInboxText>;
  inputHash: string;
  outputHash: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(inboxItems)
      .set({
        normalizedText: input.normalizer.normalizedText,
        language: input.normalizer.language ?? null,
        status: "normalized",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, input.item.id));

    await tx.insert(inboxWorkflowEvents).values({
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: "item.normalized",
      stepName: "normalize",
      status: "completed",
      payload: {
        inputHash: input.inputHash,
        outputHash: input.outputHash,
        notes: input.normalizer.normalizationNotes,
      },
    });
  });
}

async function persistSegmentStep(input: {
  item: InboxItemRow;
  attemptNo: number;
  analysisFragments: ReturnType<typeof buildInboxSegmentationDraft>["analysisFragments"];
}) {
  return db.transaction(async (tx) => {
    await clearInboxAnalysisStateTx(tx, input.item.id);

    const fragmentRows = await tx
      .insert(inboxFragments)
      .values(
        input.analysisFragments.map((fragment) => ({
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

    return fragmentRows satisfies InboxFragmentRow[];
  });
}

async function persistInterpretStep(input: {
  item: InboxItemRow;
  attemptNo: number;
  fragmentRows: InboxFragmentRow[];
  interpretation: Awaited<
    ReturnType<typeof extractInboxInterpretation>
  >["interpretation"];
  clarificationFragmentCount: number;
  modelName: string;
  promptVersion: string;
  metadata: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    const fragmentIdByOrdinal = new Map(
      input.fragmentRows.map((row) => [row.ordinal, row.id] as const)
    );

    const hypothesisRows = await tx
      .insert(inboxHypotheses)
      .values(
        input.interpretation.hypotheses.map((hypothesis) => ({
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
           modelName: input.modelName,
           promptVersion: input.promptVersion,
         }))
       )
       .returning();

    const primaryHypothesisId = hypothesisRows[0]?.id;
    if (primaryHypothesisId) {
      await tx.insert(inboxAtoms).values(
        input.interpretation.atoms.map((atom) => ({
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
        outputHash: hashValue(JSON.stringify(input.interpretation)),
        hypothesisCount: hypothesisRows.length,
        atomCount: input.interpretation.atoms.length,
        clarificationFragmentCount: input.clarificationFragmentCount,
        runtime: input.metadata,
      },
    });
  });
}

async function persistScoreStep(input: {
  item: InboxItemRow;
  attemptNo: number;
  scorer: ReturnType<typeof scoreInboxInterpretation>;
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(inboxItems)
      .set({
        score: input.scorer.rInbox,
        confidence: input.scorer.confidence,
        ambiguity: input.scorer.ambiguity,
        risk: input.scorer.risk,
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
        outputHash: hashValue(JSON.stringify(input.scorer)),
        scoreBreakdown: input.scorer.scoreBreakdown,
      },
    });
  });
}

async function persistResolveStep(input: {
  item: InboxItemRow;
  attemptNo: number;
  resolver: ReturnType<typeof resolveInboxInterpretation>;
}) {
  await db.transaction(async (tx) => {
    if (input.resolver.mergeCandidates.length > 0) {
      await tx.insert(inboxMergeCandidates).values(
        input.resolver.mergeCandidates.map((candidate) => ({
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
        dedupeSignals: input.resolver.dedupeSignals,
        mergeCandidateCount: input.resolver.mergeCandidates.length,
      },
    });
  });
}

async function persistRouteStep(
  input: PersistRouteStepInput
): Promise<PersistRouteStepResult> {
  return db.transaction(async (tx) => {
    let packetId: string | null = null;
    let clarificationRequestId: string | null = null;

    if (input.effectiveRoute.structuredPacket) {
      const [packetRow] = await tx
        .insert(inboxStructuredPackets)
        .values({
          itemId: input.item.id,
          packetType: input.effectiveRoute.structuredPacket.packetType,
          summary: input.effectiveRoute.structuredPacket.summary,
          payload: input.effectiveRoute.structuredPacket.payload,
          metadata: {
            routingPolicy: input.effectiveRoute.routingPolicy,
          },
          route: input.effectiveRoute.route,
          status: input.effectiveRoute.structuredPacket.status,
        })
        .returning({
          id: inboxStructuredPackets.id,
        });

      packetId = packetRow?.id ?? null;
    }

    if (
      input.persistClarificationDraft &&
      input.effectiveRoute.clarificationDraft
    ) {
      const [requestRow] = await tx
        .insert(inboxClarificationRequests)
        .values({
          itemId: input.item.id,
          question: input.effectiveRoute.clarificationDraft.question,
          reason: input.effectiveRoute.clarificationDraft.reason,
          status: input.effectiveRoute.clarificationDraft.status,
        })
        .returning({
          id: inboxClarificationRequests.id,
        });

      clarificationRequestId = requestRow?.id ?? null;
    }

    await tx.insert(inboxWorkflowEvents).values({
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: "item.resolved",
      stepName: "route",
      status: "completed",
      payload: buildRouteWorkflowEventPayload({
        route: input.effectiveRoute,
        packetId,
        packetStatus: input.effectiveRoute.structuredPacket?.status ?? null,
        clarificationRequestId,
      }),
    });

    return {
      packetId,
      packetStatus: input.effectiveRoute.structuredPacket?.status ?? null,
      clarificationRequestId,
    };
  });
}

async function persistTerminalStep(
  input: PersistTerminalStepInput
): Promise<PersistTerminalStepResult> {
  return db.transaction(async (tx) => {
    let packetStatus = input.packetStatus;
    let promotedBatchId: string | null = null;

    if (
      input.effectiveRoute.route === "promote" &&
      input.effectiveRoute.structuredPacket &&
      input.packetId
    ) {
      const materializedPacket = await materializeInboxReviewBatchWithTx(tx, {
        item: input.item,
        packetId: input.packetId,
        packet: input.effectiveRoute.structuredPacket,
      });

      promotedBatchId = materializedPacket.batchId;
      packetStatus = materializedPacket.packetStatus;
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

    await tx.insert(inboxWorkflowEvents).values({
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: terminalEventType,
      stepName: input.effectiveRoute.route,
      status: "completed",
      payload: buildRouteWorkflowEventPayload({
        route: input.effectiveRoute,
        packetStatus,
        suggestionBatchId: promotedBatchId,
      }),
    });

    return {
      terminalStatus,
      terminalEventType,
      packetStatus,
      promotedBatchId,
    };
  });
}

async function persistEmitStatusStep(input: {
  itemId: string;
  attemptNo: number;
  eventType: string;
  terminalStatus: InboxItemStatus;
}) {
  await insertWorkflowEvent({
    itemId: input.itemId,
    attemptNo: input.attemptNo,
    eventType: input.eventType,
    stepName: "emit_status",
    status: "completed",
    payload: {
      finalStatus: input.terminalStatus,
    },
  });
}

async function runInboxProcessingAttempt(
  input: InboxProcessingAttemptInput
) {
  const clarificationContext = input.clarificationContext ?? [];
  const recorder = buildDbInboxStepRecorder();
  const attempt = await createInboxPipelineAttempt({
    itemId: input.item.id,
    attemptNo: input.attemptNo,
    triggerKind: input.triggerKind,
    ...(input.clarificationRequestId === undefined
      ? {}
      : { clarificationRequestId: input.clarificationRequestId }),
    ...(input.clarificationAnswerId === undefined
      ? {}
      : { clarificationAnswerId: input.clarificationAnswerId }),
  });

  try {
    const rawHash = hashValue(input.item.rawText);

    await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "persist_raw",
        stepOrder: getInboxExecutionStepOrder("persist_raw"),
        inputHash: rawHash,
        metadata: {
          sourceType: input.item.sourceType,
          triggerKind: input.triggerKind,
        },
      },
      async () => {
        await persistRawStep(input.item, input.attemptNo, rawHash);

        return {
          result: null,
          outputHash: rawHash,
          metadata: {
            sourceType: input.item.sourceType,
            triggerKind: input.triggerKind,
          },
        };
      }
    );

    const normalizer = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "normalize",
        stepOrder: getInboxExecutionStepOrder("normalize"),
        inputHash: rawHash,
        metadata: {
          triggerKind: input.triggerKind,
        },
      },
      async () => {
        const result = normalizeInboxText(input.item.rawText);
        const outputHash = hashValue(result.normalizedText);

        await persistNormalizeStep({
          item: input.item,
          attemptNo: input.attemptNo,
          normalizer: result,
          inputHash: rawHash,
          outputHash,
        });

        return {
          result,
          outputHash,
          metadata: {
            language: result.language,
            normalizationNoteCount: result.normalizationNotes.length,
          },
        };
      }
    );

    const normalizedHash = hashValue(normalizer.normalizedText);
    const segmentation = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "segment",
        stepOrder: getInboxExecutionStepOrder("segment"),
        inputHash: normalizedHash,
        metadata: {
          clarificationCount: clarificationContext.length,
        },
      },
      async () => {
        const result = buildInboxSegmentationDraft({
          normalizedText: normalizer.normalizedText,
          clarificationContext,
        });
        const outputHash = hashValue(JSON.stringify(result.analysisFragments));
        const fragmentRows = await persistSegmentStep({
          item: input.item,
          attemptNo: input.attemptNo,
          analysisFragments: result.analysisFragments,
        });

        return {
          result: {
            ...result,
            fragmentRows,
          },
          outputHash,
          metadata: {
            rawFragmentCount: result.segmenter.fragments.length,
            clarificationFragmentCount: result.clarificationFragments.length,
            analysisFragmentCount: result.analysisFragments.length,
          },
        };
      }
    );

    const segmentHash = hashValue(JSON.stringify(segmentation.analysisFragments));
    const interpretAttemptRuntime = getConfiguredInboxInterpretRuntime();
    const interpretation = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "interpret",
        stepOrder: getInboxExecutionStepOrder("interpret"),
        inputHash: segmentHash,
        runtimeOverride: {
          modelName: interpretAttemptRuntime.modelName,
          promptVersion: interpretAttemptRuntime.promptVersion,
        },
        metadata: {
          clarificationFragmentCount: segmentation.clarificationFragments.length,
          configuredProvider: interpretAttemptRuntime.provider,
        },
      },
      async () => {
        const extraction = await extractInboxInterpretation({
          itemId: input.item.id,
          normalizedText: normalizer.normalizedText,
          fragments: segmentation.analysisFragments,
          clarificationContext,
        });
        const outputHash = hashValue(JSON.stringify(extraction.interpretation));

        await persistInterpretStep({
          item: input.item,
          attemptNo: input.attemptNo,
          fragmentRows: segmentation.fragmentRows,
          interpretation: extraction.interpretation,
          clarificationFragmentCount: segmentation.clarificationFragments.length,
          modelName: extraction.runtime.modelName,
          promptVersion: extraction.runtime.promptVersion,
          metadata: extraction.runtime.metadata,
        });

        return {
          result: extraction.interpretation,
          outputHash,
          metadata: {
            hypothesisCount: extraction.interpretation.hypotheses.length,
            atomCount: extraction.interpretation.atoms.length,
            relationCount: extraction.interpretation.relations.length,
            ...extraction.runtime.metadata,
            actualProvider: extraction.runtime.provider,
            actualModelName: extraction.runtime.modelName,
            actualPromptVersion: extraction.runtime.promptVersion,
            fallbackUsed: extraction.runtime.fallbackUsed,
          },
        };
      }
    );

    const interpretationHash = hashValue(JSON.stringify(interpretation));
    const scorer = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "score",
        stepOrder: getInboxExecutionStepOrder("score"),
        inputHash: interpretationHash,
      },
      async () => {
        const result = scoreInboxInterpretation(
          normalizer.normalizedText,
          interpretation,
          {
            clarificationContext,
          }
        );
        const outputHash = hashValue(JSON.stringify(result));

        await persistScoreStep({
          item: input.item,
          attemptNo: input.attemptNo,
          scorer: result,
        });

        return {
          result,
          outputHash,
          metadata: {
            rInbox: result.rInbox,
            confidence: result.confidence,
            ambiguity: result.ambiguity,
            risk: result.risk,
          },
        };
      }
    );

    const resolveState = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "resolve",
        stepOrder: getInboxExecutionStepOrder("resolve"),
        inputHash: hashValue(
          JSON.stringify({
            normalizedText: normalizer.normalizedText,
            entities: interpretation.entities,
            relations: interpretation.relations,
          })
        ),
      },
      async () => {
        const resolveContext = await getResolveContextForItem(input.item);
        const resolver = resolveInboxInterpretation(
          normalizer.normalizedText,
          interpretation,
          resolveContext
        );
        const outputHash = hashValue(JSON.stringify(resolver));

        await persistResolveStep({
          item: input.item,
          attemptNo: input.attemptNo,
          resolver,
        });

        return {
          result: {
            resolveContext,
            resolver,
          },
          outputHash,
          metadata: {
            mergeCandidateCount: resolver.mergeCandidates.length,
            dedupeSignalCount: resolver.dedupeSignals.length,
          },
        };
      }
    );

    const routeState = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "route",
        stepOrder: getInboxExecutionStepOrder("route"),
        inputHash: hashValue(
          JSON.stringify({
            score: scorer,
            resolver: resolveState.resolver,
            clarificationCount: clarificationContext.length,
          })
        ),
      },
      async () => {
        const requestedRoute = buildInboxRouteDraft({
          normalizer,
          analysisFragments: segmentation.analysisFragments,
          interpreter: interpretation,
          scorer,
          resolver: resolveState.resolver,
          clarificationContext,
          resolveContext: resolveState.resolveContext,
        }).route;
        const { effectiveRoute, overrideReason } = resolveEffectiveRoute({
          item: input.item,
          requestedRoute,
          triggerKind: input.triggerKind,
        });
        const routePersistence = await persistRouteStep({
          item: input.item,
          attemptNo: input.attemptNo,
          requestedRoute,
          effectiveRoute,
          persistClarificationDraft: input.persistClarificationDraft,
        });

        return {
          result: {
            requestedRoute,
            effectiveRoute,
            overrideReason,
            routePersistence,
          },
          outputHash: hashValue(
            JSON.stringify({
              requestedRoute,
              effectiveRoute,
            })
          ),
          route: effectiveRoute.route,
          reason: effectiveRoute.reason,
          metadata: buildRouteStepMetadata({
            route: effectiveRoute,
            packetId: routePersistence.packetId,
            packetStatus: routePersistence.packetStatus,
            clarificationRequestId: routePersistence.clarificationRequestId,
          }),
        };
      }
    );

    const itemForTerminal: InboxItemRow = {
      ...input.item,
      normalizedText: normalizer.normalizedText,
      language: normalizer.language ?? null,
    };

    const terminalState = await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: routeState.effectiveRoute.route,
        stepOrder: getInboxExecutionStepOrder(routeState.effectiveRoute.route),
        inputHash: hashValue(
          JSON.stringify({
            route: routeState.effectiveRoute.route,
            packetId: routeState.routePersistence.packetId,
            packetStatus: routeState.routePersistence.packetStatus,
          })
        ),
        route: routeState.effectiveRoute.route,
        reason: routeState.effectiveRoute.reason,
      },
      async () => {
        const result = await persistTerminalStep({
          item: itemForTerminal,
          attemptNo: input.attemptNo,
          effectiveRoute: routeState.effectiveRoute,
          packetId: routeState.routePersistence.packetId,
          packetStatus: routeState.routePersistence.packetStatus,
        });

        return {
          result,
          outputHash: hashValue(
            JSON.stringify({
              terminalStatus: result.terminalStatus,
              packetStatus: result.packetStatus,
              promotedBatchId: result.promotedBatchId,
            })
          ),
          route: routeState.effectiveRoute.route,
          reason: routeState.effectiveRoute.reason,
          metadata: buildTerminalStepMetadata({
            route: routeState.effectiveRoute,
            terminalStatus: result.terminalStatus,
            packetStatus: result.packetStatus,
            promotedBatchId: result.promotedBatchId,
          }),
        };
      }
    );

    await runRecordedInboxStep(
      {
        recorder,
        attemptId: attempt.id,
        stepName: "emit_status",
        stepOrder: getInboxExecutionStepOrder("emit_status"),
        inputHash: hashValue(
          JSON.stringify({
            eventType: terminalState.terminalEventType,
            terminalStatus: terminalState.terminalStatus,
          })
        ),
        route: routeState.effectiveRoute.route,
        reason: routeState.effectiveRoute.reason,
      },
      async () => {
        await persistEmitStatusStep({
          itemId: input.item.id,
          attemptNo: input.attemptNo,
          eventType: terminalState.terminalEventType,
          terminalStatus: terminalState.terminalStatus,
        });

        return {
          result: null,
          outputHash: hashValue(terminalState.terminalStatus),
          route: routeState.effectiveRoute.route,
          reason: routeState.effectiveRoute.reason,
          metadata: {
            terminalStatus: terminalState.terminalStatus,
          },
        };
      }
    );

    await completeInboxPipelineAttempt({
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      route: routeState.effectiveRoute.route,
      reason: routeState.effectiveRoute.reason,
      clarificationRequestId:
        routeState.routePersistence.clarificationRequestId ??
        attempt.clarificationRequestId,
    });
  } catch (error) {
    const failure = await failInboxPipelineAttempt({
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      error,
    });

    await db
      .update(inboxItems)
      .set({
        status: "failed_needs_review",
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, input.item.id));

    await insertWorkflowEvent({
      itemId: input.item.id,
      attemptNo: input.attemptNo,
      eventType: "item.failed",
      stepName: "emit_status",
      status: "failed",
      payload: {
        message: failure.message,
        failureCode: failure.code,
      },
    });

    throw error;
  }

  const detail = await getInboxItemDetailQuery(input.item.id);
  if (!detail) {
    throw new Error("Processed inbox item detail could not be loaded.");
  }

  return detail;
}

export async function createInboxItemCommand(input: IngestInboxItemInput) {
  const parsed = ingestInboxItemInputSchema.parse(input);
  await requireUser(parsed.userId);
  await requireWorkspaceMembership(parsed.workspaceId, parsed.userId);
  await requireActiveMap(parsed.workspaceId, parsed.mapId);

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
      workspaceId: parsed.workspaceId,
      mapId: parsed.mapId,
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
      workspaceId: item.workspaceId,
      mapId: item.mapId,
    },
  });

  return {
    created: true,
    item: mapInboxItemRecord(item),
  };
}

export async function materializePromotedPacketCommand(itemId: string) {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.id, itemId))
      .limit(1);

    if (!item) {
      throw new InboxCommandError("Inbox item not found.", 404);
    }

    const [packetRow] = await tx
      .select()
      .from(inboxStructuredPackets)
      .where(eq(inboxStructuredPackets.itemId, itemId))
      .orderBy(desc(inboxStructuredPackets.id))
      .limit(1);

    if (!packetRow) {
      throw new InboxCommandError("Structured packet not found.", 404);
    }

    if (packetRow.route !== "promote") {
      throw getConflictError(
        "Only promote-routed structured packets can be materialized."
      );
    }

    const packet = structuredPacketDraftSchema.parse({
      packetType: packetRow.packetType,
      summary: packetRow.summary,
      payload: packetRow.payload,
      route: packetRow.route,
      status: packetRow.status,
    });

    return materializeInboxReviewBatchWithTx(tx, {
      item,
      packetId: packetRow.id,
      packet,
    });
  });
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
    item.status === "ready_for_review" ||
    item.status === "applied" ||
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

  return runInboxProcessingAttempt({
    item,
    attemptNo,
    triggerKind: "manual_process",
    persistClarificationDraft: true,
  });
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

  const answerId = randomUUID();
  const attemptNo = await getNextAttemptNo(item.id);
  const answeredAt = new Date();

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

    await tx
      .update(inboxItems)
      .set({
        updatedAt: answeredAt,
      })
      .where(eq(inboxItems.id, liveItem.id));
  });

  return runInboxProcessingAttempt({
    item,
    attemptNo,
    triggerKind: "clarification_rerun",
    clarificationContext: [
      {
        requestId: request.id,
        question: request.question,
        answerId,
        answerText: parsedAnswer.answerText,
      },
    ],
    clarificationRequestId: request.id,
    clarificationAnswerId: answerId,
    persistClarificationDraft: false,
  });
}
