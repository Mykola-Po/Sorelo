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

export type InspectorProvenancePayload = {
  id: string;
  mapVersionId: string;
  mutationType: "create_concept" | "update_concept" | "create_link";
  createdAt: string;
  suggestion: {
    id: string;
    suggestionType: string;
    rationale: string | null;
    confidence: number | null;
    artifactOrder: number;
  };
  resolution: {
    id: string;
    resolutionType: string;
    applyStatus: string;
    reasonText: string | null;
    resolvedAt: string;
    appliedAt: string | null;
  };
  inboxItem: {
    id: string;
    rawText: string;
    status: string;
    createdAt: string;
  };
  evidence: Array<{
    id: string;
    inboxFragmentId: string;
    clarificationAnswerId: string | null;
    evidenceOrder: number;
    fragmentOrdinal: number;
    fragmentText: string;
    sourceKind: "item_raw" | "clarification_answer";
    clarificationAnswerText: string | null;
  }>;
};

export type InspectorConceptPayload = {
  kind: "concept";
  concept: {
    id: string;
    title: string;
    contentRevision: number;
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
  provenance: InspectorProvenancePayload | null;
};

export type InspectorLinkPayload = {
  kind: "link";
  link: {
    id: string;
    contentRevision: number;
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
  provenance: InspectorProvenancePayload | null;
};

export type InspectorPayload = InspectorConceptPayload | InspectorLinkPayload;

export type InspectorMutationFeedback = {
  kind: "concept" | "link";
  id: string;
  eventId: string;
  message: string;
};
