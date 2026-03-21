import type { infer as Infer } from "zod";

import type {
  InboxAtomType,
  InboxClarificationStatus,
  InboxEmbeddingOwnerType,
  InboxFragmentType,
  InboxFragmentSourceKind,
  InboxHypothesisType,
  InboxItemStatus,
  InboxMergeCandidateDecision,
  InboxMergeTargetObjectType,
  InboxPacketType,
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
  clarificationRequestDraftSchema,
  inboxScoreBreakdownSchema,
  structuredPacketDraftSchema,
} from "@/features/inbox/schemas";

export type InboxItemRecord = {
  id: string;
  userId: string;
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

export type InboxItemDetailRecord = {
  item: InboxItemRecord;
  fragments: InboxFragmentRecord[];
  hypotheses: InboxHypothesisRecord[];
  atoms: InboxAtomRecord[];
  structuredPackets: InboxStructuredPacketRecord[];
  mergeCandidates: InboxMergeCandidateRecord[];
  clarificationRequests: InboxClarificationRequestRecord[];
  clarificationAnswers: InboxClarificationAnswerRecord[];
  workflowEvents: InboxWorkflowEventRecord[];
};

export type InboxOwnedClarificationRequestRecord = {
  id: string;
  itemId: string;
  userId: string;
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
export type InboxClarificationRequestDraft = Infer<
  typeof clarificationRequestDraftSchema
>;
export type InboxClarificationAnswerPayload = Infer<
  typeof clarificationAnswerInputSchema
>;
