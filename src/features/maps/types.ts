import type {
  ConceptType,
  RelationType,
  ScenarioRunStatus,
  WorkspaceRole,
} from "@/shared/db/schema";

export type MapSummary = {
  id: string;
  title: string;
  slug: string;
  subjectLabel: string;
  description: string | null;
  updatedAt: Date;
};

export type MapDetail = {
  id: string;
  title: string;
  slug: string;
  subjectLabel: string;
  description: string | null;
  updatedAt: Date;
  workspace: {
    id: string;
    slug: string;
    name: string;
  };
};

export type ConceptSummary = {
  id: string;
  title: string;
  conceptType: ConceptType;
  summary: string | null;
  description: string | null;
  x: number;
  y: number;
  createdByUserId: string;
  updatedAt: Date;
};

export type LinkSummary = {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationType: RelationType;
  strength: number;
  description: string | null;
  updatedAt: Date;
};

export type ScenarioSummary = {
  id: string;
  title: string;
  situation: string;
  seedConceptIds: string[];
  updatedAt: Date;
};

export type ScenarioRunStepSummary = {
  id: string;
  scenarioRunId: string;
  stepOrder: number;
  conceptId: string;
  viaLinkId: string | null;
  effectType: string;
  explanation: string;
  score: number;
};

export type ScenarioRunSummary = {
  id: string;
  scenarioId: string | null;
  triggerText: string;
  status: ScenarioRunStatus;
  summary: string | null;
  createdAt: Date;
  starter: {
    id: string;
    fullName: string | null;
    email: string;
  };
  scenario:
    | {
        id: string;
        title: string;
      }
    | null;
  steps: ScenarioRunStepSummary[];
};

export type MapWorkspaceProps = {
  workspaceSlug: string;
  workspaceRole: WorkspaceRole;
  map: MapDetail;
  availableMaps: MapSummary[];
  concepts: ConceptSummary[];
  links: LinkSummary[];
  scenarios: ScenarioSummary[];
  runs: ScenarioRunSummary[];
};
