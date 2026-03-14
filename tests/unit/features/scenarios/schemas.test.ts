import { describe, expect, it } from "vitest";

import {
  submitScenarioRunFeedbackSchema,
  submitScenarioStepFeedbackSchema,
} from "@/features/scenarios/schemas";

describe("scenario feedback schemas", () => {
  it("parses valid run feedback", () => {
    const parsed = submitScenarioRunFeedbackSchema.parse({
      workspaceSlug: "team-alpha",
      mapId: "11111111-1111-4111-8111-111111111111",
      scenarioRunId: "22222222-2222-4222-8222-222222222222",
      overallScore: "4",
      verdict: "useful",
      feedbackText: "Useful chain and clear trigger anchors.",
    });

    expect(parsed.overallScore).toBe(4);
    expect(parsed.verdict).toBe("useful");
  });

  it("rejects run score outside 1..5", () => {
    expect(() =>
      submitScenarioRunFeedbackSchema.parse({
        workspaceSlug: "team-alpha",
        mapId: "11111111-1111-4111-8111-111111111111",
        scenarioRunId: "22222222-2222-4222-8222-222222222222",
        overallScore: 8,
        verdict: "useful",
      })
    ).toThrow();
  });

  it("parses valid step feedback", () => {
    const parsed = submitScenarioStepFeedbackSchema.parse({
      workspaceSlug: "team-alpha",
      mapId: "11111111-1111-4111-8111-111111111111",
      scenarioRunId: "22222222-2222-4222-8222-222222222222",
      scenarioRunStepId: "33333333-3333-4333-8333-333333333333",
      verdict: "missing_context",
      correctedScore: "72",
      correctedExplanation: "Context suggests slower escalation.",
    });

    expect(parsed.correctedScore).toBe(72);
    expect(parsed.verdict).toBe("missing_context");
  });

  it("rejects corrected step score outside 1..100", () => {
    expect(() =>
      submitScenarioStepFeedbackSchema.parse({
        workspaceSlug: "team-alpha",
        mapId: "11111111-1111-4111-8111-111111111111",
        scenarioRunId: "22222222-2222-4222-8222-222222222222",
        scenarioRunStepId: "33333333-3333-4333-8333-333333333333",
        verdict: "wrong_effect",
        correctedScore: 101,
      })
    ).toThrow();
  });
});
