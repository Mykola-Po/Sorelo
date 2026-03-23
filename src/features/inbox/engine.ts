import {
  compileInboxApplyContract,
} from "@/features/inbox/promote";
import {
  routeOutputSchema,
  resolveOutputSchema,
  type InterpretOutput,
  type NormalizerOutput,
  type ResolveOutput,
  type RouteOutput,
  type ScoreOutput,
  type SegmenterOutput,
} from "@/features/inbox/contracts";
import {
  clarificationRequestDraftSchema,
  inboxAtomCandidateSchema,
  inboxConstraintSchema,
  inboxFragmentCandidateSchema,
  inboxHypothesisCandidateSchema,
  inboxIntentSchema,
  inboxInterpreterEntitySchema,
  inboxInterpreterRelationSchema,
  inboxQuestionSchema,
  structuredPacketDraftSchema,
  type InboxClarificationContextEntry,
  type InboxInterpreterEntity,
  type InboxFragmentCandidate,
  type InboxApplyContract,
  type InboxRouteDecisionInputDraft,
} from "@/features/inbox/schemas";
import {
  applyInboxRoutingOverride,
  applyInboxRoutingPolicyTraceToRouteOutput,
  evaluateInboxRoutingPolicy,
  inboxRoutingThresholds,
} from "@/features/inbox/routing-policy";
import { computeInboxScore } from "@/features/inbox/state-machine";
import type { ConceptType } from "@/shared/db/schema";

const sentenceBoundary = /[^.!?\n]+[.!?]?/g;

const stopwords = new Set([
  "about",
  "after",
  "also",
  "always",
  "because",
  "before",
  "being",
  "between",
  "could",
  "does",
  "from",
  "have",
  "into",
  "just",
  "like",
  "make",
  "more",
  "much",
  "need",
  "only",
  "other",
  "should",
  "that",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "when",
  "with",
  "would",
  "what",
  "where",
  "which",
  "while",
  "потому",
  "когда",
  "после",
  "если",
  "чтобы",
  "этот",
  "эта",
  "эти",
  "того",
  "только",
  "нужно",
  "надо",
  "треба",
  "коли",
  "після",
  "якщо",
  "щоби",
  "цей",
  "ця",
  "ці",
  "лише",
  "дуже",
]);

type ResolveContext = {
  otherNormalizedTexts?: string[];
  existingConcepts?: Array<{
    id: string;
    title: string;
    conceptType: ConceptType;
    summary: string | null;
    description: string | null;
  }>;
};

type InterpretContext = {
  clarificationContext?: InboxClarificationContextEntry[];
};

type ScoreContext = {
  clarificationContext?: InboxClarificationContextEntry[];
};

type SegmentInboxTextOptions = {
  ordinalOffset?: number;
  sourceKind?: "item_raw" | "clarification_answer";
  clarificationAnswerId?: string | null;
  includeSpans?: boolean;
};

type InboxPipelineDraftInput = {
  itemId: string;
  rawText: string;
  sourceType: string;
  baseNormalizedText?: string | null;
  baseLanguage?: string | null;
  baseFragments?: InboxFragmentCandidate[];
  clarificationContext?: InboxClarificationContextEntry[];
  resolveContext?: ResolveContext;
};

export type InboxPipelineDraft = {
  normalizer: NormalizerOutput;
  segmenter: SegmenterOutput;
  clarificationFragments: InboxFragmentCandidate[];
  analysisFragments: InboxFragmentCandidate[];
  interpreter: InterpretOutput;
  scorer: ScoreOutput;
  resolver: ResolveOutput;
  route: RouteOutput;
};

export type InboxSegmentationDraft = {
  segmenter: SegmenterOutput;
  clarificationFragments: InboxFragmentCandidate[];
  analysisFragments: InboxFragmentCandidate[];
};

type BuildInboxSegmentationInput = {
  normalizedText: string;
  clarificationContext?: InboxClarificationContextEntry[];
  baseFragments?: InboxFragmentCandidate[];
};

type BuildInboxRouteDraftInput = {
  normalizer: NormalizerOutput;
  analysisFragments: InboxFragmentCandidate[];
  interpreter: InterpretOutput;
  scorer: ScoreOutput;
  resolver: ResolveOutput;
  clarificationContext?: InboxClarificationContextEntry[];
  resolveContext?: ResolveContext;
};

export type InboxRouteDraft = {
  route: RouteOutput;
  applyContract: InboxApplyContract;
  routeInput: InboxRouteDecisionInputDraft;
};

function normalizeWhitespace(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectLanguage(text: string) {
  const hasLatin = /[a-z]/i.test(text);
  const hasCyrillic = /[\u0400-\u04ff]/.test(text);

  if (hasCyrillic && /[іїєґІЇЄҐ]/.test(text)) {
    return "uk";
  }

  if (hasCyrillic) {
    return "ru";
  }

  if (hasLatin) {
    return "en";
  }

  return null;
}

function classifyFragmentType(text: string) {
  if (text.endsWith("?")) {
    return {
      fragmentType: "question" as const,
      typeCandidates: ["question", "statement"] as const,
    };
  }

  if (
    /\b(need|must|should|have to|cannot|can't|нужно|надо|должен|должна|треба|має|повинен)\b/i.test(
      text
    )
  ) {
    return {
      fragmentType: "constraint" as const,
      typeCandidates: ["constraint", "statement"] as const,
    };
  }

  if (
    /\b(observed|noticed|saw|heard|remember|observed|заметил|заметила|наблюдал|помню|побачив|помітив)\b/i.test(
      text
    )
  ) {
    return {
      fragmentType: "observation" as const,
      typeCandidates: ["observation", "claim"] as const,
    };
  }

  if (
    /\b(want|plan|trying to|need to understand|хочу|планирую|пытаюсь|хочу понять|хочу зрозуміти|планую)\b/i.test(
      text
    )
  ) {
    return {
      fragmentType: "intent" as const,
      typeCandidates: ["intent", "statement"] as const,
    };
  }

  if (
    /\b(think|believe|seems|probably|кажется|думаю|считаю|мабуть|здається|вважаю)\b/i.test(
      text
    )
  ) {
    return {
      fragmentType: "claim" as const,
      typeCandidates: ["claim", "statement"] as const,
    };
  }

  return {
    fragmentType: "statement" as const,
    typeCandidates: ["statement", "claim"] as const,
  };
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .match(/[\p{L}\p{N}][\p{L}\p{N}'-]{2,}/gu)
    ?.map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopwords.has(token)) ?? [];
}

function buildSummaryText(fragments: InboxFragmentCandidate[]) {
  return fragments
    .slice(0, 3)
    .map((fragment) => fragment.fragmentText.replace(/[.!?]+$/g, ""))
    .join("; ");
}

const relationExtractionRules = [
  {
    relationType: "causes" as const,
    patterns: [
      /^(?<source>.+?)\s+(?:causes?|leads to|triggers?)\s+(?<target>.+)$/i,
    ],
  },
  {
    relationType: "strengthens" as const,
    patterns: [/^(?<source>.+?)\s+(?:strengthens?|reinforces?)\s+(?<target>.+)$/i],
  },
  {
    relationType: "weakens" as const,
    patterns: [/^(?<source>.+?)\s+(?:weakens?|reduces?)\s+(?<target>.+)$/i],
  },
  {
    relationType: "explains" as const,
    patterns: [/^(?<source>.+?)\s+(?:explains?)\s+(?<target>.+)$/i],
  },
  {
    relationType: "contradicts" as const,
    patterns: [/^(?<source>.+?)\s+(?:contradicts?)\s+(?<target>.+)$/i],
  },
] as const;

function cleanRelationPhrase(value: string) {
  return value
    .replace(/[.!?]+$/g, "")
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferEntityTypeFromPhrase(value: string) {
  if (
    /\b(criticism|trigger|pressure|conflict|confrontation|public challenge)\b/i.test(
      value
    )
  ) {
    return "trigger" as const;
  }

  if (
    /\b(withdrawal|reaction|fear|anger|avoidance|defensive|shutdown)\b/i.test(
      value
    )
  ) {
    return "state" as const;
  }

  if (/\b(belief|assumption|expectation)\b/i.test(value)) {
    return "belief" as const;
  }

  if (/\b(fact|evidence)\b/i.test(value)) {
    return "fact" as const;
  }

  return "custom" as const;
}

function extractRelationCandidate(fragment: InboxFragmentCandidate) {
  const normalizedText = cleanRelationPhrase(fragment.fragmentText);

  for (const rule of relationExtractionRules) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(normalizedText);
      const source = cleanRelationPhrase(match?.groups?.source ?? "");
      const target = cleanRelationPhrase(match?.groups?.target ?? "");

      if (!source || !target || source === target) {
        continue;
      }

      return inboxInterpreterRelationSchema.parse({
        sourceLabel: source,
        targetLabel: target,
        relationType: rule.relationType,
        fragmentOrdinals: [fragment.ordinal],
        confidence: 0.78,
        payload: {
          inferredFrom: "relation_phrase",
        },
      });
    }
  }

  return null;
}

function mergeEntityFragmentOrdinals(existing: number[], next: number[]) {
  return Array.from(new Set([...existing, ...next])).slice(0, 8);
}

export function buildClarificationFragmentSet(
  clarificationContext: InboxClarificationContextEntry[],
  ordinalOffset: number
) {
  let nextOrdinal = ordinalOffset;

  return clarificationContext.flatMap((entry) => {
    const normalizedAnswer = normalizeInboxText(entry.answerText);
    const segmentedAnswer = segmentInboxText(normalizedAnswer.normalizedText, {
      ordinalOffset: nextOrdinal,
      sourceKind: "clarification_answer",
      clarificationAnswerId: entry.answerId,
      includeSpans: false,
    });

    nextOrdinal += segmentedAnswer.fragments.length;
    return segmentedAnswer.fragments;
  });
}

export function buildInboxSegmentationDraft(
  input: BuildInboxSegmentationInput
): InboxSegmentationDraft {
  const rawFragments =
    input.baseFragments && input.baseFragments.length > 0
      ? input.baseFragments
      : segmentInboxText(input.normalizedText, {
          sourceKind: "item_raw",
        }).fragments;

  const clarificationFragments = buildClarificationFragmentSet(
    input.clarificationContext ?? [],
    rawFragments.length
  );

  return {
    segmenter: {
      fragments: rawFragments,
    },
    clarificationFragments,
    analysisFragments: [...rawFragments, ...clarificationFragments].slice(0, 128),
  };
}

export function normalizeInboxText(rawText: string): NormalizerOutput {
  const normalizedText = normalizeWhitespace(rawText);
  const normalizationNotes: string[] = [];

  if (normalizedText !== rawText.trim()) {
    normalizationNotes.push("Whitespace and line breaks were normalized.");
  }

  const language = detectLanguage(normalizedText);
  if (language) {
    normalizationNotes.push(`Detected primary language: ${language}.`);
  }

  return {
    normalizedText,
    language,
    normalizationNotes,
  };
}

export function segmentInboxText(
  normalizedText: string,
  options: SegmentInboxTextOptions = {}
): SegmenterOutput {
  const {
    ordinalOffset = 0,
    sourceKind = "item_raw",
    clarificationAnswerId = null,
    includeSpans = true,
  } = options;

  const fragments = Array.from(normalizedText.matchAll(sentenceBoundary))
    .map((match, index) => {
      const fragmentText = match[0]?.trim();
      if (!fragmentText) {
        return null;
      }

      const { fragmentType, typeCandidates } = classifyFragmentType(fragmentText);

      return inboxFragmentCandidateSchema.parse({
        ordinal: ordinalOffset + index,
        fragmentText,
        fragmentType,
        sourceKind,
        clarificationAnswerId,
        typeCandidates,
        span: includeSpans
          ? {
              start: match.index ?? 0,
              end: (match.index ?? 0) + fragmentText.length,
            }
          : null,
      });
    })
    .filter((fragment): fragment is InboxFragmentCandidate => Boolean(fragment))
    .slice(0, 64);

  if (fragments.length === 0) {
    fragments.push(
      inboxFragmentCandidateSchema.parse({
        ordinal: ordinalOffset,
        fragmentText: normalizedText,
        fragmentType: "statement",
        sourceKind,
        clarificationAnswerId,
        typeCandidates: ["statement"],
        span: includeSpans
          ? {
              start: 0,
              end: normalizedText.length,
            }
          : null,
      })
    );
  }

  return { fragments };
}

export function interpretInboxText(
  normalizedText: string,
  fragments: InboxFragmentCandidate[],
  context: InterpretContext = {}
): InterpretOutput {
  const tokenFrequency = new Map<string, number>();
  const extractedEntityByLabel = new Map<string, InboxInterpreterEntity>();
  const extractedRelations: Array<
    ReturnType<typeof inboxInterpreterRelationSchema.parse>
  > = [];
  const answeredQuestionSet = new Set(
    (context.clarificationContext ?? []).map((entry) =>
      entry.question.toLowerCase().trim()
    )
  );

  for (const fragment of fragments) {
    const relationCandidate = extractRelationCandidate(fragment);
    if (relationCandidate) {
      extractedRelations.push(relationCandidate);

      for (const label of [
        relationCandidate.sourceLabel,
        relationCandidate.targetLabel,
      ]) {
        const existing = extractedEntityByLabel.get(label);
        const fragmentOrdinals = existing
          ? mergeEntityFragmentOrdinals(existing.fragmentOrdinals, [
              fragment.ordinal,
            ])
          : [fragment.ordinal];

        extractedEntityByLabel.set(
          label,
          inboxInterpreterEntitySchema.parse({
            label,
            entityType: inferEntityTypeFromPhrase(label),
            fragmentOrdinals,
            confidence: Math.max(existing?.confidence ?? 0, 0.74),
            payload: {
              inferredFrom: "relation_phrase",
            },
          })
        );
      }
    }

    for (const token of tokenize(fragment.fragmentText)) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
    }
  }

  const fallbackEntities = [...tokenFrequency.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, 6)
    .map(([label, count]) =>
      inboxInterpreterEntitySchema.parse({
        label,
        entityType: "custom",
        fragmentOrdinals: [],
        confidence: Math.min(0.9, 0.45 + count * 0.1),
        payload: {
          frequency: count,
          inferredFrom: "token_frequency",
        },
      })
    );

  const entities = [
    ...extractedEntityByLabel.values(),
    ...fallbackEntities.filter(
      (entity) =>
        !extractedEntityByLabel.has(entity.label) &&
        extractedEntityByLabel.size < 6
    ),
  ].slice(0, 6);

  const questions = fragments
    .filter((fragment) => fragment.fragmentType === "question")
    .slice(0, 3)
    .map((fragment) =>
      inboxQuestionSchema.parse({
        question: fragment.fragmentText,
        confidence: 0.72,
      })
    )
    .filter(
      (question) => !answeredQuestionSet.has(question.question.toLowerCase().trim())
    );

  const constraints = fragments
    .filter((fragment) => fragment.fragmentType === "constraint")
    .slice(0, 3)
    .map((fragment) =>
      inboxConstraintSchema.parse({
        constraint: fragment.fragmentText,
        confidence: 0.7,
      })
    );

  const intents = fragments
    .filter((fragment) => fragment.fragmentType === "intent")
    .slice(0, 3)
    .map((fragment) =>
      inboxIntentSchema.parse({
        label: fragment.fragmentText,
        confidence: 0.68,
      })
    );

  const relations = [...extractedRelations];
  if (relations.length === 0 && entities.length >= 2) {
    relations.push(
      inboxInterpreterRelationSchema.parse({
        sourceLabel: entities[0]?.label,
        targetLabel: entities[1]?.label,
        relationType: "related_to",
        confidence: 0.45,
        payload: {
          inferredFrom: "token_cooccurrence",
        },
      })
    );
  }

  const hypotheses = [
    inboxHypothesisCandidateSchema.parse({
      rank: 1,
      hypothesisType: "interpretation",
      payload: {
        fragmentOrdinals: fragments.slice(0, 3).map((fragment) => fragment.ordinal),
        summary: buildSummaryText(fragments),
        clarificationAnswerCount: context.clarificationContext?.length ?? 0,
      },
      confidence: Math.min(0.9, 0.55 + entities.length * 0.04),
      explanation:
        "The input contains enough repeated cues to form an explainable structural interpretation.",
    }),
  ];

  if (relations.length > 0) {
    hypotheses.push(
      inboxHypothesisCandidateSchema.parse({
        rank: 2,
        hypothesisType: "relation_cluster",
        payload: {
          relationCount: relations.length,
        },
        confidence: 0.52,
        explanation:
          "At least one relationship candidate can be proposed from the current fragments.",
      })
    );
  }

  if (questions.length > 0 || constraints.length > 0) {
    hypotheses.push(
      inboxHypothesisCandidateSchema.parse({
        rank: Math.min(3, hypotheses.length + 1),
        hypothesisType: "actionable_summary",
        payload: {
          questionCount: questions.length,
          constraintCount: constraints.length,
        },
        confidence: 0.5,
        explanation:
          "The input likely requires either clarification or constrained routing instead of a blind promotion.",
      })
    );
  }

  const atoms = [
    ...entities.map((entity) =>
      inboxAtomCandidateSchema.parse({
        atomType: "entity",
        canonicalValue: entity.label,
        payload: entity.payload,
        confidence: entity.confidence,
      })
    ),
    ...relations.map((relation) =>
      inboxAtomCandidateSchema.parse({
        atomType: "relation",
        canonicalValue: `${relation.sourceLabel}:${relation.relationType}:${relation.targetLabel}`,
        payload: relation.payload,
        confidence: relation.confidence,
      })
    ),
    ...questions.map((question) =>
      inboxAtomCandidateSchema.parse({
        atomType: "question",
        canonicalValue: question.question,
        payload: {},
        confidence: question.confidence,
      })
    ),
    ...constraints.map((constraint) =>
      inboxAtomCandidateSchema.parse({
        atomType: "constraint",
        canonicalValue: constraint.constraint,
        payload: {},
        confidence: constraint.confidence,
      })
    ),
    ...intents.map((intent) =>
      inboxAtomCandidateSchema.parse({
        atomType: "intent",
        canonicalValue: intent.label,
        payload: {},
        confidence: intent.confidence,
      })
    ),
  ];

  return {
    hypotheses,
    entities,
    relations,
    intents,
    questions,
    constraints,
    atoms,
  };
}

export function scoreInboxInterpretation(
  normalizedText: string,
  interpretation: InterpretOutput,
  context: ScoreContext = {}
): ScoreOutput {
  const answeredClarificationCount = context.clarificationContext?.length ?? 0;
  const clarificationBoost = Math.min(0.18, answeredClarificationCount * 0.18);
  const fragmentSignal = Math.min(1, normalizedText.length / 240);
  const entitySignal = Math.min(1, interpretation.entities.length / 4);
  const relationSignal = Math.min(1, interpretation.relations.length / 2);
  const questionPenalty = interpretation.questions.length > 0 ? 0.08 : 0;

  const scoreBreakdown = {
    signalQuality: Math.max(0.2, fragmentSignal),
    interpretability: Math.min(
      1,
      0.35 + entitySignal * 0.4 + clarificationBoost * 0.25
    ),
    structure: Math.min(
      1,
      0.34 +
        relationSignal * 0.25 +
        interpretation.hypotheses.length * 0.12 +
        clarificationBoost * 0.18
    ),
    grounding: Math.min(
      1,
      0.32 +
        (interpretation.constraints.length + interpretation.questions.length) * 0.08 +
        clarificationBoost * 0.8
    ),
    actionability: Math.min(
      1,
      0.3 +
        interpretation.questions.length * 0.14 +
        interpretation.constraints.length * 0.12 +
        interpretation.intents.length * 0.1 +
        clarificationBoost * 0.5
    ),
    utility: Math.min(
      1,
      0.4 +
        entitySignal * 0.25 +
        relationSignal * 0.15 +
        clarificationBoost * 0.35
    ),
    penalty: Math.min(
      0.85,
      Math.max(
        0.02,
        0.38 -
          entitySignal * 0.1 -
          relationSignal * 0.08 +
          questionPenalty -
          clarificationBoost * 0.6
      )
    ),
  };

  const rInbox = computeInboxScore(scoreBreakdown);
  const confidence = Math.min(
    1,
    0.35 +
      scoreBreakdown.interpretability * 0.25 +
      scoreBreakdown.structure * 0.2 +
      clarificationBoost * 0.55
  );
  const ambiguity = Math.min(
    1,
    Math.max(
      0,
      0.2 +
        interpretation.questions.length * 0.18 +
        (interpretation.entities.length === 0 ? 0.2 : 0) -
        clarificationBoost -
        (answeredClarificationCount > 0 && interpretation.questions.length === 0
          ? 0.08
          : 0)
    )
  );
  const risk = Math.min(1, 0.12 + ambiguity * 0.55 + scoreBreakdown.penalty * 0.25);

  return {
    scoreBreakdown,
    rInbox,
    confidence,
    ambiguity,
    risk,
    explanation:
      "The score is derived from signal quality, structural density, grounding cues, and the current ambiguity penalty.",
  };
}

export function resolveInboxInterpretation(
  normalizedText: string,
  interpretation: InterpretOutput,
  context: ResolveContext = {}
): ResolveOutput {
  const duplicateHit = context.otherNormalizedTexts?.find(
    (candidate) => candidate === normalizedText
  );
  const dedupeSignals = duplicateHit ? ["exact_normalized_text_match"] : [];
  const mergeCandidates = interpretation.entities.flatMap((entity) => {
    const normalizedLabel = entity.label.trim().toLowerCase();
    const fuzzyConcept = context.existingConcepts?.find((concept) => {
      const normalizedTitle = concept.title.trim().toLowerCase();

      return (
        normalizedTitle !== normalizedLabel &&
        (normalizedTitle.includes(normalizedLabel) ||
          normalizedLabel.includes(normalizedTitle))
      );
    });

    if (!fuzzyConcept) {
      return [];
    }

    return [
      {
        targetObjectType: "concept" as const,
        targetObjectId: fuzzyConcept.id,
        similarity: Math.max(0.65, entity.confidence),
        decision: null,
      },
    ];
  });

  return resolveOutputSchema.parse({
    mergeCandidates,
    linkedObjects: [],
    dedupeSignals,
  });
}

function buildStructuredPacket(
  interpretation: InterpretOutput,
  route: RouteOutput["route"],
  clarificationContext: InboxClarificationContextEntry[] = [],
  applyContract: InboxApplyContract | null = null
) {
  const hasRelations = interpretation.relations.length > 0;
  const hasEntities = interpretation.entities.length > 0;
  const packetType =
    route === "clarify"
      ? "clarification_packet"
      : route === "park"
        ? "parked_packet"
        : hasEntities && hasRelations
          ? "mixed_packet"
          : hasRelations
            ? "link_packet"
            : "concept_packet";

  return structuredPacketDraftSchema.parse({
    packetType,
    summary:
      interpretation.hypotheses[0]?.payload.summary ??
      "Structured hypotheses were extracted from the inbox input.",
    payload: {
      entities: interpretation.entities,
      relations: interpretation.relations,
      intents: interpretation.intents,
      questions: interpretation.questions,
      constraints: interpretation.constraints,
      clarificationContext,
      applyContract,
    },
    route,
    status: route === "promote" ? "ready" : "draft",
  });
}

function buildClarificationDraft(
  interpretation: InterpretOutput,
  score: ScoreOutput
) {
  const primaryQuestion =
    interpretation.questions[0]?.question ??
    "What is the most important missing detail in this input?";

  return clarificationRequestDraftSchema.parse({
    question: primaryQuestion,
    reason:
      score.ambiguity >= 0.45
        ? "Reducing the current ambiguity is likely to change the routing outcome."
        : "A single clarification should improve the structure enough to route this item safely.",
  });
}

export function buildInboxRouteDraft(
  input: BuildInboxRouteDraftInput
): InboxRouteDraft {
  const clarificationContext = input.clarificationContext ?? [];
  const applyContract = compileInboxApplyContract({
    entities: input.interpreter.entities,
    relations: input.interpreter.relations,
    constraints: input.interpreter.constraints,
    fragments: input.analysisFragments,
    clarificationContext,
    existingConcepts: input.resolveContext?.existingConcepts,
  });

  const routeInput: InboxRouteDecisionInputDraft = {
    rInbox: input.scorer.rInbox,
    confidence: input.scorer.confidence,
    ambiguity: input.scorer.ambiguity,
    risk: input.scorer.risk,
    isDuplicate: input.resolver.dedupeSignals.includes(
      "exact_normalized_text_match"
    ),
    isEmptySignal: input.normalizer.normalizedText.length === 0,
    hasReusableSignal:
      input.interpreter.entities.length > 0 ||
      input.interpreter.questions.length > 0 ||
      input.interpreter.constraints.length > 0 ||
      clarificationContext.length > 0,
    expectedValueGain: Math.min(
      1,
      Math.max(
        0,
        input.scorer.ambiguity -
          0.1 +
          input.interpreter.questions.length * 0.18 +
          input.interpreter.constraints.length * 0.12
      )
    ),
    askCost: inboxRoutingThresholds.askCost,
  };

  let routingPolicy = evaluateInboxRoutingPolicy(routeInput).trace;
  let route = routeOutputSchema.parse({
    ...routingPolicy.finalDecision,
    structuredPacket:
      routingPolicy.finalDecision.route === "discard"
        ? null
        : buildStructuredPacket(
            input.interpreter,
            routingPolicy.finalDecision.route,
            clarificationContext,
            applyContract
          ),
    clarificationDraft:
      routingPolicy.finalDecision.route === "clarify"
        ? buildClarificationDraft(input.interpreter, input.scorer)
        : null,
    routingPolicy,
  });
  const hasCanonicalMutationOperation = applyContract.operations.some(
    (operation) =>
      operation.operationType === "create_concept" ||
      operation.operationType === "update_concept" ||
      operation.operationType === "create_link"
  );

  if (route.route === "promote" && !hasCanonicalMutationOperation) {
    routingPolicy = applyInboxRoutingOverride(
      routingPolicy,
      "override.promote_requires_deterministic_mutation"
    );
    route = routeOutputSchema.parse(
      applyInboxRoutingPolicyTraceToRouteOutput(route, routingPolicy)
    );
  }

  return {
    applyContract,
    routeInput,
    route,
  };
}

export function finalizeInboxRouteAfterClarification(route: RouteOutput) {
  if (route.route !== "clarify") {
    return route;
  }

  return routeOutputSchema.parse(
    applyInboxRoutingPolicyTraceToRouteOutput(
      route,
      applyInboxRoutingOverride(
        route.routingPolicy,
        "override.clarification_cap_reached"
      )
    )
  );
}

export function runInboxPipelineDraft(
  input: InboxPipelineDraftInput
): InboxPipelineDraft {
  const clarificationContext = input.clarificationContext ?? [];
  const normalizer =
    input.baseNormalizedText && input.baseNormalizedText.trim().length > 0
      ? {
          normalizedText: normalizeWhitespace(input.baseNormalizedText),
          language:
            input.baseLanguage ?? detectLanguage(normalizeWhitespace(input.baseNormalizedText)),
          normalizationNotes: [],
        }
      : normalizeInboxText(input.rawText);
  const {
    segmenter,
    clarificationFragments,
    analysisFragments,
  } = buildInboxSegmentationDraft({
    normalizedText: normalizer.normalizedText,
    clarificationContext,
    ...(input.baseFragments === undefined
      ? {}
      : { baseFragments: input.baseFragments }),
  });
  const interpreter = interpretInboxText(
    normalizer.normalizedText,
    analysisFragments,
    { clarificationContext }
  );
  const scorer = scoreInboxInterpretation(normalizer.normalizedText, interpreter, {
    clarificationContext,
  });
  const resolver = resolveInboxInterpretation(
    normalizer.normalizedText,
    interpreter,
    input.resolveContext
  );
  const { route } = buildInboxRouteDraft({
    normalizer,
    analysisFragments,
    interpreter,
    scorer,
    resolver,
    clarificationContext,
    ...(input.resolveContext === undefined
      ? {}
      : { resolveContext: input.resolveContext }),
  });

  return {
    normalizer,
    segmenter,
    clarificationFragments,
    analysisFragments,
    interpreter,
    scorer,
    resolver,
    route,
  };
}
