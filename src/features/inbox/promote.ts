import {
  inboxApplyContractSchema,
  inboxCreateConceptOperationSchema,
  inboxCreateLinkOperationSchema,
  inboxMergeCandidateOperationSchema,
  inboxParkForReviewOperationSchema,
  inboxUpdateConceptOperationSchema,
  type InboxConstraint,
  type InboxFragmentCandidate,
  type InboxInterpreterEntity,
  type InboxInterpreterRelation,
  type InboxClarificationContextEntry,
} from "@/features/inbox/schemas";
import type { ConceptType, RelationType } from "@/shared/db/schema";

type ExistingMapConcept = {
  id: string;
  title: string;
  conceptType: ConceptType;
  summary: string | null;
  description: string | null;
};

type CompileInboxApplyContractInput = {
  entities: InboxInterpreterEntity[];
  relations: InboxInterpreterRelation[];
  constraints: InboxConstraint[];
  fragments: InboxFragmentCandidate[];
  clarificationContext?: InboxClarificationContextEntry[];
  existingConcepts?: ExistingMapConcept[] | undefined;
};

type ResolvedEntity =
  | {
      status: "resolved";
      ref:
        | {
            source: "existing";
            conceptId: string;
          }
        | {
            source: "packet";
            conceptRef: string;
          };
    }
  | {
      status: "blocked";
      reason: string;
    };

const canonicalRelationTypes = new Set<RelationType>([
  "causes",
  "strengthens",
  "weakens",
  "explains",
  "contradicts",
]);

function normalizeConceptKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function truncateText(value: string, max: number) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function inferCanonicalConceptType(entity: InboxInterpreterEntity): ConceptType {
  switch (entity.entityType) {
    case "state":
      return "state";
    case "belief":
      return "belief";
    case "trigger":
      return "trigger";
    case "fact":
      return "fact";
    default:
      return "custom";
  }
}

function inferLinkStrength(confidence: number) {
  if (confidence >= 0.8) {
    return 4;
  }

  if (confidence >= 0.55) {
    return 3;
  }

  return 2;
}

function getFragmentTextByOrdinals(
  fragments: InboxFragmentCandidate[],
  ordinals: number[]
) {
  const fragmentByOrdinal = new Map(
    fragments.map((fragment) => [fragment.ordinal, fragment.fragmentText] as const)
  );

  return ordinals
    .map((ordinal) => fragmentByOrdinal.get(ordinal))
    .filter((value): value is string => Boolean(value));
}

function deriveSummaryCandidate(
  entity: InboxInterpreterEntity,
  fragments: InboxFragmentCandidate[]
) {
  const supportingTexts = getFragmentTextByOrdinals(
    fragments,
    entity.fragmentOrdinals
  );
  const candidate = supportingTexts[0];
  if (!candidate) {
    return null;
  }

  return truncateText(candidate, 280);
}

function hasFuzzyOverlap(left: string, right: string) {
  return left.includes(right) || right.includes(left);
}

export function compileInboxApplyContract(
  input: CompileInboxApplyContractInput
) {
  const existingConcepts = input.existingConcepts ?? [];
  const warnings: string[] = [];
  const operations: Array<
    ReturnType<typeof inboxCreateConceptOperationSchema.parse> |
      ReturnType<typeof inboxUpdateConceptOperationSchema.parse> |
      ReturnType<typeof inboxCreateLinkOperationSchema.parse> |
      ReturnType<typeof inboxMergeCandidateOperationSchema.parse> |
      ReturnType<typeof inboxParkForReviewOperationSchema.parse>
  > = [];
  const createdConceptRefs = new Map<string, string>();
  const resolvedEntityByLabel = new Map<string, ResolvedEntity>();

  for (const entity of input.entities) {
    const normalizedLabel = normalizeConceptKey(entity.label);
    if (!normalizedLabel || resolvedEntityByLabel.has(normalizedLabel)) {
      continue;
    }

    const exactMatch = existingConcepts.find(
      (concept) => normalizeConceptKey(concept.title) === normalizedLabel
    );

    if (exactMatch) {
      const summaryCandidate = deriveSummaryCandidate(entity, input.fragments);
      const shouldUpdateSummary =
        Boolean(summaryCandidate) &&
        !exactMatch.summary &&
        summaryCandidate !== exactMatch.title;

      if (shouldUpdateSummary) {
        operations.push(
          inboxUpdateConceptOperationSchema.parse({
            operationType: "update_concept",
            conceptId: exactMatch.id,
            title: exactMatch.title,
            conceptType: exactMatch.conceptType,
            summary: summaryCandidate,
            description: exactMatch.description,
            evidenceFragmentOrdinals: entity.fragmentOrdinals,
          })
        );
      }

      resolvedEntityByLabel.set(normalizedLabel, {
        status: "resolved",
        ref: {
          source: "existing",
          conceptId: exactMatch.id,
        },
      });
      continue;
    }

    const fuzzyMatch = existingConcepts.find((concept) =>
      hasFuzzyOverlap(normalizeConceptKey(concept.title), normalizedLabel)
    );

    if (fuzzyMatch) {
      operations.push(
        inboxMergeCandidateOperationSchema.parse({
          operationType: "merge_candidate",
          targetEntityType: "concept",
          targetEntityId: fuzzyMatch.id,
          title: titleCase(entity.label),
          reason:
            "The extracted Concept overlaps with an existing Concept title and needs explicit review before mutation.",
          similarity: Math.max(0.65, entity.confidence),
          evidenceFragmentOrdinals: entity.fragmentOrdinals,
        })
      );
      warnings.push(
        `Concept "${entity.label}" overlaps with existing Concept "${fuzzyMatch.title}".`
      );
      resolvedEntityByLabel.set(normalizedLabel, {
        status: "blocked",
        reason: "Concept overlap requires merge review.",
      });
      continue;
    }

    const conceptRef = `concept:${normalizedLabel}`;
    createdConceptRefs.set(normalizedLabel, conceptRef);
    operations.push(
      inboxCreateConceptOperationSchema.parse({
        operationType: "create_concept",
        conceptRef,
        title: titleCase(entity.label),
        conceptType: inferCanonicalConceptType(entity),
        summary: deriveSummaryCandidate(entity, input.fragments),
        description: null,
        evidenceFragmentOrdinals: entity.fragmentOrdinals,
      })
    );
    resolvedEntityByLabel.set(normalizedLabel, {
      status: "resolved",
      ref: {
        source: "packet",
        conceptRef,
      },
    });
  }

  for (const relation of input.relations) {
    if (!canonicalRelationTypes.has(relation.relationType as RelationType)) {
      operations.push(
        inboxParkForReviewOperationSchema.parse({
          operationType: "park_for_review",
          reason:
            "The extracted Link is not expressed with a canonical relation type and needs review.",
          evidenceFragmentOrdinals: relation.fragmentOrdinals,
          payload: {
            sourceLabel: relation.sourceLabel,
            targetLabel: relation.targetLabel,
            relationType: relation.relationType,
          },
        })
      );
      warnings.push(
        `Link "${relation.sourceLabel} -> ${relation.targetLabel}" needs review because "${relation.relationType}" is not canonical.`
      );
      continue;
    }

    const sourceResolution = resolvedEntityByLabel.get(
      normalizeConceptKey(relation.sourceLabel)
    );
    const targetResolution = resolvedEntityByLabel.get(
      normalizeConceptKey(relation.targetLabel)
    );

    if (
      !sourceResolution ||
      !targetResolution ||
      sourceResolution.status === "blocked" ||
      targetResolution.status === "blocked"
    ) {
      operations.push(
        inboxParkForReviewOperationSchema.parse({
          operationType: "park_for_review",
          reason:
            "The Link depends on a Concept that still requires merge or context review.",
          evidenceFragmentOrdinals: relation.fragmentOrdinals,
          payload: {
            sourceLabel: relation.sourceLabel,
            targetLabel: relation.targetLabel,
            relationType: relation.relationType,
          },
        })
      );
      warnings.push(
        `Link "${relation.sourceLabel} -> ${relation.targetLabel}" is blocked until dependent Concepts are reviewed.`
      );
      continue;
    }

    operations.push(
      inboxCreateLinkOperationSchema.parse({
        operationType: "create_link",
        source: sourceResolution.ref,
        target: targetResolution.ref,
        relationType: relation.relationType as RelationType,
        strength: inferLinkStrength(relation.confidence),
        description:
          getFragmentTextByOrdinals(input.fragments, relation.fragmentOrdinals)[0] ??
          null,
        evidenceFragmentOrdinals: relation.fragmentOrdinals,
      })
    );
  }

  if (operations.length === 0 || input.constraints.length > 0) {
    const firstConstraint = input.constraints[0]?.constraint;
    operations.push(
      inboxParkForReviewOperationSchema.parse({
        operationType: "park_for_review",
        reason:
          firstConstraint ??
          "The packet does not yet compile into deterministic canonical operations.",
        evidenceFragmentOrdinals: [],
        payload: {
          clarificationContext: input.clarificationContext ?? [],
        },
      })
    );
  }

  return inboxApplyContractSchema.parse({
    contractVersion: "inbox-apply-contract.v1",
    operations,
    warnings: warnings.slice(0, 12),
  });
}
