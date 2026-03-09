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
