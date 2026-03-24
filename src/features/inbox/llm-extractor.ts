import "server-only";

import { interpretInboxText } from "@/features/inbox/engine";
import type { InterpretOutput } from "@/features/inbox/contracts";
import {
  inboxAtomCandidateSchema,
  inboxConstraintSchema,
  inboxHypothesisCandidateSchema,
  inboxIntentSchema,
  inboxInterpreterEntitySchema,
  inboxInterpreterRelationSchema,
  inboxQuestionSchema,
  type InboxClarificationContextEntry,
  type InboxFragmentCandidate,
} from "@/features/inbox/schemas";
import { env } from "@/shared/config/env";
import { z } from "zod";

const openAiInterpretPromptVersion = "inbox-interpret.openai.v1";
const deterministicInterpretPromptVersion = "inbox-interpret.deterministic.v1";
const defaultInboxLlmModel = "gpt-5-mini";

const inboxLlmExtractionSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  ambiguitySignals: z.array(z.string().trim().min(1).max(160)).max(6),
  entities: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(280),
        entityType: z.enum([
          "concept",
          "state",
          "belief",
          "trigger",
          "fact",
          "person",
          "custom",
        ]),
        fragmentOrdinals: z.array(z.number().int().min(0)).max(8),
        confidence: z.number().min(0).max(1),
        evidence: z.string().trim().min(1).max(500),
      })
    )
    .max(16),
  relations: z
    .array(
      z.object({
        sourceLabel: z.string().trim().min(1).max(280),
        targetLabel: z.string().trim().min(1).max(280),
        relationType: z.enum([
          "causes",
          "strengthens",
          "weakens",
          "explains",
          "contradicts",
          "related_to",
        ]),
        fragmentOrdinals: z.array(z.number().int().min(0)).max(8),
        confidence: z.number().min(0).max(1),
        evidence: z.string().trim().min(1).max(500),
      })
    )
    .max(16),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(500),
        confidence: z.number().min(0).max(1),
        fragmentOrdinals: z.array(z.number().int().min(0)).max(8),
      })
    )
    .max(4),
  constraints: z
    .array(
      z.object({
        constraint: z.string().trim().min(1).max(500),
        confidence: z.number().min(0).max(1),
        fragmentOrdinals: z.array(z.number().int().min(0)).max(8),
      })
    )
    .max(4),
  intents: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(280),
        confidence: z.number().min(0).max(1),
        fragmentOrdinals: z.array(z.number().int().min(0)).max(8),
      })
    )
    .max(4),
  hypotheses: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(3),
        hypothesisType: z.enum([
          "interpretation",
          "candidate_structure",
          "relation_cluster",
          "actionable_summary",
        ]),
        summary: z.string().trim().min(1).max(1000),
        fragmentOrdinals: z.array(z.number().int().min(0)).max(8),
        confidence: z.number().min(0).max(1),
        explanation: z.string().trim().min(1).max(2000),
      })
    )
    .max(3),
});

type InboxLlmExtraction = z.infer<typeof inboxLlmExtractionSchema>;

type InboxInterpretRuntimeProvider = "openai" | "deterministic";

export type InboxInterpretAttemptRuntime = {
  modelName: string;
  promptVersion: string;
  provider: InboxInterpretRuntimeProvider;
};

export type InboxInterpretRuntime = InboxInterpretAttemptRuntime & {
  fallbackUsed: boolean;
  metadata: Record<string, unknown>;
};

export type ExtractInboxInterpretationInput = {
  itemId: string;
  normalizedText: string;
  fragments: InboxFragmentCandidate[];
  clarificationContext?: InboxClarificationContextEntry[];
};

export type ExtractInboxInterpretationResult = {
  interpretation: InterpretOutput;
  runtime: InboxInterpretRuntime;
};

type OpenAiResponsesApiResponse = {
  id?: string;
  model?: string;
  output_text?: string;
  usage?: Record<string, unknown>;
  error?: {
    message?: string;
  };
};

type InboxLlmAttemptTelemetry = {
  attempt: number;
  latencyMs: number;
  statusCode: number | null;
  retryable: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type InboxLlmRequestResult = {
  extraction: InboxLlmExtraction;
  apiResponse: OpenAiResponsesApiResponse;
  attempts: InboxLlmAttemptTelemetry[];
};

class InboxLlmRequestError extends Error {
  readonly statusCode: number | null;
  readonly retryable: boolean;
  readonly code: string;
  readonly attempts: InboxLlmAttemptTelemetry[];

  constructor(input: {
    message: string;
    statusCode?: number | null;
    retryable: boolean;
    code: string;
    attempts?: InboxLlmAttemptTelemetry[];
  }) {
    super(input.message);
    this.name = "InboxLlmRequestError";
    this.statusCode = input.statusCode ?? null;
    this.retryable = input.retryable;
    this.code = input.code;
    this.attempts = input.attempts ?? [];
  }
}

const inboxLlmExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "ambiguitySignals",
    "entities",
    "relations",
    "questions",
    "constraints",
    "intents",
    "hypotheses",
  ],
  properties: {
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 1000,
    },
    ambiguitySignals: {
      type: "array",
      maxItems: 6,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 160,
      },
    },
    entities: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "label",
          "entityType",
          "fragmentOrdinals",
          "confidence",
          "evidence",
        ],
        properties: {
          label: {
            type: "string",
            minLength: 1,
            maxLength: 280,
          },
          entityType: {
            type: "string",
            enum: ["concept", "state", "belief", "trigger", "fact", "person", "custom"],
          },
          fragmentOrdinals: {
            type: "array",
            maxItems: 8,
            items: {
              type: "integer",
              minimum: 0,
            },
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          evidence: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
        },
      },
    },
    relations: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "sourceLabel",
          "targetLabel",
          "relationType",
          "fragmentOrdinals",
          "confidence",
          "evidence",
        ],
        properties: {
          sourceLabel: {
            type: "string",
            minLength: 1,
            maxLength: 280,
          },
          targetLabel: {
            type: "string",
            minLength: 1,
            maxLength: 280,
          },
          relationType: {
            type: "string",
            enum: [
              "causes",
              "strengthens",
              "weakens",
              "explains",
              "contradicts",
              "related_to",
            ],
          },
          fragmentOrdinals: {
            type: "array",
            maxItems: 8,
            items: {
              type: "integer",
              minimum: 0,
            },
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          evidence: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
        },
      },
    },
    questions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "confidence", "fragmentOrdinals"],
        properties: {
          question: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          fragmentOrdinals: {
            type: "array",
            maxItems: 8,
            items: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
    },
    constraints: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["constraint", "confidence", "fragmentOrdinals"],
        properties: {
          constraint: {
            type: "string",
            minLength: 1,
            maxLength: 500,
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          fragmentOrdinals: {
            type: "array",
            maxItems: 8,
            items: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
    },
    intents: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "confidence", "fragmentOrdinals"],
        properties: {
          label: {
            type: "string",
            minLength: 1,
            maxLength: 280,
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          fragmentOrdinals: {
            type: "array",
            maxItems: 8,
            items: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
    },
    hypotheses: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "rank",
          "hypothesisType",
          "summary",
          "fragmentOrdinals",
          "confidence",
          "explanation",
        ],
        properties: {
          rank: {
            type: "integer",
            enum: [1, 2, 3],
          },
          hypothesisType: {
            type: "string",
            enum: [
              "interpretation",
              "candidate_structure",
              "relation_cluster",
              "actionable_summary",
            ],
          },
          summary: {
            type: "string",
            minLength: 1,
            maxLength: 1000,
          },
          fragmentOrdinals: {
            type: "array",
            maxItems: 8,
            items: {
              type: "integer",
              minimum: 0,
            },
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          explanation: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
          },
        },
      },
    },
  },
} as const;

function getOpenAiModelName() {
  return env.INBOX_LLM_MODEL?.trim() || defaultInboxLlmModel;
}

function getInboxLlmTimeoutMs() {
  return env.INBOX_LLM_TIMEOUT_MS ?? 12000;
}

function getInboxLlmMaxRetries() {
  return env.INBOX_LLM_MAX_RETRIES ?? 2;
}

function getInboxLlmRetryBaseDelayMs() {
  return env.INBOX_LLM_RETRY_BASE_DELAY_MS ?? 400;
}

function shouldUseInboxLlm() {
  return env.INBOX_LLM_ENABLED !== "false" && Boolean(env.OPENAI_API_KEY);
}

export function getConfiguredInboxInterpretRuntime(): InboxInterpretAttemptRuntime {
  if (shouldUseInboxLlm()) {
    return {
      provider: "openai",
      modelName: getOpenAiModelName(),
      promptVersion: openAiInterpretPromptVersion,
    };
  }

  return {
    provider: "deterministic",
    modelName: "deterministic-parser",
    promptVersion: deterministicInterpretPromptVersion,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatusCode(statusCode: number) {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function toInboxLlmFailureMessage(input: {
  payload?: OpenAiResponsesApiResponse | null;
  fallback: string;
}) {
  return input.payload?.error?.message?.trim() || input.fallback;
}

function buildRetryDelayMs(attempt: number) {
  return getInboxLlmRetryBaseDelayMs() * 2 ** Math.max(0, attempt - 1);
}

function normalizeInboxLlmError(
  error: unknown,
  attempts: InboxLlmAttemptTelemetry[]
): InboxLlmRequestError {
  if (error instanceof InboxLlmRequestError) {
    const nextAttempts = attempts.length > 0 ? attempts : error.attempts;
    return new InboxLlmRequestError({
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      code: error.code,
      attempts: nextAttempts,
    });
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return new InboxLlmRequestError({
      message: "OpenAI Inbox extraction timed out.",
      retryable: true,
      code: "timeout",
      attempts,
    });
  }

  if (error instanceof Error) {
    return new InboxLlmRequestError({
      message: error.message,
      retryable: false,
      code: "unknown_error",
      attempts,
    });
  }

  return new InboxLlmRequestError({
    message: "Unknown OpenAI Inbox extraction failure.",
    retryable: false,
    code: "unknown_error",
    attempts,
  });
}

function uniqueOrdinals(ordinals: number[], allowedOrdinals: Set<number>) {
  return Array.from(new Set(ordinals))
    .filter((ordinal) => allowedOrdinals.has(ordinal))
    .sort((left, right) => left - right)
    .slice(0, 8);
}

function uniqueByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAtomsFromInterpretation(interpretation: InterpretOutput) {
  return [
    ...interpretation.entities.map((entity) =>
      inboxAtomCandidateSchema.parse({
        atomType: "entity",
        canonicalValue: entity.label,
        payload: entity.payload,
        confidence: entity.confidence,
      })
    ),
    ...interpretation.relations.map((relation) =>
      inboxAtomCandidateSchema.parse({
        atomType: "relation",
        canonicalValue: `${relation.sourceLabel}:${relation.relationType}:${relation.targetLabel}`,
        payload: relation.payload,
        confidence: relation.confidence,
      })
    ),
    ...interpretation.questions.map((question) =>
      inboxAtomCandidateSchema.parse({
        atomType: "question",
        canonicalValue: question.question,
        payload: {},
        confidence: question.confidence,
      })
    ),
    ...interpretation.constraints.map((constraint) =>
      inboxAtomCandidateSchema.parse({
        atomType: "constraint",
        canonicalValue: constraint.constraint,
        payload: {},
        confidence: constraint.confidence,
      })
    ),
    ...interpretation.intents.map((intent) =>
      inboxAtomCandidateSchema.parse({
        atomType: "intent",
        canonicalValue: intent.label,
        payload: {},
        confidence: intent.confidence,
      })
    ),
  ];
}

function mapLlmExtractionToInterpretation(
  extraction: InboxLlmExtraction,
  fragments: InboxFragmentCandidate[],
  clarificationContext: InboxClarificationContextEntry[]
) {
  const allowedOrdinals = new Set(fragments.map((fragment) => fragment.ordinal));
  const answeredQuestionSet = new Set(
    clarificationContext.map((entry) => entry.question.toLowerCase().trim())
  );

  const entities = uniqueByKey(
    extraction.entities.map((entity) =>
      inboxInterpreterEntitySchema.parse({
        label: entity.label,
        entityType: entity.entityType,
        fragmentOrdinals: uniqueOrdinals(entity.fragmentOrdinals, allowedOrdinals),
        confidence: entity.confidence,
        payload: {
          evidence: entity.evidence,
          inferredFrom: "openai_structured_output",
        },
      })
    ),
    (entity) => entity.label.toLowerCase()
  ).slice(0, 16);

  const relations = uniqueByKey(
    extraction.relations
      .filter((relation) => relation.sourceLabel !== relation.targetLabel)
      .map((relation) =>
        inboxInterpreterRelationSchema.parse({
          sourceLabel: relation.sourceLabel,
          targetLabel: relation.targetLabel,
          relationType: relation.relationType,
          fragmentOrdinals: uniqueOrdinals(relation.fragmentOrdinals, allowedOrdinals),
          confidence: relation.confidence,
          payload: {
            evidence: relation.evidence,
            inferredFrom: "openai_structured_output",
          },
        })
      ),
    (relation) =>
      `${relation.sourceLabel.toLowerCase()}:${relation.relationType}:${relation.targetLabel.toLowerCase()}`
  ).slice(0, 16);

  const questions = uniqueByKey(
    extraction.questions
      .map((question) =>
        inboxQuestionSchema.parse({
          question: question.question,
          confidence: question.confidence,
        })
      )
      .filter(
        (question) => !answeredQuestionSet.has(question.question.toLowerCase().trim())
      ),
    (question) => question.question.toLowerCase()
  ).slice(0, 4);

  const constraints = uniqueByKey(
    extraction.constraints.map((constraint) =>
      inboxConstraintSchema.parse({
        constraint: constraint.constraint,
        confidence: constraint.confidence,
      })
    ),
    (constraint) => constraint.constraint.toLowerCase()
  ).slice(0, 4);

  const intents = uniqueByKey(
    extraction.intents.map((intent) =>
      inboxIntentSchema.parse({
        label: intent.label,
        confidence: intent.confidence,
      })
    ),
    (intent) => intent.label.toLowerCase()
  ).slice(0, 4);

  const hypothesesSource =
    extraction.hypotheses.length > 0
      ? extraction.hypotheses
      : [
          {
            rank: 1,
            hypothesisType: "interpretation" as const,
            summary: extraction.summary,
            fragmentOrdinals: fragments.slice(0, 3).map((fragment) => fragment.ordinal),
            confidence: 0.5,
            explanation:
              "The structured extraction produced enough signal to form a reviewable interpretation.",
          },
        ];

  const hypotheses = hypothesesSource
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .map((hypothesis, index) =>
      inboxHypothesisCandidateSchema.parse({
        rank: Math.min(3, index + 1),
        hypothesisType: hypothesis.hypothesisType,
        payload: {
          summary: hypothesis.summary,
          fragmentOrdinals: uniqueOrdinals(hypothesis.fragmentOrdinals, allowedOrdinals),
          ambiguitySignals: extraction.ambiguitySignals,
          clarificationAnswerCount: clarificationContext.length,
        },
        confidence: hypothesis.confidence,
        explanation: hypothesis.explanation,
      })
    );

  const interpretation = {
    hypotheses,
    entities,
    relations,
    intents,
    questions,
    constraints,
    atoms: [],
  } satisfies Omit<InterpretOutput, "atoms"> & { atoms: InterpretOutput["atoms"] };

  return {
    ...interpretation,
    atoms: buildAtomsFromInterpretation(interpretation),
  } satisfies InterpretOutput;
}

function buildInboxInterpretPrompt(input: ExtractInboxInterpretationInput) {
  return [
    "You are an extraction layer for Sorelo Inbox.",
    "Return only schema-valid JSON.",
    "Do not mutate canonical Concepts or Links.",
    "Use only evidence grounded in the provided fragments.",
    "Lower confidence when the signal is ambiguous or under-specified.",
    "Prefer empty arrays over invented structure.",
    "If a clarification would materially change the interpretation, include that question in questions.",
    "",
    "Target ontology:",
    "- entityType must be one of concept, state, belief, trigger, fact, person, custom.",
    "- relationType must be one of causes, strengthens, weakens, explains, contradicts, related_to.",
    "- hypothesisType must be one of interpretation, candidate_structure, relation_cluster, actionable_summary.",
    "",
    "Evidence rules:",
    "- fragmentOrdinals must reference the provided fragments only.",
    "- summary and explanation must stay concise and non-poetic.",
    "- Do not output hidden chain-of-thought.",
    "",
    "Input:",
    JSON.stringify({
      itemId: input.itemId,
      normalizedText: input.normalizedText,
      fragments: input.fragments.map((fragment) => ({
        ordinal: fragment.ordinal,
        fragmentType: fragment.fragmentType,
        sourceKind: fragment.sourceKind,
        fragmentText: fragment.fragmentText,
      })),
      clarificationContext: input.clarificationContext ?? [],
    }),
  ].join("\n");
}

async function requestOpenAiExtraction(
  input: ExtractInboxInterpretationInput
): Promise<{
  extraction: InboxLlmExtraction;
  apiResponse: OpenAiResponsesApiResponse;
  statusCode: number;
}> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModelName(),
      input: buildInboxInterpretPrompt(input),
      max_output_tokens: 2400,
      text: {
        format: {
          type: "json_schema",
          name: "sorelo_inbox_extraction",
          schema: inboxLlmExtractionJsonSchema,
          strict: true,
        },
      },
    }),
    signal: AbortSignal.timeout(getInboxLlmTimeoutMs()),
  });
  const payload = (await response.json()) as OpenAiResponsesApiResponse;

  if (!response.ok) {
    throw new InboxLlmRequestError({
      message: toInboxLlmFailureMessage({
        payload,
        fallback: "OpenAI Inbox extraction failed.",
      }),
      statusCode: response.status,
      retryable: isRetryableStatusCode(response.status),
      code: "http_error",
    });
  }

  if (typeof payload.output_text !== "string" || payload.output_text.trim().length === 0) {
    throw new InboxLlmRequestError({
      message: "OpenAI Inbox extraction returned no structured output.",
      statusCode: response.status,
      retryable: false,
      code: "empty_output",
    });
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(payload.output_text);
  } catch {
    throw new InboxLlmRequestError({
      message: "OpenAI Inbox extraction returned invalid JSON.",
      statusCode: response.status,
      retryable: false,
      code: "invalid_json",
    });
  }

  const parsed = inboxLlmExtractionSchema.parse(parsedJson);

  return {
    extraction: parsed,
    apiResponse: payload,
    statusCode: response.status,
  };
}

async function requestOpenAiExtractionWithRetry(
  input: ExtractInboxInterpretationInput
): Promise<InboxLlmRequestResult> {
  const attempts: InboxLlmAttemptTelemetry[] = [];
  const maxRetries = getInboxLlmMaxRetries();

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const startedAt = Date.now();

    try {
      const result = await requestOpenAiExtraction(input);
      attempts.push({
        attempt,
        latencyMs: Math.max(0, Date.now() - startedAt),
        statusCode: result.statusCode,
        retryable: false,
        errorCode: null,
        errorMessage: null,
      });

      return {
        extraction: result.extraction,
        apiResponse: result.apiResponse,
        attempts,
      };
    } catch (error) {
      const normalizedError = normalizeInboxLlmError(error, attempts);
      attempts.push({
        attempt,
        latencyMs: Math.max(0, Date.now() - startedAt),
        statusCode: normalizedError.statusCode,
        retryable: normalizedError.retryable,
        errorCode: normalizedError.code,
        errorMessage: normalizedError.message,
      });

      const canRetry = normalizedError.retryable && attempt <= maxRetries;
      if (!canRetry) {
        throw new InboxLlmRequestError({
          message: normalizedError.message,
          statusCode: normalizedError.statusCode,
          retryable: normalizedError.retryable,
          code: normalizedError.code,
          attempts,
        });
      }

      await sleep(buildRetryDelayMs(attempt));
    }
  }

  throw new InboxLlmRequestError({
    message: "OpenAI Inbox extraction exhausted retries without a terminal response.",
    retryable: false,
    code: "retry_exhausted",
    attempts,
  });
}

function buildDeterministicInterpretation(
  input: ExtractInboxInterpretationInput,
  fallbackReason?: string
): ExtractInboxInterpretationResult {
  const interpretation = interpretInboxText(input.normalizedText, input.fragments, {
    ...(input.clarificationContext === undefined
      ? {}
      : { clarificationContext: input.clarificationContext }),
  });

  return {
    interpretation,
    runtime: {
      provider: "deterministic",
      modelName: "deterministic-parser",
      promptVersion: deterministicInterpretPromptVersion,
      fallbackUsed: Boolean(fallbackReason),
      metadata: {
        executionMode: fallbackReason
          ? "deterministic_fallback_after_llm_error"
          : "deterministic_only",
        fallbackReason: fallbackReason ?? null,
      },
    },
  };
}

function withFallbackAttempts(
  runtime: ExtractInboxInterpretationResult,
  error: InboxLlmRequestError
) {
  return {
    ...runtime,
    runtime: {
      ...runtime.runtime,
      metadata: {
        ...runtime.runtime.metadata,
        configuredModel: getOpenAiModelName(),
        timeoutMs: getInboxLlmTimeoutMs(),
        attemptCount: error.attempts.length,
        retryCount: Math.max(0, error.attempts.length - 1),
        attempts: error.attempts,
        failureCode: error.code,
        failureStatusCode: error.statusCode,
      },
    },
  };
}

export async function extractInboxInterpretation(
  input: ExtractInboxInterpretationInput
): Promise<ExtractInboxInterpretationResult> {
  const clarificationContext = input.clarificationContext ?? [];

  if (!shouldUseInboxLlm()) {
    return buildDeterministicInterpretation(
      {
        ...input,
        clarificationContext,
      },
      undefined
    );
  }

  try {
    const { extraction, apiResponse, attempts } = await requestOpenAiExtractionWithRetry({
      ...input,
      clarificationContext,
    });
    const interpretation = mapLlmExtractionToInterpretation(
      extraction,
      input.fragments,
      clarificationContext
    );

    return {
      interpretation,
      runtime: {
        provider: "openai",
        modelName: apiResponse.model ?? getOpenAiModelName(),
        promptVersion: openAiInterpretPromptVersion,
        fallbackUsed: false,
        metadata: {
          executionMode: "openai_structured_output",
          configuredModel: getOpenAiModelName(),
          timeoutMs: getInboxLlmTimeoutMs(),
          attemptCount: attempts.length,
          retryCount: Math.max(0, attempts.length - 1),
          attempts,
          responseId: apiResponse.id ?? null,
          usage: apiResponse.usage ?? null,
          ambiguitySignalCount: extraction.ambiguitySignals.length,
        },
      },
    };
  } catch (error) {
    const normalizedError = normalizeInboxLlmError(error, []);
    return withFallbackAttempts(
      buildDeterministicInterpretation(
        {
          ...input,
          clarificationContext,
        },
        normalizedError.message
      ),
      normalizedError
    );
  }
}
