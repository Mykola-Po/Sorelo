import { z } from "zod";

export const sourceFragmentTypeSchema = z.enum([
  "manual_note",
  "import",
  "chat",
  "scenario_prompt",
  "observation",
]);

export const suggestionBatchTypeSchema = z.enum([
  "extract",
  "link",
  "retype",
  "scenario_seed",
  "scenario_eval",
]);

export const suggestionBatchStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

export const suggestionTypeSchema = z.enum([
  "create_concept",
  "update_concept",
  "create_link",
  "update_link",
  "create_scenario_seed",
  "scenario_hypothesis",
]);

export const suggestionTargetEntityTypeSchema = z.enum([
  "concept",
  "link",
  "scenario",
  "map",
  "none",
]);

export const suggestionResolutionTypeSchema = z.enum([
  "accepted",
  "rejected",
  "edited",
  "split",
  "merged",
  "retyped",
  "relinked",
  "confidence_changed",
  "context_limited",
]);

export const entityOriginTypeSchema = z.enum([
  "manual",
  "ai_suggested",
  "imported",
]);

const uuidSchema = z.string().uuid();
const nullableUuidSchema = uuidSchema.nullable().optional();
const recordSchema = z.record(z.string(), z.unknown());

export const sourceFragmentInputSchema = z.object({
  workspaceId: uuidSchema,
  mapId: nullableUuidSchema,
  authorUserId: nullableUuidSchema,
  sourceType: sourceFragmentTypeSchema,
  rawText: z.string().trim().min(1).max(20000),
  normalizedText: z.string().trim().min(1).max(20000).optional().nullable(),
  metadata: recordSchema.optional(),
});

export const suggestionBatchInputSchema = z.object({
  workspaceId: uuidSchema,
  mapId: nullableUuidSchema,
  initiatedByUserId: nullableUuidSchema,
  batchType: suggestionBatchTypeSchema,
  modelName: z.string().trim().min(1).max(160),
  modelVersion: z.string().trim().min(1).max(64),
  promptVersion: z.string().trim().min(1).max(64),
  inputHash: z.string().trim().min(8).max(128),
  status: suggestionBatchStatusSchema.optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional().nullable(),
  metadata: recordSchema.optional(),
});

export const suggestionInputSchema = z
  .object({
    batchId: uuidSchema,
    workspaceId: uuidSchema,
    mapId: nullableUuidSchema,
    sourceFragmentId: nullableUuidSchema,
    suggestionType: suggestionTypeSchema,
    targetEntityType: suggestionTargetEntityTypeSchema,
    targetEntityId: nullableUuidSchema,
    proposedPayload: recordSchema.optional(),
    rationale: z.string().trim().max(8000).optional().nullable(),
    confidence: z.number().min(0).max(1).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.targetEntityType === "none" && value.targetEntityId) {
      ctx.addIssue({
        code: "custom",
        path: ["targetEntityId"],
        message: "targetEntityId must be empty when targetEntityType is none.",
      });
    }
  });

export const createSuggestionsInputSchema = z.object({
  suggestions: z.array(suggestionInputSchema).min(1),
});

export const suggestionResolutionInputSchema = z.object({
  suggestionId: uuidSchema,
  workspaceId: uuidSchema,
  mapId: nullableUuidSchema,
  actorUserId: uuidSchema,
  resolutionType: suggestionResolutionTypeSchema,
  beforePayload: recordSchema.optional(),
  afterPayload: recordSchema.optional(),
  reasonText: z.string().trim().max(4000).optional().nullable(),
  latencyMs: z.coerce.number().int().min(0).optional().nullable(),
  resolvedAt: z.coerce.date().optional(),
});

export const attachSuggestionOriginInputSchema = z
  .object({
    workspaceId: uuidSchema,
    mapId: nullableUuidSchema,
    entityType: z.enum(["concept", "link", "scenario"]),
    entityId: uuidSchema,
    originType: entityOriginTypeSchema,
    originSuggestionId: nullableUuidSchema,
  })
  .superRefine((value, ctx) => {
    if (value.originType === "ai_suggested" && !value.originSuggestionId) {
      ctx.addIssue({
        code: "custom",
        path: ["originSuggestionId"],
        message: "originSuggestionId is required for ai_suggested entities.",
      });
    }
  });

export type SourceFragmentInput = z.infer<typeof sourceFragmentInputSchema>;
export type SuggestionBatchInput = z.infer<typeof suggestionBatchInputSchema>;
export type SuggestionInput = z.infer<typeof suggestionInputSchema>;
export type SuggestionResolutionInput = z.infer<
  typeof suggestionResolutionInputSchema
>;
export type AttachSuggestionOriginInput = z.infer<
  typeof attachSuggestionOriginInputSchema
>;
