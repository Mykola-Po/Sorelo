import type {
  EntityOriginType,
  LineageEntityType,
  LineageTransitionType,
  MapVersionTriggerType,
  ScenarioRunFeedbackVerdict,
  ScenarioStepFeedbackVerdict,
  SourceFragmentType,
  SuggestionBatchStatus,
  SuggestionBatchType,
  SuggestionResolutionType,
  SuggestionTargetEntityType,
  SuggestionType,
} from "@/shared/db/schema";

export type SourceFragmentRecord = {
  id: string;
  workspaceId: string;
  mapId: string | null;
  authorUserId: string | null;
  sourceType: SourceFragmentType;
  rawText: string;
  normalizedText: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type SuggestionBatchRecord = {
  id: string;
  workspaceId: string;
  mapId: string | null;
  initiatedByUserId: string | null;
  batchType: SuggestionBatchType;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  inputHash: string;
  status: SuggestionBatchStatus;
  startedAt: Date;
  finishedAt: Date | null;
  metadata: Record<string, unknown>;
};

export type SuggestionRecord = {
  id: string;
  batchId: string;
  workspaceId: string;
  mapId: string | null;
  sourceFragmentId: string | null;
  suggestionType: SuggestionType;
  targetEntityType: SuggestionTargetEntityType;
  targetEntityId: string | null;
  proposedPayload: Record<string, unknown>;
  rationale: string | null;
  confidence: number | null;
  createdAt: Date;
};

export type SuggestionResolutionRecord = {
  id: string;
  suggestionId: string;
  workspaceId: string;
  mapId: string | null;
  actorUserId: string;
  resolutionType: SuggestionResolutionType;
  beforePayload: Record<string, unknown>;
  afterPayload: Record<string, unknown>;
  reasonText: string | null;
  latencyMs: number | null;
  resolvedAt: Date;
};

export type SuggestionWithResolution = {
  suggestion: SuggestionRecord;
  resolution: SuggestionResolutionRecord | null;
};

export type SuggestionFeedRecord = {
  suggestion: SuggestionRecord;
  resolution: SuggestionResolutionRecord | null;
  sourceFragment: SourceFragmentRecord | null;
};

export type AttachSuggestionOriginResult = {
  entityType: "concept" | "link" | "scenario";
  entityId: string;
  originType: EntityOriginType;
  originSuggestionId: string | null;
};

export type MapVersionRecord = {
  id: string;
  workspaceId: string;
  mapId: string;
  versionNo: number;
  triggerType: MapVersionTriggerType;
  actorUserId: string | null;
  snapshotJson: Record<string, unknown>;
  diffJson: Record<string, unknown>;
  createdAt: Date;
};

export type EntityLineageRecord = {
  id: string;
  workspaceId: string;
  mapId: string;
  entityType: LineageEntityType;
  fromEntityId: string | null;
  toEntityId: string | null;
  transitionType: LineageTransitionType;
  causedByResolutionId: string | null;
  createdAt: Date;
};

export type ScenarioRunFeedbackRecord = {
  id: string;
  scenarioRunId: string;
  workspaceId: string;
  mapId: string;
  reviewerUserId: string;
  overallScore: number;
  verdict: ScenarioRunFeedbackVerdict;
  feedbackText: string | null;
  createdAt: Date;
};

export type ScenarioStepFeedbackRecord = {
  id: string;
  scenarioRunStepId: string;
  scenarioRunId: string;
  verdict: ScenarioStepFeedbackVerdict;
  correctedExplanation: string | null;
  correctedScore: number | null;
  reviewerUserId: string;
  createdAt: Date;
};
