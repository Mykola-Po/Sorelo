import type {
  CanonicalMutationType,
  EntityOriginType,
  InboxFragmentSourceKind,
  LineageEntityType,
  LineageTransitionType,
  MapVersionTriggerType,
  ScenarioRunFeedbackVerdict,
  ScenarioStepFeedbackVerdict,
  SourceFragmentType,
  SuggestionApplyStatus,
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
  inboxItemId: string | null;
  inboxPacketId: string | null;
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
  inboxItemId: string | null;
  inboxPacketId: string | null;
  sourceFragmentId: string | null;
  artifactOrder: number;
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
  applyStatus: SuggestionApplyStatus;
  appliedAt: Date | null;
  applyOutcome: Record<string, unknown>;
  applyError: string | null;
  reasonText: string | null;
  latencyMs: number | null;
  resolvedAt: Date;
};

export type SuggestionWithResolution = {
  suggestion: SuggestionRecord;
  resolution: SuggestionResolutionRecord | null;
};

export type SuggestionFeedRecord = {
  batch: SuggestionBatchRecord;
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
  causedByResolutionId: string | null;
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

export type CanonicalMutationProvenanceRecord = {
  id: string;
  workspaceId: string;
  mapId: string;
  mapVersionId: string;
  entityType: LineageEntityType;
  entityId: string;
  mutationType: CanonicalMutationType;
  originSuggestionId: string;
  reviewResolutionId: string;
  inboxItemId: string;
  inboxPacketId: string | null;
  appliedByUserId: string | null;
  createdAt: Date;
};

export type CanonicalMutationEvidenceRecord = {
  id: string;
  provenanceId: string;
  inboxFragmentId: string;
  clarificationAnswerId: string | null;
  evidenceOrder: number;
  fragmentOrdinal: number;
};

export type CanonicalMutationEvidenceDetail = {
  id: string;
  inboxFragmentId: string;
  clarificationAnswerId: string | null;
  evidenceOrder: number;
  fragmentOrdinal: number;
  fragmentText: string;
  sourceKind: InboxFragmentSourceKind;
  clarificationAnswerText: string | null;
};

export type CanonicalMutationProvenanceDetail = {
  id: string;
  mapVersionId: string;
  entityType: "concept" | "link" | "scenario";
  entityId: string;
  mutationType: CanonicalMutationType;
  createdAt: Date;
  suggestion: SuggestionRecord;
  resolution: SuggestionResolutionRecord;
  inboxItem: {
    id: string;
    rawText: string;
    status: string;
    createdAt: Date;
  };
  evidence: CanonicalMutationEvidenceDetail[];
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
