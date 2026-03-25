import { afterEach, describe, expect, it, vi } from "vitest";

import { segmentInboxText } from "@/features/inbox/engine";

const inboxEnvKeys = [
  "OPENAI_API_KEY",
  "INBOX_LLM_ENABLED",
  "INBOX_LLM_MODEL",
  "INBOX_LLM_TIMEOUT_MS",
  "INBOX_LLM_MAX_RETRIES",
  "INBOX_LLM_RETRY_BASE_DELAY_MS",
] as const;

const originalEnv = Object.fromEntries(
  inboxEnvKeys.map((key) => [key, process.env[key]])
) as Record<(typeof inboxEnvKeys)[number], string | undefined>;

function restoreInboxEnv() {
  for (const key of inboxEnvKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

afterEach(() => {
  restoreInboxEnv();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("inbox llm extractor", () => {
  it("uses the deterministic interpreter when the Inbox LLM is disabled", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.INBOX_LLM_ENABLED;

    const { extractInboxInterpretation, getConfiguredInboxInterpretRuntime } =
      await import("@/features/inbox/llm-extractor");
    const fragments = segmentInboxText(
      "Fear of criticism causes withdrawal. What exactly triggers the reaction first?"
    ).fragments;

    const result = await extractInboxInterpretation({
      itemId: "11111111-1111-4111-8111-111111111111",
      normalizedText:
        "Fear of criticism causes withdrawal. What exactly triggers the reaction first?",
      fragments,
      clarificationContext: [],
    });

    expect(getConfiguredInboxInterpretRuntime()).toEqual({
      provider: "deterministic",
      modelName: "deterministic-parser",
      promptVersion: "inbox-interpret.deterministic.v1",
    });
    expect(result.runtime.provider).toBe("deterministic");
    expect(result.runtime.fallbackUsed).toBe(false);
    expect(result.runtime.metadata.executionMode).toBe("deterministic_only");
    expect(result.interpretation.questions.length).toBeGreaterThan(0);
  });

  it("uses OpenAI structured output when the Inbox LLM is enabled", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.INBOX_LLM_ENABLED = "true";
    process.env.INBOX_LLM_MODEL = "gpt-5-mini";
    process.env.INBOX_LLM_MAX_RETRIES = "2";
    process.env.INBOX_LLM_RETRY_BASE_DELAY_MS = "1";

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "resp_123",
          model: "gpt-5-mini",
          output_text: JSON.stringify({
            summary:
              "Public criticism from a close partner appears to trigger withdrawal.",
            ambiguitySignals: ["actor identity is partial"],
            entities: [
              {
                label: "public criticism from a close partner",
                entityType: "trigger",
                fragmentOrdinals: [0],
                confidence: 0.84,
                evidence: "Public criticism from a close partner",
              },
              {
                label: "withdrawal",
                entityType: "state",
                fragmentOrdinals: [0],
                confidence: 0.8,
                evidence: "withdrawal",
              },
            ],
            relations: [
              {
                sourceLabel: "public criticism from a close partner",
                targetLabel: "withdrawal",
                relationType: "causes",
                fragmentOrdinals: [0],
                confidence: 0.82,
                evidence: "causes withdrawal",
              },
            ],
            questions: [
              {
                question: "Who is the close partner in this context?",
                confidence: 0.63,
                fragmentOrdinals: [0],
              },
            ],
            constraints: [],
            intents: [],
            hypotheses: [
              {
                rank: 1,
                hypothesisType: "interpretation",
                summary:
                  "Public criticism from a close partner appears to trigger withdrawal.",
                fragmentOrdinals: [0],
                confidence: 0.81,
                explanation:
                  "The trigger and reaction are explicit enough to form a reviewable interpretation.",
              },
            ],
          }),
          usage: {
            input_tokens: 120,
            output_tokens: 180,
            total_tokens: 300,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const { extractInboxInterpretation, getConfiguredInboxInterpretRuntime } =
      await import("@/features/inbox/llm-extractor");
    const fragments = segmentInboxText(
      "Public criticism from a close partner causes withdrawal."
    ).fragments;

    const result = await extractInboxInterpretation({
      itemId: "11111111-1111-4111-8111-111111111111",
      normalizedText: "Public criticism from a close partner causes withdrawal.",
      fragments,
      clarificationContext: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getConfiguredInboxInterpretRuntime()).toEqual({
      provider: "openai",
      modelName: "gpt-5-mini",
      promptVersion: "inbox-interpret.openai.v1",
    });
    expect(result.runtime.provider).toBe("openai");
    expect(result.runtime.fallbackUsed).toBe(false);
    expect(result.runtime.metadata.executionMode).toBe("openai_structured_output");
    expect(result.runtime.metadata.attemptCount).toBe(1);
    expect(result.runtime.metadata.retryCount).toBe(0);
    expect(result.interpretation.entities.map((entity) => entity.label)).toContain(
      "withdrawal"
    );
    expect(result.interpretation.relations[0]?.relationType).toBe("causes");
    expect(result.interpretation.atoms.some((atom) => atom.atomType === "relation")).toBe(
      true
    );
  });

  it("falls back to the deterministic interpreter after an OpenAI failure", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.INBOX_LLM_ENABLED = "true";
    process.env.INBOX_LLM_MODEL = "gpt-5-mini";
    process.env.INBOX_LLM_MAX_RETRIES = "2";
    process.env.INBOX_LLM_RETRY_BASE_DELAY_MS = "1";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "Upstream timeout",
            },
          }),
          {
            status: 504,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      )
    );

    const { extractInboxInterpretation } = await import("@/features/inbox/llm-extractor");
    const fragments = segmentInboxText(
      "Fear of criticism causes withdrawal. What exactly triggers the reaction first?"
    ).fragments;

    const result = await extractInboxInterpretation({
      itemId: "11111111-1111-4111-8111-111111111111",
      normalizedText:
        "Fear of criticism causes withdrawal. What exactly triggers the reaction first?",
      fragments,
      clarificationContext: [],
    });

    expect(result.runtime.provider).toBe("deterministic");
    expect(result.runtime.fallbackUsed).toBe(true);
    expect(result.runtime.metadata.executionMode).toBe(
      "deterministic_fallback_after_llm_error"
    );
    expect(result.runtime.metadata.fallbackReason).toBe("Upstream timeout");
    expect(result.runtime.metadata.attemptCount).toBe(3);
    expect(result.runtime.metadata.retryCount).toBe(2);
    expect(result.interpretation.questions.length).toBeGreaterThan(0);
  });

  it("retries transient OpenAI failures before succeeding", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.INBOX_LLM_ENABLED = "true";
    process.env.INBOX_LLM_MODEL = "gpt-5-mini";
    process.env.INBOX_LLM_MAX_RETRIES = "2";
    process.env.INBOX_LLM_RETRY_BASE_DELAY_MS = "1";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: "Rate limit",
            },
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "resp_retry_success",
            model: "gpt-5-mini",
            output_text: JSON.stringify({
              summary: "Fear of criticism appears to trigger withdrawal.",
              ambiguitySignals: [],
              entities: [
                {
                  label: "fear of criticism",
                  entityType: "trigger",
                  fragmentOrdinals: [0],
                  confidence: 0.77,
                  evidence: "Fear of criticism",
                },
                {
                  label: "withdrawal",
                  entityType: "state",
                  fragmentOrdinals: [0],
                  confidence: 0.79,
                  evidence: "withdrawal",
                },
              ],
              relations: [
                {
                  sourceLabel: "fear of criticism",
                  targetLabel: "withdrawal",
                  relationType: "causes",
                  fragmentOrdinals: [0],
                  confidence: 0.78,
                  evidence: "causes withdrawal",
                },
              ],
              questions: [],
              constraints: [],
              intents: [],
              hypotheses: [
                {
                  rank: 1,
                  hypothesisType: "interpretation",
                  summary: "Fear of criticism appears to trigger withdrawal.",
                  fragmentOrdinals: [0],
                  confidence: 0.75,
                  explanation:
                    "The trigger and state are explicit enough for a reviewable interpretation.",
                },
              ],
            }),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const { extractInboxInterpretation } = await import("@/features/inbox/llm-extractor");
    const fragments = segmentInboxText("Fear of criticism causes withdrawal.").fragments;

    const result = await extractInboxInterpretation({
      itemId: "11111111-1111-4111-8111-111111111111",
      normalizedText: "Fear of criticism causes withdrawal.",
      fragments,
      clarificationContext: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.runtime.provider).toBe("openai");
    expect(result.runtime.metadata.attemptCount).toBe(2);
    expect(result.runtime.metadata.retryCount).toBe(1);
    expect(
      Array.isArray(result.runtime.metadata.attempts) &&
        (result.runtime.metadata.attempts as Array<{ statusCode: number | null }>)[0]
          ?.statusCode
    ).toBe(429);
  });
});
