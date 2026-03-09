import type {
  learningSourceFragments,
  learningSuggestionBatches,
  learningSuggestionResolutions,
  learningSuggestions,
} from "@/shared/db/schema";
import type {
  SourceFragmentRecord,
  SuggestionBatchRecord,
  SuggestionRecord,
  SuggestionResolutionRecord,
} from "@/features/learning/types";

export function mapSourceFragmentRecord(
  row: typeof learningSourceFragments.$inferSelect
): SourceFragmentRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    mapId: row.mapId,
    authorUserId: row.authorUserId,
    sourceType: row.sourceType,
    rawText: row.rawText,
    normalizedText: row.normalizedText,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export function mapSuggestionBatchRecord(
  row: typeof learningSuggestionBatches.$inferSelect
): SuggestionBatchRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    mapId: row.mapId,
    initiatedByUserId: row.initiatedByUserId,
    batchType: row.batchType,
    modelName: row.modelName,
    modelVersion: row.modelVersion,
    promptVersion: row.promptVersion,
    inputHash: row.inputHash,
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    metadata: row.metadata,
  };
}

export function mapSuggestionRecord(
  row: typeof learningSuggestions.$inferSelect
): SuggestionRecord {
  return {
    id: row.id,
    batchId: row.batchId,
    workspaceId: row.workspaceId,
    mapId: row.mapId,
    sourceFragmentId: row.sourceFragmentId,
    suggestionType: row.suggestionType,
    targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId,
    proposedPayload: row.proposedPayload,
    rationale: row.rationale,
    confidence: row.confidence,
    createdAt: row.createdAt,
  };
}

export function mapSuggestionResolutionRecord(
  row: typeof learningSuggestionResolutions.$inferSelect
): SuggestionResolutionRecord {
  return {
    id: row.id,
    suggestionId: row.suggestionId,
    workspaceId: row.workspaceId,
    mapId: row.mapId,
    actorUserId: row.actorUserId,
    resolutionType: row.resolutionType,
    beforePayload: row.beforePayload,
    afterPayload: row.afterPayload,
    reasonText: row.reasonText,
    latencyMs: row.latencyMs,
    resolvedAt: row.resolvedAt,
  };
}
