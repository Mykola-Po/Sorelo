import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  learningCanonicalMutationEvidence,
  learningCanonicalMutationProvenance,
} from "@/shared/db/schema";

const { mockDb, tableResults } = vi.hoisted(() => {
  const hoistedTableResults = new Map<unknown, unknown[]>();
  const hoistedMockDb = {
    select: vi.fn(() => ({
      from(table: unknown) {
        const rows = hoistedTableResults.get(table) ?? [];
        const whereResult = Promise.resolve(rows) as Promise<unknown[]> & {
          limit: (count?: number) => Promise<unknown[]>;
          orderBy: () => Promise<unknown[]>;
        };
        const orderedResult = Promise.resolve(rows) as Promise<unknown[]> & {
          limit: (count?: number) => Promise<unknown[]>;
        };

        whereResult.limit = async (count = 1) => rows.slice(0, count);
        orderedResult.limit = async (count = 1) => rows.slice(0, count);
        whereResult.orderBy = () => orderedResult;

        const chain = {
          innerJoin() {
            return chain;
          },
          leftJoin() {
            return chain;
          },
          where() {
            return whereResult;
          },
          orderBy() {
            return orderedResult;
          },
          limit: async (count = 1) => rows.slice(0, count),
        };

        return chain;
      },
    })),
  };

  return {
    mockDb: hoistedMockDb,
    tableResults: hoistedTableResults,
  };
});

vi.mock("@/shared/db/client", () => ({
  db: mockDb,
}));

import { getLatestCanonicalMutationProvenanceForEntity } from "@/features/learning/queries";

describe("learning provenance queries", () => {
  beforeEach(() => {
    tableResults.clear();
    mockDb.select.mockClear();
  });

  it("returns the latest canonical provenance with stable evidence and clarification answer text", async () => {
    const suggestionId = "11111111-1111-4111-8111-111111111111";
    const resolutionId = "22222222-2222-4222-8222-222222222222";
    const provenanceId = "33333333-3333-4333-8333-333333333333";
    const inboxItemId = "44444444-4444-4444-8444-444444444444";
    const answerId = "55555555-5555-4555-8555-555555555555";
    const createdAt = new Date("2026-03-22T12:00:00.000Z");

    tableResults.set(learningCanonicalMutationProvenance, [
      {
        provenance: {
          id: provenanceId,
          workspaceId: "66666666-6666-4666-8666-666666666666",
          mapId: "77777777-7777-4777-8777-777777777777",
          mapVersionId: "88888888-8888-4888-8888-888888888888",
          entityType: "concept",
          entityId: "99999999-9999-4999-8999-999999999999",
          mutationType: "update_concept",
          originSuggestionId: suggestionId,
          reviewResolutionId: resolutionId,
          inboxItemId,
          inboxPacketId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          appliedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          createdAt,
        },
        suggestion: {
          id: suggestionId,
          batchId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          workspaceId: "66666666-6666-4666-8666-666666666666",
          mapId: "77777777-7777-4777-8777-777777777777",
          inboxItemId,
          inboxPacketId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          sourceFragmentId: null,
          artifactOrder: 1,
          suggestionType: "update_concept",
          targetEntityType: "concept",
          targetEntityId: "99999999-9999-4999-8999-999999999999",
          proposedPayload: {},
          rationale: "The clarification changed the meaning.",
          confidence: 0.82,
          createdAt,
        },
        resolution: {
          id: resolutionId,
          suggestionId,
          workspaceId: "66666666-6666-4666-8666-666666666666",
          mapId: "77777777-7777-4777-8777-777777777777",
          actorUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          resolutionType: "edited",
          beforePayload: {},
          afterPayload: {},
          applyStatus: "applied",
          appliedAt: createdAt,
          applyOutcome: {},
          applyError: null,
          reasonText: "Clarified the trigger source.",
          latencyMs: 1234,
          resolvedAt: createdAt,
        },
        inboxItem: {
          id: inboxItemId,
          rawText: "Public criticism causes withdrawal.",
          status: "applied",
          createdAt,
        },
      },
    ]);

    tableResults.set(learningCanonicalMutationEvidence, [
      {
        evidence: {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          provenanceId,
          inboxFragmentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          clarificationAnswerId: null,
          evidenceOrder: 0,
          fragmentOrdinal: 0,
        },
        fragment: {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          fragmentText: "Public criticism causes withdrawal.",
          sourceKind: "item_raw",
        },
        clarificationAnswer: null,
      },
      {
        evidence: {
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          provenanceId,
          inboxFragmentId: "12121212-1212-4121-8121-121212121212",
          clarificationAnswerId: answerId,
          evidenceOrder: 1,
          fragmentOrdinal: 2,
        },
        fragment: {
          id: "12121212-1212-4121-8121-121212121212",
          fragmentText:
            "The reaction starts when criticism comes from a close partner in public.",
          sourceKind: "clarification_answer",
        },
        clarificationAnswer: {
          id: answerId,
          answerText:
            "It starts when criticism comes from a close partner in public.",
        },
      },
    ]);

    const result = await getLatestCanonicalMutationProvenanceForEntity(
      "66666666-6666-4666-8666-666666666666",
      "77777777-7777-4777-8777-777777777777",
      "concept",
      "99999999-9999-4999-8999-999999999999"
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe(provenanceId);
    expect(result?.mutationType).toBe("update_concept");
    expect(result?.resolution.reasonText).toBe("Clarified the trigger source.");
    expect(result?.evidence.map((evidence) => evidence.fragmentOrdinal)).toEqual([
      0,
      2,
    ]);
    expect(result?.evidence[1]).toEqual(
      expect.objectContaining({
        sourceKind: "clarification_answer",
        clarificationAnswerId: answerId,
        clarificationAnswerText:
          "It starts when criticism comes from a close partner in public.",
      })
    );
  });
});
