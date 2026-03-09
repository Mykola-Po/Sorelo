import type { RelationType } from "@/shared/db/schema";

export type GuidedOnboardingStep =
  | "no_concepts"
  | "one_concept_no_link"
  | "multiple_concepts_no_link"
  | "has_links_no_run"
  | "done";

export type CanvasInteractionMode = "inspect" | "placeConcept" | "connectLink";
export type PanelVisibilityState = "expanded" | "collapsed";
export type PanelVisibilityIntent =
  | "toggle"
  | "open-panel"
  | "open-selection"
  | "open-settings";

export type GuidedOnboardingCopy = {
  step: GuidedOnboardingStep;
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  actionLabel: string | null;
};

export type LinkDraftDefaults = {
  relationType: RelationType;
  strength: number;
};

export const MAP_PANEL_VISIBILITY_STORAGE_KEY = "sorelo-map-panel-visibility";

export function deriveGuidedOnboardingStep(input: {
  conceptCount: number;
  linkCount: number;
  scenarioRunCount: number;
}): GuidedOnboardingStep {
  if (input.conceptCount === 0) {
    return "no_concepts";
  }

  if (input.conceptCount === 1 && input.linkCount === 0) {
    return "one_concept_no_link";
  }

  if (input.linkCount === 0) {
    return "multiple_concepts_no_link";
  }

  if (input.scenarioRunCount === 0) {
    return "has_links_no_run";
  }

  return "done";
}

export function getGuidedOnboardingCopy(
  step: GuidedOnboardingStep
): GuidedOnboardingCopy {
  switch (step) {
    case "no_concepts":
      return {
        step,
        stepNumber: 1,
        totalSteps: 4,
        title: "Place the first Concept",
        description:
          "Start the map with one meaningful factor that helps explain the person.",
        actionLabel: "New Concept",
      };
    case "one_concept_no_link":
      return {
        step,
        stepNumber: 2,
        totalSteps: 4,
        title: "Add a second Concept",
        description:
          "A Link needs at least two Concepts, so add one more meaningful factor.",
        actionLabel: "New Concept",
      };
    case "multiple_concepts_no_link":
      return {
        step,
        stepNumber: 3,
        totalSteps: 4,
        title: "Connect the first Link",
        description:
          "Show how one Concept influences another so the map becomes explainable.",
        actionLabel: "Create Link",
      };
    case "has_links_no_run":
      return {
        step,
        stepNumber: 4,
        totalSteps: 4,
        title: "Run the first Scenario",
        description:
          "Test the map against a concrete situation and inspect the explanation path.",
        actionLabel: "Run Scenario",
      };
    case "done":
      return {
        step,
        stepNumber: 4,
        totalSteps: 4,
        title: "Keep refining the map",
        description:
          "Select any Concept or Link to tighten definitions, add structure, and compare Scenarios.",
        actionLabel: null,
      };
  }
}

export function getDefaultConceptPosition(conceptCount: number) {
  return {
    x: 96 + (conceptCount % 4) * 220,
    y: 96 + Math.floor(conceptCount / 4) * 150,
  };
}

export function buildLinkDraftDefaults(): LinkDraftDefaults {
  return {
    relationType: "causes",
    strength: 3,
  };
}

export function parseStoredPanelVisibilityState(
  value: string | null | undefined
): PanelVisibilityState {
  return value === "collapsed" ? "collapsed" : "expanded";
}

export function getNextPanelVisibilityState(
  current: PanelVisibilityState,
  intent: PanelVisibilityIntent
): PanelVisibilityState {
  if (intent === "toggle") {
    return current === "expanded" ? "collapsed" : "expanded";
  }

  return "expanded";
}
