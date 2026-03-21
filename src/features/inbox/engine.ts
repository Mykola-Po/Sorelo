import {
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
  type InboxFragmentCandidate,
  type InboxRouteDecisionInputDraft,
} from "@/features/inbox/schemas";
import { computeInboxScore, decideInboxRoute } from "@/features/inbox/state-machine";

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

export const clarificationCapReachedReason =
  "Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.";

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

function buildClarificationFragmentSet(
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
  const answeredQuestionSet = new Set(
    (context.clarificationContext ?? []).map((entry) =>
      entry.question.toLowerCase().trim()
    )
  );

  for (const fragment of fragments) {
    for (const token of tokenize(fragment.fragmentText)) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
    }
  }

  const entities = [...tokenFrequency.entries()]
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
        confidence: Math.min(0.9, 0.45 + count * 0.1),
        payload: {
          frequency: count,
        },
      })
    );

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

  const relations = [];
  if (entities.length >= 2) {
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

  return resolveOutputSchema.parse({
    mergeCandidates: [],
    linkedObjects: [],
    dedupeSignals,
    payload: undefined,
  });
}

function buildStructuredPacket(
  interpretation: InterpretOutput,
  route: RouteOutput["route"],
  clarificationContext: InboxClarificationContextEntry[] = []
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

export function finalizeInboxRouteAfterClarification(route: RouteOutput) {
  if (route.route !== "clarify") {
    return route;
  }

  return {
    ...route,
    route: "park" as const,
    nextStatus: "parked" as const,
    reason: clarificationCapReachedReason,
    structuredPacket: route.structuredPacket
      ? {
          ...route.structuredPacket,
          packetType: "parked_packet" as const,
          route: "park" as const,
          status: "draft" as const,
        }
      : null,
    clarificationDraft: null,
  };
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

  const rawFragments =
    input.baseFragments && input.baseFragments.length > 0
      ? input.baseFragments
      : segmentInboxText(normalizer.normalizedText, {
          sourceKind: "item_raw",
        }).fragments;

  const clarificationFragments = buildClarificationFragmentSet(
    clarificationContext,
    rawFragments.length
  );
  const analysisFragments = [...rawFragments, ...clarificationFragments].slice(0, 128);
  const segmenter = {
    fragments: rawFragments,
  };
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

  const routeInput: InboxRouteDecisionInputDraft = {
    rInbox: scorer.rInbox,
    confidence: scorer.confidence,
    ambiguity: scorer.ambiguity,
    risk: scorer.risk,
    isDuplicate: resolver.dedupeSignals.includes("exact_normalized_text_match"),
    isEmptySignal: normalizer.normalizedText.length === 0,
    hasReusableSignal:
      interpreter.entities.length > 0 ||
      interpreter.questions.length > 0 ||
      interpreter.constraints.length > 0 ||
      clarificationContext.length > 0,
    expectedValueGain: Math.min(
      1,
      Math.max(
        0,
        scorer.ambiguity -
          0.1 +
          interpreter.questions.length * 0.18 +
          interpreter.constraints.length * 0.12
      )
    ),
    askCost: 0.32,
  };

  const baseRoute = decideInboxRoute(routeInput);
  const route: RouteOutput = {
    ...baseRoute,
    structuredPacket:
      baseRoute.route === "discard"
        ? null
        : buildStructuredPacket(interpreter, baseRoute.route, clarificationContext),
    clarificationDraft:
      baseRoute.route === "clarify"
        ? buildClarificationDraft(interpreter, scorer)
        : null,
  };

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
