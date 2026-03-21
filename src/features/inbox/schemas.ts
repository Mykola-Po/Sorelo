import { z } from "zod";

const uuidSchema = z.string().uuid();
const recordSchema = z.record(z.string(), z.unknown());
const scoreScalarSchema = z.number().min(0).max(1);

function boundedText(max: number) {
  return z.string().trim().min(1).max(max);
}

export const inboxSourceTypeSchema = z.enum([
  "manual_note",
  "transcript",
  "chat",
  "upload",
  "import",
]);

export const inboxItemStatusSchema = z.enum([
  "received",
  "persisted",
  "normalized",
  "segmented",
  "interpreted",
  "scored",
  "resolved",
  "clarification_requested",
  "promoted",
  "parked",
  "discarded",
  "failed_needs_review",
]);

export const inboxFragmentTypeSchema = z.enum([
  "statement",
  "question",
  "constraint",
  "claim",
  "observation",
  "intent",
  "unknown",
]);

export const inboxFragmentSourceKindSchema = z.enum([
  "item_raw",
  "clarification_answer",
]);

export const inboxHypothesisTypeSchema = z.enum([
  "interpretation",
  "candidate_structure",
  "relation_cluster",
  "actionable_summary",
]);

export const inboxAtomTypeSchema = z.enum([
  "entity",
  "relation",
  "intent",
  "question",
  "constraint",
  "claim",
  "observation",
]);

export const inboxRouteSchema = z.enum([
  "promote",
  "clarify",
  "park",
  "discard",
]);

export const inboxPacketTypeSchema = z.enum([
  "concept_packet",
  "link_packet",
  "mixed_packet",
  "clarification_packet",
  "parked_packet",
]);

export const inboxClarificationStatusSchema = z.enum([
  "pending",
  "answered",
  "dismissed",
  "expired",
]);

export const inboxWorkflowEventStatusSchema = z.enum([
  "started",
  "completed",
  "failed",
]);

export const inboxWorkflowStepNameSchema = z.enum([
  "ingest_item",
  "persist_raw",
  "normalize",
  "segment",
  "answer_clarification",
  "interpret",
  "score",
  "resolve",
  "route",
  "promote",
  "clarify",
  "park",
  "discard",
  "emit_status",
]);

export const inboxWorkflowEventTypeSchema = z.enum([
  "item.received",
  "item.normalized",
  "item.segmented",
  "item.clarification_answered",
  "item.interpreted",
  "item.scored",
  "item.resolved",
  "item.clarification_requested",
  "item.promoted",
  "item.parked",
  "item.discarded",
  "item.failed",
]);

export const ingestInboxItemInputSchema = z.object({
  userId: uuidSchema,
  sourceType: inboxSourceTypeSchema,
  sourceRef: boundedText(500).optional().nullable(),
  rawText: boundedText(50000),
  idempotencyKey: boundedText(128),
});

export const inboxFragmentSpanSchema = z
  .object({
    start: z.number().int().min(0),
    end: z.number().int().min(1),
  })
  .refine(({ start, end }) => end > start, {
    message: "Fragment span end must be greater than start.",
    path: ["end"],
  });

export const inboxFragmentCandidateSchema = z.object({
  ordinal: z.number().int().min(0),
  fragmentText: boundedText(4000),
  fragmentType: inboxFragmentTypeSchema.optional().nullable(),
  sourceKind: inboxFragmentSourceKindSchema.default("item_raw"),
  clarificationAnswerId: uuidSchema.optional().nullable(),
  typeCandidates: z.array(inboxFragmentTypeSchema).max(3).default([]),
  span: inboxFragmentSpanSchema.optional().nullable(),
  metadata: recordSchema.default({}),
});

export const inboxHypothesisCandidateSchema = z.object({
  rank: z.number().int().min(1).max(3),
  hypothesisType: inboxHypothesisTypeSchema,
  fragmentOrdinal: z.number().int().min(0).optional().nullable(),
  payload: recordSchema.default({}),
  confidence: scoreScalarSchema,
  explanation: boundedText(2000),
});

export const inboxAtomCandidateSchema = z.object({
  atomType: inboxAtomTypeSchema,
  canonicalValue: boundedText(280).optional().nullable(),
  payload: recordSchema.default({}),
  confidence: scoreScalarSchema,
});

export const inboxInterpreterEntitySchema = z.object({
  label: boundedText(280),
  entityType: z.enum([
    "concept",
    "state",
    "belief",
    "trigger",
    "fact",
    "person",
    "custom",
  ]),
  fragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
  confidence: scoreScalarSchema,
  payload: recordSchema.default({}),
});

export const inboxInterpreterRelationSchema = z.object({
  sourceLabel: boundedText(280),
  targetLabel: boundedText(280),
  relationType: z.enum([
    "causes",
    "strengthens",
    "weakens",
    "explains",
    "contradicts",
    "related_to",
  ]),
  fragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
  confidence: scoreScalarSchema,
  payload: recordSchema.default({}),
});

export const inboxIntentSchema = z.object({
  label: boundedText(280),
  confidence: scoreScalarSchema,
});

export const inboxQuestionSchema = z.object({
  question: boundedText(500),
  confidence: scoreScalarSchema,
});

export const inboxConstraintSchema = z.object({
  constraint: boundedText(500),
  confidence: scoreScalarSchema,
});

export const inboxScoreBreakdownSchema = z.object({
  signalQuality: scoreScalarSchema,
  interpretability: scoreScalarSchema,
  structure: scoreScalarSchema,
  grounding: scoreScalarSchema,
  actionability: scoreScalarSchema,
  utility: scoreScalarSchema,
  penalty: scoreScalarSchema,
});

export const inboxMergeCandidateDraftSchema = z.object({
  targetObjectType: z.enum(["concept", "link", "scenario", "map"]),
  targetObjectId: uuidSchema,
  similarity: scoreScalarSchema,
  decision: z.enum(["pending", "accepted", "rejected"]).optional().nullable(),
});

export const structuredPacketDraftSchema = z.object({
  packetType: inboxPacketTypeSchema,
  summary: boundedText(1000),
  payload: recordSchema.default({}),
  route: inboxRouteSchema,
  status: z.enum(["draft", "ready", "emitted"]),
});

export const clarificationRequestDraftSchema = z.object({
  question: boundedText(500),
  reason: boundedText(500),
  status: inboxClarificationStatusSchema.default("pending"),
});

export const inboxClarificationContextEntrySchema = z.object({
  requestId: uuidSchema,
  question: boundedText(500),
  answerId: uuidSchema,
  answerText: boundedText(4000),
});

export const clarificationAnswerInputSchema = z.object({
  answerText: boundedText(4000),
});

export const inboxWorkbenchCreateActionSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  sourceType: inboxSourceTypeSchema.default("manual_note"),
  rawText: boundedText(50000),
});

export const inboxWorkbenchProcessActionSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  itemId: uuidSchema,
});

export const inboxWorkbenchAnswerActionSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  requestId: uuidSchema,
  answerText: boundedText(4000),
});

export const inboxRouteDecisionInputSchema = z.object({
  rInbox: scoreScalarSchema,
  confidence: scoreScalarSchema,
  ambiguity: scoreScalarSchema,
  risk: scoreScalarSchema,
  isDuplicate: z.boolean().default(false),
  isEmptySignal: z.boolean().default(false),
  hasReusableSignal: z.boolean().default(false),
  expectedValueGain: scoreScalarSchema.default(0),
  askCost: scoreScalarSchema.default(1),
});

export const inboxRouteDecisionSchema = z.object({
  route: inboxRouteSchema,
  nextStatus: inboxItemStatusSchema,
  reason: boundedText(400),
});

export type InboxSourceTypeInput = z.infer<typeof inboxSourceTypeSchema>;
export type InboxItemStatusInput = z.infer<typeof inboxItemStatusSchema>;
export type InboxFragmentTypeInput = z.infer<typeof inboxFragmentTypeSchema>;
export type InboxFragmentSourceKindInput = z.infer<
  typeof inboxFragmentSourceKindSchema
>;
export type InboxHypothesisTypeInput = z.infer<
  typeof inboxHypothesisTypeSchema
>;
export type InboxAtomTypeInput = z.infer<typeof inboxAtomTypeSchema>;
export type InboxRouteInput = z.infer<typeof inboxRouteSchema>;
export type InboxPacketTypeInput = z.infer<typeof inboxPacketTypeSchema>;
export type InboxClarificationStatusInput = z.infer<
  typeof inboxClarificationStatusSchema
>;
export type InboxWorkflowEventStatusInput = z.infer<
  typeof inboxWorkflowEventStatusSchema
>;
export type InboxWorkflowStepName = z.infer<typeof inboxWorkflowStepNameSchema>;
export type InboxWorkflowEventType = z.infer<
  typeof inboxWorkflowEventTypeSchema
>;
export type IngestInboxItemInput = z.infer<typeof ingestInboxItemInputSchema>;
export type InboxFragmentCandidate = z.infer<
  typeof inboxFragmentCandidateSchema
>;
export type InboxHypothesisCandidate = z.infer<
  typeof inboxHypothesisCandidateSchema
>;
export type InboxAtomCandidate = z.infer<typeof inboxAtomCandidateSchema>;
export type InboxInterpreterEntity = z.infer<
  typeof inboxInterpreterEntitySchema
>;
export type InboxInterpreterRelation = z.infer<
  typeof inboxInterpreterRelationSchema
>;
export type InboxIntent = z.infer<typeof inboxIntentSchema>;
export type InboxQuestion = z.infer<typeof inboxQuestionSchema>;
export type InboxConstraint = z.infer<typeof inboxConstraintSchema>;
export type InboxScoreBreakdown = z.infer<typeof inboxScoreBreakdownSchema>;
export type InboxMergeCandidateDraft = z.infer<
  typeof inboxMergeCandidateDraftSchema
>;
export type StructuredPacketDraft = z.infer<typeof structuredPacketDraftSchema>;
export type ClarificationRequestDraft = z.infer<
  typeof clarificationRequestDraftSchema
>;
export type InboxClarificationContextEntry = z.infer<
  typeof inboxClarificationContextEntrySchema
>;
export type ClarificationAnswerInput = z.infer<
  typeof clarificationAnswerInputSchema
>;
export type InboxWorkbenchCreateActionInput = z.infer<
  typeof inboxWorkbenchCreateActionSchema
>;
export type InboxWorkbenchProcessActionInput = z.infer<
  typeof inboxWorkbenchProcessActionSchema
>;
export type InboxWorkbenchAnswerActionInput = z.infer<
  typeof inboxWorkbenchAnswerActionSchema
>;
export type InboxRouteDecisionInput = z.infer<
  typeof inboxRouteDecisionInputSchema
>;
export type InboxRouteDecisionInputDraft = z.input<
  typeof inboxRouteDecisionInputSchema
>;
export type InboxRouteDecision = z.infer<typeof inboxRouteDecisionSchema>;
