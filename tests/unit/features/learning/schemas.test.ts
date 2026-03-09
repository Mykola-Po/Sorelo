import { describe, expect, it } from "vitest";

import {
  attachSuggestionOriginInputSchema,
  createSuggestionsInputSchema,
  sourceFragmentInputSchema,
  suggestionBatchInputSchema,
  suggestionResolutionInputSchema,
} from "@/features/learning/schemas";

describe("learning schemas", () => {
  it("parses a valid source fragment input", () => {
    const parsed = sourceFragmentInputSchema.parse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      mapId: "22222222-2222-4222-8222-222222222222",
      authorUserId: "33333333-3333-4333-8333-333333333333",
      sourceType: "manual_note",
      rawText: "Observed a strong avoidance response.",
      metadata: {
        channel: "manual",
      },
    });

    expect(parsed.sourceType).toBe("manual_note");
    expect(parsed.rawText).toContain("avoidance");
  });

  it("rejects an empty suggestion list", () => {
    expect(() =>
      createSuggestionsInputSchema.parse({
        suggestions: [],
      })
    ).toThrow();
  });

  it("parses a suggestion batch payload", () => {
    const parsed = suggestionBatchInputSchema.parse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      batchType: "extract",
      modelName: "manual-ingestion",
      modelVersion: "v1",
      promptVersion: "v1",
      inputHash: "abc12345",
    });

    expect(parsed.status).toBeUndefined();
  });

  it("parses a resolution payload", () => {
    const parsed = suggestionResolutionInputSchema.parse({
      suggestionId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      actorUserId: "33333333-3333-4333-8333-333333333333",
      resolutionType: "accepted",
      afterPayload: {
        title: "Avoidance loop",
      },
    });

    expect(parsed.resolutionType).toBe("accepted");
  });

  it("requires originSuggestionId for ai_suggested provenance", () => {
    expect(() =>
      attachSuggestionOriginInputSchema.parse({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        entityType: "concept",
        entityId: "22222222-2222-4222-8222-222222222222",
        originType: "ai_suggested",
      })
    ).toThrow();
  });
});
