import type { RelationType } from "@/shared/db/schema";

type EngineConcept = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
};

type EngineLink = {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationType: RelationType;
  strength: number;
};

type ScenarioEngineInput = {
  triggerText: string;
  concepts: EngineConcept[];
  links: EngineLink[];
  seedConceptIds?: string[];
};

type ScenarioStep = {
  conceptId: string;
  viaLinkId: string | null;
  effectType: string;
  explanation: string;
  score: number;
};

const relationWeight: Record<RelationType, number> = {
  causes: 5,
  strengthens: 4,
  explains: 3,
  weakens: 2,
  contradicts: 1,
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9а-яіїєґ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function resolveSeedConceptIds(input: ScenarioEngineInput) {
  if (input.seedConceptIds && input.seedConceptIds.length > 0) {
    return input.seedConceptIds.filter((seedId) =>
      input.concepts.some((concept) => concept.id === seedId)
    );
  }

  const tokens = tokenize(input.triggerText);
  if (tokens.length === 0) {
    return [];
  }

  return input.concepts
    .map((concept) => {
      const haystack = `${concept.title} ${concept.summary ?? ""} ${concept.description ?? ""}`.toLowerCase();
      const score = tokens.reduce(
        (total, token) => (haystack.includes(token) ? total + 1 : total),
        0
      );

      return {
        id: concept.id,
        score,
        title: concept.title,
      };
    })
    .filter((concept) => concept.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, 3)
    .map((concept) => concept.id);
}

export function runRuleBasedScenario(input: ScenarioEngineInput) {
  const conceptById = new Map(input.concepts.map((concept) => [concept.id, concept]));
  const outgoing = new Map<string, EngineLink[]>();

  for (const link of input.links) {
    const bucket = outgoing.get(link.sourceConceptId) ?? [];
    bucket.push(link);
    outgoing.set(link.sourceConceptId, bucket);
  }

  for (const bucket of outgoing.values()) {
    bucket.sort((left, right) => {
      if (right.strength !== left.strength) {
        return right.strength - left.strength;
      }

      if (left.relationType !== right.relationType) {
        return left.relationType.localeCompare(right.relationType);
      }

      const leftTarget = conceptById.get(left.targetConceptId)?.title ?? "";
      const rightTarget = conceptById.get(right.targetConceptId)?.title ?? "";
      return leftTarget.localeCompare(rightTarget);
    });
  }

  const seeds = resolveSeedConceptIds(input);
  if (seeds.length === 0) {
    throw new Error(
      "No Concept matched the scenario. Choose one or more seed Concepts."
    );
  }

  const queue: Array<{
    conceptId: string;
    viaLinkId: string | null;
    effectType: string;
    explanation: string;
    score: number;
  }> = seeds.map((seedId, index) => {
    const concept = conceptById.get(seedId);
    if (!concept) {
      throw new Error("Scenario seed Concept is missing.");
    }

    return {
      conceptId: seedId,
      viaLinkId: null,
      effectType: "seed",
      explanation: `The path starts from "${concept.title}" because it directly anchors the situation.`,
      score: 100 - index * 5,
    };
  });

  const steps: ScenarioStep[] = [];
  const visited = new Set<string>();

  while (queue.length > 0 && steps.length < 12) {
    queue.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftTitle = conceptById.get(left.conceptId)?.title ?? "";
      const rightTitle = conceptById.get(right.conceptId)?.title ?? "";
      return leftTitle.localeCompare(rightTitle);
    });

    const current = queue.shift();
    if (!current || visited.has(current.conceptId)) {
      continue;
    }

    visited.add(current.conceptId);
    steps.push({
      conceptId: current.conceptId,
      viaLinkId: current.viaLinkId,
      effectType: current.effectType,
      explanation: current.explanation,
      score: current.score,
    });

    const currentConcept = conceptById.get(current.conceptId);
    if (!currentConcept) {
      continue;
    }

    for (const link of outgoing.get(current.conceptId) ?? []) {
      if (visited.has(link.targetConceptId)) {
        continue;
      }

      const targetConcept = conceptById.get(link.targetConceptId);
      if (!targetConcept) {
        continue;
      }

      queue.push({
        conceptId: targetConcept.id,
        viaLinkId: link.id,
        effectType: link.relationType,
        explanation: `"${currentConcept.title}" ${link.relationType.replace(/_/g, " ")} "${targetConcept.title}", so the reaction path continues through it.`,
        score: Math.max(1, current.score - 12 + relationWeight[link.relationType] * link.strength),
      });
    }
  }

  const summary = steps
    .map((step) => conceptById.get(step.conceptId)?.title ?? "")
    .filter(Boolean)
    .join(" -> ");

  return {
    steps,
    summary,
    seedConceptIds: seeds,
  };
}
