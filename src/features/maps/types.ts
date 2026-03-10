import type {
  ConceptType,
  RelationType,
  WorkspaceRole,
} from "@/shared/db/schema";
import type { SupportedLocale } from "@/shared/i18n/config";
import type {
  ConceptCatalogEntry,
  GraphCounts,
  GraphConceptNode,
  GraphLinkEdge,
  ScenarioPanelSummary,
  ScenarioRunPanelSummary,
} from "@/features/map-runtime/types";

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
  graphRevision: number;
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

export type GraphMetrics = GraphCounts & {
  revision: number;
};

export type ScenarioSummary = ScenarioPanelSummary;
export type ScenarioRunSummary = ScenarioRunPanelSummary;
export type GraphConceptSummary = GraphConceptNode;
export type GraphLinkSummary = GraphLinkEdge;
export type MapConceptCatalogEntry = ConceptCatalogEntry;

export type MapWorkspaceProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  workspaceRole: WorkspaceRole;
  map: MapDetail;
  availableMaps: MapSummary[];
  graphMetrics: GraphMetrics;
  scenarios: ScenarioSummary[];
  runs: ScenarioRunSummary[];
};
