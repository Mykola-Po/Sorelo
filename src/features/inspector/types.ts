export type InspectorSelection =
  | { kind: "none" }
  | { kind: "concept"; id: string }
  | { kind: "link"; id: string }
  | { kind: "map-settings" }
  | { kind: "create-concept"; x?: number; y?: number }
  | {
      kind: "create-link";
      sourceConceptId?: string;
      targetConceptId?: string;
      relationType?: "causes" | "strengthens" | "weakens" | "explains" | "contradicts";
      strength?: number;
    };

export type InspectorConceptPayload = {
  kind: "concept";
  concept: {
    id: string;
    title: string;
    conceptType:
      | "thought"
      | "state"
      | "belief"
      | "experience"
      | "fact"
      | "trigger"
      | "custom";
    summary: string | null;
    description: string | null;
    x: number;
    y: number;
  };
  incoming: Array<{
    id: string;
    relationType:
      | "causes"
      | "strengthens"
      | "weakens"
      | "explains"
      | "contradicts";
    strength: number;
    relatedConceptId: string;
    relatedConceptTitle: string;
  }>;
  outgoing: Array<{
    id: string;
    relationType:
      | "causes"
      | "strengthens"
      | "weakens"
      | "explains"
      | "contradicts";
    strength: number;
    relatedConceptId: string;
    relatedConceptTitle: string;
  }>;
};

export type InspectorLinkPayload = {
  kind: "link";
  link: {
    id: string;
    sourceConceptId: string;
    targetConceptId: string;
    relationType:
      | "causes"
      | "strengthens"
      | "weakens"
      | "explains"
      | "contradicts";
    strength: number;
    description: string | null;
  };
};

export type InspectorPayload = InspectorConceptPayload | InspectorLinkPayload;
