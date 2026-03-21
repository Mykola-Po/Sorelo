import type {
  ConceptType,
  RelationType,
  ScenarioRunFeedbackVerdict,
  ScenarioRunStatus,
  ScenarioStepFeedbackVerdict,
} from "@/shared/db/schema";

export type GraphViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  overscan: number;
};

export type GraphCounts = {
  conceptCount: number;
  linkCount: number;
};

export type GraphConceptNode = {
  id: string;
  title: string;
  conceptType: ConceptType;
  summary: string | null;
  description: string | null;
  x: number;
  y: number;
  updatedAt: string;
  isGhost?: boolean;
};

export type GraphLinkEdge = {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationType: RelationType;
  strength: number;
  description: string | null;
  updatedAt: string;
};

export type GraphSnapshot = {
  revision: number;
  counts: GraphCounts;
  concepts: GraphConceptNode[];
  links: GraphLinkEdge[];
};

export type GraphPatch = {
  revision: number;
  addedConcepts: GraphConceptNode[];
  updatedConcepts: GraphConceptNode[];
  removedConceptIds: string[];
  addedLinks: GraphLinkEdge[];
  updatedLinks: GraphLinkEdge[];
  removedLinkIds: string[];
};

export type ConceptCatalogEntry = {
  id: string;
  title: string;
};

export type InspectorRelatedLink = {
  id: string;
  relationType: RelationType;
  strength: number;
  relatedConceptId: string;
  relatedConceptTitle: string;
};

export type ScenarioSeedSummary = {
  id: string;
  title: string;
};

export type ScenarioPanelSummary = {
  id: string;
  title: string;
  situation: string;
  seedConcepts: ScenarioSeedSummary[];
  updatedAt: string;
};

export type ScenarioRunStepPanelSummary = {
  id: string;
  scenarioRunId: string;
  stepOrder: number;
  conceptId: string;
  conceptTitle: string;
  viaLinkId: string | null;
  viaLinkRelationType: RelationType | null;
  effectType: string;
  explanation: string;
  score: number;
  feedback: {
    id: string;
    verdict: ScenarioStepFeedbackVerdict;
    correctedExplanation: string | null;
    correctedScore: number | null;
    createdAt: string;
  } | null;
};

export type ScenarioRunPanelSummary = {
  id: string;
  scenarioId: string | null;
  triggerText: string;
  status: ScenarioRunStatus;
  summary: string | null;
  createdAt: string;
  starter: {
    id: string;
    fullName: string | null;
    email: string;
  };
  scenario: {
    id: string;
    title: string;
  } | null;
  feedback: {
    id: string;
    overallScore: number;
    verdict: ScenarioRunFeedbackVerdict;
    feedbackText: string | null;
    createdAt: string;
  } | null;
  steps: ScenarioRunStepPanelSummary[];
};
