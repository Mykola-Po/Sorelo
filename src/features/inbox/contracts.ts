import { z } from "zod";

import {
  clarificationRequestDraftSchema,
  inboxClarificationContextEntrySchema,
  inboxAtomCandidateSchema,
  inboxConstraintSchema,
  inboxFragmentCandidateSchema,
  inboxHypothesisCandidateSchema,
  inboxIntentSchema,
  inboxInterpreterEntitySchema,
  inboxInterpreterRelationSchema,
  inboxItemStatusSchema,
  inboxMergeCandidateDraftSchema,
  inboxQuestionSchema,
  inboxRouteDecisionInputSchema,
  inboxRouteDecisionSchema,
  inboxScoreBreakdownSchema,
  inboxSourceTypeSchema,
  structuredPacketDraftSchema,
} from "@/features/inbox/schemas";

const uuidSchema = z.string().uuid();
const recordSchema = z.record(z.string(), z.unknown());

export const inboxWorkerStepSchema = z.enum([
  "normalize",
  "segment",
  "interpret",
  "score",
  "resolve",
  "clarify",
]);

export const persistRawInputSchema = z.object({
  itemId: uuidSchema,
  rawText: z.string().trim().min(1).max(50000),
  idempotencyKey: z.string().trim().min(8).max(128),
});

export const persistRawOutputSchema = z.object({
  itemId: uuidSchema,
  storedAt: z.coerce.date(),
  inputHash: z.string().trim().min(8).max(128),
});

export const normalizerInputSchema = z.object({
  itemId: uuidSchema,
  sourceType: inboxSourceTypeSchema,
  rawText: z.string().trim().min(1).max(50000),
  sourceRef: z.string().trim().min(1).max(500).optional().nullable(),
});

export const normalizerOutputSchema = z.object({
  normalizedText: z.string().trim().min(1).max(50000),
  language: z.string().trim().min(2).max(32).optional().nullable(),
  normalizationNotes: z.array(z.string().trim().min(1).max(280)).max(8),
});

export const segmenterInputSchema = z.object({
  itemId: uuidSchema,
  normalizedText: z.string().trim().min(1).max(50000),
  language: z.string().trim().min(2).max(32).optional().nullable(),
});

export const segmenterOutputSchema = z.object({
  fragments: z.array(inboxFragmentCandidateSchema).min(1).max(64),
});

export const interpretInputSchema = z.object({
  itemId: uuidSchema,
  normalizedText: z.string().trim().min(1).max(50000),
  fragments: z.array(inboxFragmentCandidateSchema).min(1).max(128),
  clarificationContext: z.array(inboxClarificationContextEntrySchema).max(4).default([]),
});

export const interpretOutputSchema = z.object({
  hypotheses: z.array(inboxHypothesisCandidateSchema).max(12),
  entities: z.array(inboxInterpreterEntitySchema).max(32),
  relations: z.array(inboxInterpreterRelationSchema).max(32),
  intents: z.array(inboxIntentSchema).max(12),
  questions: z.array(inboxQuestionSchema).max(8),
  constraints: z.array(inboxConstraintSchema).max(8),
  atoms: z.array(inboxAtomCandidateSchema).max(64),
});

export const scoreInputSchema = z.object({
  itemId: uuidSchema,
  hypotheses: z.array(inboxHypothesisCandidateSchema).max(12),
  entities: z.array(inboxInterpreterEntitySchema).max(32),
  relations: z.array(inboxInterpreterRelationSchema).max(32),
  intents: z.array(inboxIntentSchema).max(12),
  questions: z.array(inboxQuestionSchema).max(8),
  constraints: z.array(inboxConstraintSchema).max(8),
});

export const scoreOutputSchema = z.object({
  scoreBreakdown: inboxScoreBreakdownSchema,
  rInbox: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  ambiguity: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  explanation: z.string().trim().min(1).max(1000),
});

export const resolveInputSchema = z.object({
  itemId: uuidSchema,
  mapId: uuidSchema.optional().nullable(),
  hypotheses: z.array(inboxHypothesisCandidateSchema).max(12),
  entities: z.array(inboxInterpreterEntitySchema).max(32),
  relations: z.array(inboxInterpreterRelationSchema).max(32),
});

export const resolveOutputSchema = z.object({
  mergeCandidates: z.array(inboxMergeCandidateDraftSchema).max(32),
  linkedObjects: z
    .array(
      z.object({
        objectType: z.enum(["concept", "link", "scenario", "map"]),
        objectId: uuidSchema,
      })
    )
    .max(32),
  dedupeSignals: z.array(z.string().trim().min(1).max(280)).max(12),
});

export const routeInputSchema = z
  .object({
    itemId: uuidSchema,
    structuredPacket: structuredPacketDraftSchema.optional().nullable(),
    clarificationDraft: clarificationRequestDraftSchema.optional().nullable(),
    explanation: z.string().trim().min(1).max(1000).optional().nullable(),
  })
  .merge(inboxRouteDecisionInputSchema);

export const routeOutputSchema = inboxRouteDecisionSchema.extend({
  structuredPacket: structuredPacketDraftSchema.optional().nullable(),
  clarificationDraft: clarificationRequestDraftSchema.optional().nullable(),
});

export const clarifierInputSchema = z.object({
  itemId: uuidSchema,
  ambiguity: z.number().min(0).max(1),
  questions: z.array(inboxQuestionSchema).max(8),
  constraints: z.array(inboxConstraintSchema).max(8),
  routeContext: recordSchema.default({}),
});

export const clarifierOutputSchema = clarificationRequestDraftSchema;

export const answerClarificationInputSchema = z.object({
  itemId: uuidSchema,
  requestId: uuidSchema,
  answerId: uuidSchema,
  answerText: z.string().trim().min(1).max(4000),
});

export const answerClarificationOutputSchema = z.object({
  requestId: uuidSchema,
  answerId: uuidSchema,
  answeredAt: z.coerce.date(),
});

export const promoteInputSchema = z.object({
  itemId: uuidSchema,
  packet: structuredPacketDraftSchema,
});

export const promoteOutputSchema = z.object({
  itemId: uuidSchema,
  status: z.literal("promoted"),
  packetStatus: z.enum(["ready", "emitted"]),
});

export const parkInputSchema = z.object({
  itemId: uuidSchema,
  reason: z.string().trim().min(1).max(400),
});

export const parkOutputSchema = z.object({
  itemId: uuidSchema,
  status: z.literal("parked"),
});

export const discardInputSchema = z.object({
  itemId: uuidSchema,
  reason: z.string().trim().min(1).max(400),
});

export const discardOutputSchema = z.object({
  itemId: uuidSchema,
  status: z.literal("discarded"),
});

export const emitStatusInputSchema = z.object({
  itemId: uuidSchema,
  eventType: z.string().trim().min(1).max(120),
  status: inboxItemStatusSchema,
  payload: recordSchema.default({}),
});

export const emitStatusOutputSchema = z.object({
  itemId: uuidSchema,
  emittedAt: z.coerce.date(),
});

export type InboxWorkerStep = z.infer<typeof inboxWorkerStepSchema>;
export type PersistRawInput = z.infer<typeof persistRawInputSchema>;
export type PersistRawOutput = z.infer<typeof persistRawOutputSchema>;
export type NormalizerInput = z.infer<typeof normalizerInputSchema>;
export type NormalizerOutput = z.infer<typeof normalizerOutputSchema>;
export type SegmenterInput = z.infer<typeof segmenterInputSchema>;
export type SegmenterOutput = z.infer<typeof segmenterOutputSchema>;
export type InterpretInput = z.infer<typeof interpretInputSchema>;
export type InterpretOutput = z.infer<typeof interpretOutputSchema>;
export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type ScoreOutput = z.infer<typeof scoreOutputSchema>;
export type ResolveInput = z.infer<typeof resolveInputSchema>;
export type ResolveOutput = z.infer<typeof resolveOutputSchema>;
export type RouteInput = z.infer<typeof routeInputSchema>;
export type RouteOutput = z.infer<typeof routeOutputSchema>;
export type ClarifierInput = z.infer<typeof clarifierInputSchema>;
export type ClarifierOutput = z.infer<typeof clarifierOutputSchema>;
export type AnswerClarificationInput = z.infer<
  typeof answerClarificationInputSchema
>;
export type AnswerClarificationOutput = z.infer<
  typeof answerClarificationOutputSchema
>;
export type PromoteInput = z.infer<typeof promoteInputSchema>;
export type PromoteOutput = z.infer<typeof promoteOutputSchema>;
export type ParkInput = z.infer<typeof parkInputSchema>;
export type ParkOutput = z.infer<typeof parkOutputSchema>;
export type DiscardInput = z.infer<typeof discardInputSchema>;
export type DiscardOutput = z.infer<typeof discardOutputSchema>;
export type EmitStatusInput = z.infer<typeof emitStatusInputSchema>;
export type EmitStatusOutput = z.infer<typeof emitStatusOutputSchema>;
