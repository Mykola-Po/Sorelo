import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertInternalLearningRequestMock,
  isLearningCommandErrorMock,
  parseInternalJsonMock,
  resolveSuggestionCommandMock,
} = vi.hoisted(() => ({
  assertInternalLearningRequestMock: vi.fn(),
  isLearningCommandErrorMock: vi.fn(),
  parseInternalJsonMock: vi.fn(),
  resolveSuggestionCommandMock: vi.fn(),
}));

vi.mock("@/features/learning/commands", () => ({
  isLearningCommandError: isLearningCommandErrorMock,
  resolveSuggestionCommand: resolveSuggestionCommandMock,
}));

vi.mock("@/features/learning/internal-api", () => ({
  assertInternalLearningRequest: assertInternalLearningRequestMock,
  parseInternalJson: parseInternalJsonMock,
}));

import { POST } from "../../../../../../app/api/internal/learning/resolutions/route";

describe("internal learning resolutions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertInternalLearningRequestMock.mockReturnValue(null);
    parseInternalJsonMock.mockResolvedValue({
      success: true,
      data: {
        suggestionId: "11111111-1111-4111-8111-111111111111",
        workspaceId: "22222222-2222-4222-8222-222222222222",
        actorUserId: "33333333-3333-4333-8333-333333333333",
        resolutionType: "accepted",
      },
    });
  });

  it("returns structured 409 responses for learning command conflicts", async () => {
    const conflictError = {
      name: "LearningCommandError",
      statusCode: 409,
      code: "learning_suggestion_resolution_conflict",
      message: "Suggestion already has a terminal resolution.",
    };

    resolveSuggestionCommandMock.mockRejectedValue(conflictError);
    isLearningCommandErrorMock.mockReturnValue(true);

    const response = await POST(
      new Request("http://localhost/api/internal/learning/resolutions", {
        method: "POST",
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "learning_suggestion_resolution_conflict",
      error: "Suggestion already has a terminal resolution.",
    });
  });

  it("returns 500 for unexpected resolution failures", async () => {
    resolveSuggestionCommandMock.mockRejectedValue(
      new Error("Unexpected resolution failure.")
    );
    isLearningCommandErrorMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/internal/learning/resolutions", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unexpected resolution failure.",
    });
  });
});
