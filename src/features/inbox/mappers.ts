import type {
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
} from "@/shared/db/schema";
import type {
  InboxAtomRecord,
  InboxClarificationAnswerRecord,
  InboxClarificationRequestRecord,
  InboxExecutionAttemptRecord,
  InboxFragmentRecord,
  InboxHypothesisRecord,
  InboxItemRecord,
  InboxMergeCandidateRecord,
  InboxStepRunRecord,
  InboxStructuredPacketRecord,
  InboxWorkflowEventRecord,
} from "@/features/inbox/types";

export function mapInboxItemRecord(
  row: typeof inboxItems.$inferSelect
): InboxItemRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    mapId: row.mapId,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef,
    rawText: row.rawText,
    normalizedText: row.normalizedText,
    language: row.language,
    status: row.status,
    score: row.score,
    confidence: row.confidence,
    ambiguity: row.ambiguity,
    risk: row.risk,
    route: row.route,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapInboxFragmentRecord(
  row: typeof inboxFragments.$inferSelect
): InboxFragmentRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    ordinal: row.ordinal,
    fragmentText: row.fragmentText,
    fragmentType: row.fragmentType,
    sourceKind: row.sourceKind,
    clarificationAnswerId: row.clarificationAnswerId,
    spanStart: row.spanStart,
    spanEnd: row.spanEnd,
  };
}

export function mapInboxHypothesisRecord(
  row: typeof inboxHypotheses.$inferSelect
): InboxHypothesisRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    fragmentId: row.fragmentId,
    rank: row.rank,
    hypothesisType: row.hypothesisType,
    payload: row.payload,
    confidence: row.confidence,
    explanation: row.explanation,
    modelName: row.modelName,
    promptVersion: row.promptVersion,
  };
}

export function mapInboxAtomRecord(
  row: typeof inboxAtoms.$inferSelect
): InboxAtomRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    hypothesisId: row.hypothesisId,
    atomType: row.atomType,
    canonicalValue: row.canonicalValue,
    payload: row.payload,
    confidence: row.confidence,
  };
}

export function mapInboxStructuredPacketRecord(
  row: typeof inboxStructuredPackets.$inferSelect
): InboxStructuredPacketRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    packetType: row.packetType,
    summary: row.summary,
    payload: row.payload,
    metadata: row.metadata,
    route: row.route,
    status: row.status,
  };
}

export function mapInboxMergeCandidateRecord(
  row: typeof inboxMergeCandidates.$inferSelect
): InboxMergeCandidateRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    targetObjectType: row.targetObjectType,
    targetObjectId: row.targetObjectId,
    similarity: row.similarity,
    decision: row.decision,
  };
}

export function mapInboxClarificationRequestRecord(
  row: typeof inboxClarificationRequests.$inferSelect
): InboxClarificationRequestRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    question: row.question,
    reason: row.reason,
    status: row.status,
    answeredAt: row.answeredAt,
  };
}

export function mapInboxClarificationAnswerRecord(
  row: typeof inboxClarificationAnswers.$inferSelect
): InboxClarificationAnswerRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    answerText: row.answerText,
    createdAt: row.createdAt,
  };
}

export function mapInboxWorkflowEventRecord(
  row: typeof inboxWorkflowEvents.$inferSelect
): InboxWorkflowEventRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    eventType: row.eventType,
    stepName: row.stepName,
    status: row.status,
    payload: row.payload ?? null,
    attemptNo: row.attemptNo,
    createdAt: row.createdAt,
  };
}

export function mapInboxStepRunRecord(
  row: typeof inboxStepRuns.$inferSelect
): InboxStepRunRecord {
  return {
    id: row.id,
    attemptId: row.attemptId,
    stepName: row.stepName,
    stepOrder: row.stepOrder,
    runNo: row.runNo,
    status: row.status,
    modelName: row.modelName,
    promptVersion: row.promptVersion,
    route: row.route,
    reason: row.reason,
    inputHash: row.inputHash,
    outputHash: row.outputHash,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    metadata: row.metadata,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    latencyMs: row.latencyMs,
  };
}

export function mapInboxExecutionAttemptRecord(
  row: typeof inboxPipelineAttempts.$inferSelect,
  steps: InboxStepRunRecord[]
): InboxExecutionAttemptRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    attemptNo: row.attemptNo,
    triggerKind: row.triggerKind,
    runnerKind: row.runnerKind,
    status: row.status,
    route: row.route,
    reason: row.reason,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    clarificationRequestId: row.clarificationRequestId,
    clarificationAnswerId: row.clarificationAnswerId,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    latencyMs: row.latencyMs,
    steps,
  };
}
