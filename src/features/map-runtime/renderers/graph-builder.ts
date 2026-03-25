import Graph from "graphology";
import type { Attributes } from "graphology-types";
import type { GraphConceptNode, GraphLinkEdge, GraphSnapshot } from "@/features/map-runtime/types";

export type SigmaNodePayload = Attributes & {
  x: number;
  y: number;
  label: string;
  size: number;
  color: string;
  accentColor: string;
  conceptType: GraphConceptNode["conceptType"];
  summary: string | null;
  description: string | null;
  selected?: boolean;
  isGhost?: boolean;
};

export type SigmaEdgePayload = Attributes & {
  type: string;
  label: string;
  size: number;
  color: string;
  relationType: GraphLinkEdge["relationType"];
};

export function buildGraphologyInstance(
  snapshot: GraphSnapshot,
  positions?: Record<string, { x: number; y: number }>,
  ghosts: GraphConceptNode[] = []
): Graph {
  const graph = new Graph({ multi: true });

  const getColorForConceptType = (type: GraphConceptNode["conceptType"]): string => {
    switch (type) {
      case "fact":
        return "#3e63dd"; // Radix blue-9
      case "experience":
        return "#b33eab"; // Radix plum-9
      case "belief":
        return "#8e4ec6"; // Radix purple-9
      case "state":
        return "#e54d2e"; // Radix tomato-9
      case "trigger":
        return "#e93d82"; // Radix crimson-9
      case "thought":
        return "#297c3b"; // Radix green-9
      case "custom":
      default:
        return "#868e96"; // Radix gray-8
    }
  };

  const getColorForRelationType = (type: GraphLinkEdge["relationType"]): string => {
    switch (type) {
      case "causes":
        return "#e54d2e"; // tomato-9
      case "strengthens":
        return "#297c3b"; // green-9
      case "weakens":
        return "#db4315"; // orange-9
      case "contradicts":
        return "#e93d82"; // crimson-9
      case "explains":
        return "#3e63dd"; // blue-9
      default:
        return "#868e96"; // gray-8
    }
  };

  for (const concept of snapshot.concepts) {
    const position = positions?.[concept.id] ?? { x: concept.x, y: concept.y };
    const accentColor = getColorForConceptType(concept.conceptType);

    graph.addNode(concept.id, {
      x: position.x,
      y: position.y,
      size: 18,
      label: concept.title,
      color: accentColor,
      accentColor,
      conceptType: concept.conceptType,
      summary: concept.summary,
      description: concept.description,
    } satisfies SigmaNodePayload);
  }

  for (const ghost of ghosts) {
    const position = positions?.[ghost.id] ?? { x: ghost.x, y: ghost.y };
    const accentColor = "#868e96"; // gray-8

    if (!graph.hasNode(ghost.id)) {
      graph.addNode(ghost.id, {
        x: position.x,
        y: position.y,
        size: 16,
        label: ghost.title + " (Ghost)",
        color: "rgba(134, 142, 150, 0.3)",
        accentColor,
        conceptType: ghost.conceptType,
        summary: ghost.summary,
        description: ghost.description,
        isGhost: true,
      } satisfies SigmaNodePayload);
    }
  }

  for (const link of snapshot.links) {
    if (!graph.hasNode(link.sourceConceptId) || !graph.hasNode(link.targetConceptId)) {
      continue;
    }

    graph.addEdgeWithKey(link.id, link.sourceConceptId, link.targetConceptId, {
      type: "arrow",
      size: 2,
      label: link.relationType,
      color: getColorForRelationType(link.relationType),
      relationType: link.relationType,
    } satisfies SigmaEdgePayload);
  }

  return graph;
}
