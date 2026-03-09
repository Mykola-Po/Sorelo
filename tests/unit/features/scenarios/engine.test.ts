import { describe, expect, it } from "vitest";

import { runRuleBasedScenario } from "@/features/scenarios/engine";

describe("runRuleBasedScenario", () => {
  const concepts = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Fear of criticism",
      summary: "Activated when public disagreement feels unsafe.",
      description: null,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      title: "Defensive reaction",
      summary: "Moves quickly to self-protection.",
      description: null,
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      title: "Withdrawal",
      summary: "Distance increases after the person feels exposed.",
      description: null,
    },
  ];

  const fear = concepts[0]!;
  const defensive = concepts[1]!;
  const withdrawal = concepts[2]!;

  const links = [
    {
      id: "aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      sourceConceptId: fear.id,
      targetConceptId: defensive.id,
      relationType: "causes" as const,
      strength: 5,
    },
    {
      id: "aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
      sourceConceptId: defensive.id,
      targetConceptId: withdrawal.id,
      relationType: "strengthens" as const,
      strength: 3,
    },
  ];
  const firstLink = links[0]!;

  it("walks the map deterministically from explicit seed Concepts", () => {
    const result = runRuleBasedScenario({
      triggerText: "A colleague challenges the person in public.",
      concepts,
      links,
      seedConceptIds: [fear.id],
    });

    expect(result.seedConceptIds).toEqual([fear.id]);
    expect(result.steps.map((step) => step.conceptId)).toEqual([
      fear.id,
      defensive.id,
      withdrawal.id,
    ]);
    expect(result.steps[1]?.viaLinkId).toBe(firstLink.id);
    expect(result.summary).toContain("Fear of criticism");
    expect(result.summary).toContain("Defensive reaction");
  });

  it("resolves seed Concepts from trigger text when none are provided", () => {
    const result = runRuleBasedScenario({
      triggerText: "Criticism in public makes the person feel exposed.",
      concepts,
      links,
    });

    expect(result.seedConceptIds).toContain(fear.id);
    expect(result.steps[0]?.effectType).toBe("seed");
  });

  it("fails when the situation cannot be anchored to any Concept", () => {
    expect(() =>
      runRuleBasedScenario({
        triggerText: "Completely unrelated wording",
        concepts,
        links,
      })
    ).toThrow("No Concept matched the scenario");
  });
});
