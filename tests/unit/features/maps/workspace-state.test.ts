import { describe, expect, it } from "vitest";

import {
  buildLinkDraftDefaults,
  deriveGuidedOnboardingStep,
  getDefaultConceptPosition,
  getGuidedOnboardingCopy,
  isPreFirstLinkGuidedStep,
} from "@/features/maps/workspace-state";

describe("workspace state helpers", () => {
  it("derives onboarding states from map counts", () => {
    expect(
      deriveGuidedOnboardingStep({
        conceptCount: 0,
        linkCount: 0,
        scenarioRunCount: 0,
      })
    ).toBe("no_concepts");

    expect(
      deriveGuidedOnboardingStep({
        conceptCount: 1,
        linkCount: 0,
        scenarioRunCount: 0,
      })
    ).toBe("one_concept_no_link");

    expect(
      deriveGuidedOnboardingStep({
        conceptCount: 2,
        linkCount: 0,
        scenarioRunCount: 0,
      })
    ).toBe("multiple_concepts_no_link");

    expect(
      deriveGuidedOnboardingStep({
        conceptCount: 2,
        linkCount: 1,
        scenarioRunCount: 0,
      })
    ).toBe("has_links_no_run");

    expect(
      deriveGuidedOnboardingStep({
        conceptCount: 2,
        linkCount: 1,
        scenarioRunCount: 1,
      })
    ).toBe("done");
  });

  it("returns onboarding copy with step metadata", () => {
    const copy = getGuidedOnboardingCopy("multiple_concepts_no_link");

    expect(copy.stepNumber).toBe(3);
    expect(copy.actionLabel).toBe("Create Link");
  });

  it("produces deterministic concept placement defaults", () => {
    expect(getDefaultConceptPosition(0)).toEqual({ x: 96, y: 96 });
    expect(getDefaultConceptPosition(5)).toEqual({ x: 316, y: 246 });
  });

  it("uses stable link draft defaults", () => {
    expect(buildLinkDraftDefaults()).toEqual({
      relationType: "causes",
      strength: 3,
    });
  });

  it("marks pre-link steps for drop-off telemetry", () => {
    expect(isPreFirstLinkGuidedStep("one_concept_no_link")).toBe(true);
    expect(isPreFirstLinkGuidedStep("multiple_concepts_no_link")).toBe(true);
    expect(isPreFirstLinkGuidedStep("no_concepts")).toBe(false);
    expect(isPreFirstLinkGuidedStep("has_links_no_run")).toBe(false);
  });
});
