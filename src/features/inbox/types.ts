import type { infer as Infer } from "zod";

import type {
  InboxAtomType,
  InboxClarificationStatus,
  InboxExecutionFailureCode,
  InboxEmbeddingOwnerType,
  InboxFragmentType,
  InboxFragmentSourceKind,
  InboxHypothesisType,
  InboxItemStatus,
  InboxMergeCandidateDecision,
  InboxMergeTargetObjectType,
  InboxPacketType,
  InboxPipelineAttemptTriggerKind,
  InboxPipelineRunStatus,
  InboxRoute,
  InboxSourceType,
  InboxStructuredPacketStatus,
  InboxWorkflowEventStatus,
} from "@/shared/db/schema";
import type {
  clarifierOutputSchema,
  interpretOutputSchema,
  normalizerOutputSchema,
  resolveOutputSchema,
  routeOutputSchema,
  scoreOutputSchema,
  segmenterOutputSchema,
} from "@/features/inbox/contracts";
import type {
  clarificationAnswerInputSchema,
  InboxApplyContract,
  InboxApplyOperation,
  InboxApplyConceptRef,
  inboxRoutingDecisionNoteSchema,
  inboxRoutingPolicyTraceSchema,
  inboxStructuredPacketMetadataSchema,
  InboxStructuredPacketPayload,
  clarificationRequestDraftSchema,
  inboxScoreBreakdownSchema,
  structuredPacketDraftSchema,
} from "@/features/inbox/schemas";

export type InboxItemRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  mapId: string | null;
  sourceType: InboxSourceType;
  sourceRef: string | null;
  rawText: string;
  normalizedText: string | null;
  language: string | null;
  status: InboxItemStatus;
  score: number | null;
  confidence: number | null;
  ambiguity: number | null;
  risk: number | null;
  route: InboxRoute | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InboxFragmentRecord = {
  id: string;
  itemId: string;
  ordinal: number;
  fragmentText: string;
  fragmentType: InboxFragmentType | null;
  sourceKind: InboxFragmentSourceKind;
  clarificationAnswerId: string | null;
  spanStart: number | null;
  spanEnd: number | null;
};

export type InboxHypothesisRecord = {
  id: string;
  itemId: string;
  fragmentId: string | null;
  rank: number;
  hypothesisType: InboxHypothesisType;
  payload: Record<string, unknown>;
  confidence: number;
  explanation: string | null;
  modelName: string;
  promptVersion: string;
};

export type InboxAtomRecord = {
  id: string;
  itemId: string;
  hypothesisId: string;
  atomType: InboxAtomType;
  canonicalValue: string | null;
  payload: Record<string, unknown>;
  confidence: number;
};

export type InboxStructuredPacketRecord = {
  id: string;
  itemId: string;
  packetType: InboxPacketType;
  summary: string;
  payload: Record<string, unknown>;
  metadata: InboxStructuredPacketMetadataRecord;
  route: InboxRoute;
  status: InboxStructuredPacketStatus;
};

export type InboxMergeCandidateRecord = {
  id: string;
  itemId: string;
  targetObjectType: InboxMergeTargetObjectType;
  targetObjectId: string;
  similarity: number;
  decision: InboxMergeCandidateDecision | null;
};

export type InboxClarificationRequestRecord = {
  id: string;
  itemId: string;
  question: string;
  reason: string;
  status: InboxClarificationStatus;
  answeredAt: Date | null;
};

export type InboxClarificationAnswerRecord = {
  id: string;
  requestId: string;
  answerText: string;
  createdAt: Date;
};

export type InboxEmbeddingRecord = {
  id: string;
  ownerType: InboxEmbeddingOwnerType;
  ownerId: string;
  embedding: number[];
  embeddingModel: string;
  contentHash: string;
};

export type InboxWorkflowEventRecord = {
  id: string;
  itemId: string;
  eventType: string;
  stepName: string;
  status: InboxWorkflowEventStatus;
  payload: Record<string, unknown> | null;
  attemptNo: number;
  createdAt: Date;
};

export type InboxStepRunRecord = {
  id: string;
  attemptId: string;
  stepName: string;
  stepOrder: number;
  runNo: number;
  status: InboxPipelineRunStatus;
  modelName: string | null;
  promptVersion: string | null;
  route: InboxRoute | null;
  reason: string | null;
  inputHash: string | null;
  outputHash: string | null;
  failureCode: InboxExecutionFailureCode | null;
  failureMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: Date;
  finishedAt: Date | null;
  latencyMs: number | null;
};

export type InboxExecutionAttemptRecord = {
  id: string;
  itemId: string;
  attemptNo: number;
  triggerKind: InboxPipelineAttemptTriggerKind;
  runnerKind: string;
  status: InboxPipelineRunStatus;
  route: InboxRoute | null;
  reason: string | null;
  failureCode: InboxExecutionFailureCode | null;
  failureMessage: string | null;
  clarificationRequestId: string | null;
  clarificationAnswerId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  latencyMs: number | null;
  steps: InboxStepRunRecord[];
};

export type InboxReviewArtifactRecord = {
  id: string;
  batchId: string;
  artifactOrder: number;
  suggestionType: string;
  targetEntityType: string;
  targetEntityId: string | null;
  proposedPayload: Record<string, unknown>;
  resolutionType: string | null;
  applyStatus: string | null;
  applyError: string | null;
  reasonText: string | null;
  resolvedAt: Date | null;
};

export type InboxReviewBatchRecord = {
  id: string;
  inboxPacketId: string | null;
  batchType: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  metadata: Record<string, unknown>;
  artifacts: InboxReviewArtifactRecord[];
};

export type InboxItemDetailRecord = {
  item: InboxItemRecord;
  fragments: InboxFragmentRecord[];
  hypotheses: InboxHypothesisRecord[];
  atoms: InboxAtomRecord[];
  structuredPackets: InboxStructuredPacketRecord[];
  reviewBatches: InboxReviewBatchRecord[];
  mergeCandidates: InboxMergeCandidateRecord[];
  clarificationRequests: InboxClarificationRequestRecord[];
  clarificationAnswers: InboxClarificationAnswerRecord[];
  attempts: InboxExecutionAttemptRecord[];
  workflowEvents: InboxWorkflowEventRecord[];
};

export type InboxWorkspaceClarificationRequestRecord = {
  id: string;
  itemId: string;
  workspaceId: string;
  question: string;
  reason: string;
  status: InboxClarificationStatus;
  answeredAt: Date | null;
};

export type InboxScoreBreakdownRecord = Infer<typeof inboxScoreBreakdownSchema>;
export type InboxNormalizerOutput = Infer<typeof normalizerOutputSchema>;
export type InboxSegmenterOutput = Infer<typeof segmenterOutputSchema>;
export type InboxInterpretOutput = Infer<typeof interpretOutputSchema>;
export type InboxScoreOutput = Infer<typeof scoreOutputSchema>;
export type InboxResolveOutput = Infer<typeof resolveOutputSchema>;
export type InboxRouteOutput = Infer<typeof routeOutputSchema>;
export type InboxClarifierOutput = Infer<typeof clarifierOutputSchema>;
export type InboxStructuredPacketDraft = Infer<typeof structuredPacketDraftSchema>;
export type InboxApplyContractRecord = InboxApplyContract;
export type InboxApplyOperationRecord = InboxApplyOperation;
export type InboxApplyConceptRefRecord = InboxApplyConceptRef;
export type InboxStructuredPacketPayloadRecord = InboxStructuredPacketPayload;
export type InboxRoutingDecisionNoteRecord = Infer<
  typeof inboxRoutingDecisionNoteSchema
>;
export type InboxRoutingPolicyTraceRecord = Infer<
  typeof inboxRoutingPolicyTraceSchema
>;
export type InboxStructuredPacketMetadataRecord = Infer<
  typeof inboxStructuredPacketMetadataSchema
>;
export type InboxClarificationRequestDraft = Infer<
  typeof clarificationRequestDraftSchema
>;
export type InboxClarificationAnswerPayload = Infer<
  typeof clarificationAnswerInputSchema
>;
