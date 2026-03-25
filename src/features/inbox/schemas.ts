import { z } from "zod";

const uuidSchema = z.string().uuid();
const recordSchema = z.record(z.string(), z.unknown());
const scoreScalarSchema = z.number().min(0).max(1);
const canonicalConceptTypeSchema = z.enum([
  "thought",
  "state",
  "belief",
  "experience",
  "fact",
  "trigger",
  "custom",
]);
const canonicalRelationTypeSchema = z.enum([
  "causes",
  "strengthens",
  "weakens",
  "explains",
  "contradicts",
]);

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
  "ready_for_review",
  "parked",
  "discarded",
  "applied",
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

export const inboxRoutingPolicyVersionSchema = z.literal("inbox-routing.v1");

export const inboxRoutingRuleIdSchema = z.enum([
  "discard.empty_duplicate_or_risk_ceiling",
  "promote.strong_signal_low_ambiguity",
  "clarify.value_of_asking_exceeds_cost",
  "park.reusable_signal_needs_review",
  "discard.weak_signal_low_value",
  "override.clarification_cap_reached",
  "override.promotion_scope_requires_target_map",
  "override.promote_requires_deterministic_mutation",
]);

export const inboxRoutingDecisionNoteIdSchema = z.enum([
  "route.discard.empty_duplicate_or_risk_ceiling",
  "route.promote.strong_signal_low_ambiguity",
  "route.clarify.value_of_asking_exceeds_cost",
  "route.park.reusable_signal_needs_review",
  "route.discard.weak_signal_low_value",
  "route.override.clarification_cap_reached",
  "route.override.promotion_scope_requires_target_map",
  "route.override.promote_requires_deterministic_mutation",
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
export const inboxPipelineAttemptTriggerKindSchema = z.enum([
  "manual_process",
  "clarification_rerun",
]);
export const inboxPipelineRunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
]);
export const inboxExecutionFailureCodeSchema = z.enum([
  "conflict",
  "validation",
  "persistence",
  "pipeline",
  "unknown",
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
  "item.ready_for_review",
  "item.parked",
  "item.discarded",
  "item.applied",
  "item.failed",
]);

export const ingestInboxItemInputSchema = z.object({
  userId: uuidSchema,
  workspaceId: uuidSchema,
  mapId: uuidSchema,
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

export const inboxApplyConceptRefSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("existing"),
    conceptId: uuidSchema,
  }),
  z.object({
    source: z.literal("packet"),
    conceptRef: boundedText(120),
  }),
]);

export const inboxCreateConceptOperationSchema = z.object({
  operationType: z.literal("create_concept"),
  conceptRef: boundedText(120),
  title: boundedText(160),
  conceptType: canonicalConceptTypeSchema,
  summary: boundedText(280).optional().nullable(),
  description: boundedText(4000).optional().nullable(),
  evidenceFragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
});

export const inboxUpdateConceptOperationSchema = z.object({
  operationType: z.literal("update_concept"),
  conceptId: uuidSchema,
  title: boundedText(160),
  conceptType: canonicalConceptTypeSchema,
  summary: boundedText(280).optional().nullable(),
  description: boundedText(4000).optional().nullable(),
  evidenceFragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
});

export const inboxCreateLinkOperationSchema = z.object({
  operationType: z.literal("create_link"),
  source: inboxApplyConceptRefSchema,
  target: inboxApplyConceptRefSchema,
  relationType: canonicalRelationTypeSchema,
  strength: z.number().int().min(1).max(5),
  description: boundedText(2000).optional().nullable(),
  evidenceFragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
});

export const inboxMergeCandidateOperationSchema = z.object({
  operationType: z.literal("merge_candidate"),
  targetEntityType: z.enum(["concept", "link"]),
  targetEntityId: uuidSchema,
  title: boundedText(160).optional().nullable(),
  reason: boundedText(500),
  similarity: scoreScalarSchema,
  evidenceFragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
});

export const inboxParkForReviewOperationSchema = z.object({
  operationType: z.literal("park_for_review"),
  reason: boundedText(500),
  evidenceFragmentOrdinals: z.array(z.number().int().min(0)).max(8).default([]),
  payload: recordSchema.default({}),
});

export const inboxApplyOperationSchema = z.discriminatedUnion("operationType", [
  inboxCreateConceptOperationSchema,
  inboxUpdateConceptOperationSchema,
  inboxCreateLinkOperationSchema,
  inboxMergeCandidateOperationSchema,
  inboxParkForReviewOperationSchema,
]);

export const inboxApplyContractSchema = z.object({
  contractVersion: z.literal("inbox-apply-contract.v1"),
  operations: z.array(inboxApplyOperationSchema).min(1).max(64),
  warnings: z.array(boundedText(280)).max(12).default([]),
});

export const inboxClarificationContextEntrySchema = z.object({
  requestId: uuidSchema,
  question: boundedText(500),
  answerId: uuidSchema,
  answerText: boundedText(4000),
});

export const inboxStructuredPacketPayloadSchema = z.object({
  entities: z.array(inboxInterpreterEntitySchema).max(32),
  relations: z.array(inboxInterpreterRelationSchema).max(32),
  intents: z.array(inboxIntentSchema).max(12),
  questions: z.array(inboxQuestionSchema).max(8),
  constraints: z.array(inboxConstraintSchema).max(8),
  clarificationContext: z.array(inboxClarificationContextEntrySchema).max(4),
  applyContract: inboxApplyContractSchema.optional().nullable(),
});

export const structuredPacketDraftSchema = z.object({
  packetType: inboxPacketTypeSchema,
  summary: boundedText(1000),
  payload: inboxStructuredPacketPayloadSchema,
  route: inboxRouteSchema,
  status: z.enum(["draft", "ready", "emitted"]),
});

export const clarificationRequestDraftSchema = z.object({
  question: boundedText(500),
  reason: boundedText(500),
  status: inboxClarificationStatusSchema.default("pending"),
});

export const clarificationAnswerInputSchema = z.object({
  answerText: boundedText(4000),
});

export const inboxWorkbenchCreateActionSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  mapId: uuidSchema,
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

export const inboxRoutingDecisionGatesSchema = z.object({
  discard: z.boolean(),
  promote: z.boolean(),
  clarify: z.boolean(),
  park: z.boolean(),
});

export const inboxRoutingInputSnapshotSchema = inboxRouteDecisionInputSchema.extend({
  gates: inboxRoutingDecisionGatesSchema,
});

export const inboxRouteDecisionSchema = z.object({
  route: inboxRouteSchema,
  nextStatus: inboxItemStatusSchema,
  reason: boundedText(400),
});

export const inboxRoutingDecisionNoteSchema = z.object({
  id: inboxRoutingDecisionNoteIdSchema,
  text: boundedText(500),
});

export const inboxRoutingDecisionSchema = inboxRouteDecisionSchema.extend({
  ruleId: inboxRoutingRuleIdSchema,
});

export const inboxRoutingOverrideSchema = z.object({
  ruleId: inboxRoutingRuleIdSchema,
  fromRoute: inboxRouteSchema,
  toRoute: inboxRouteSchema,
  note: inboxRoutingDecisionNoteSchema,
});

export const inboxRoutingPolicyTraceSchema = z.object({
  policyVersion: inboxRoutingPolicyVersionSchema,
  input: inboxRoutingInputSnapshotSchema,
  requestedDecision: inboxRoutingDecisionSchema,
  finalDecision: inboxRoutingDecisionSchema,
  overrides: z.array(inboxRoutingOverrideSchema).max(4).default([]),
  decisionNotes: z.array(inboxRoutingDecisionNoteSchema).min(1).max(8),
});

export const inboxStructuredPacketMetadataSchema = z.object({
  routingPolicy: inboxRoutingPolicyTraceSchema.optional(),
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
export type InboxPipelineAttemptTriggerKindInput = z.infer<
  typeof inboxPipelineAttemptTriggerKindSchema
>;
export type InboxPipelineRunStatusInput = z.infer<
  typeof inboxPipelineRunStatusSchema
>;
export type InboxExecutionFailureCodeInput = z.infer<
  typeof inboxExecutionFailureCodeSchema
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
export type InboxApplyConceptRef = z.infer<typeof inboxApplyConceptRefSchema>;
export type InboxCreateConceptOperation = z.infer<
  typeof inboxCreateConceptOperationSchema
>;
export type InboxUpdateConceptOperation = z.infer<
  typeof inboxUpdateConceptOperationSchema
>;
export type InboxCreateLinkOperation = z.infer<
  typeof inboxCreateLinkOperationSchema
>;
export type InboxMergeCandidateOperation = z.infer<
  typeof inboxMergeCandidateOperationSchema
>;
export type InboxParkForReviewOperation = z.infer<
  typeof inboxParkForReviewOperationSchema
>;
export type InboxApplyOperation = z.infer<typeof inboxApplyOperationSchema>;
export type InboxApplyContract = z.infer<typeof inboxApplyContractSchema>;
export type InboxStructuredPacketPayload = z.infer<
  typeof inboxStructuredPacketPayloadSchema
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
export type InboxRoutingPolicyVersion = z.infer<
  typeof inboxRoutingPolicyVersionSchema
>;
export type InboxRoutingRuleId = z.infer<typeof inboxRoutingRuleIdSchema>;
export type InboxRoutingDecisionNoteId = z.infer<
  typeof inboxRoutingDecisionNoteIdSchema
>;
export type InboxRoutingDecisionGates = z.infer<
  typeof inboxRoutingDecisionGatesSchema
>;
export type InboxRoutingInputSnapshot = z.infer<
  typeof inboxRoutingInputSnapshotSchema
>;
export type InboxRoutingDecisionNote = z.infer<
  typeof inboxRoutingDecisionNoteSchema
>;
export type InboxRoutingDecision = z.infer<
  typeof inboxRoutingDecisionSchema
>;
export type InboxRoutingOverride = z.infer<
  typeof inboxRoutingOverrideSchema
>;
export type InboxRoutingPolicyTrace = z.infer<
  typeof inboxRoutingPolicyTraceSchema
>;
export type InboxStructuredPacketMetadata = z.infer<
  typeof inboxStructuredPacketMetadataSchema
>;
