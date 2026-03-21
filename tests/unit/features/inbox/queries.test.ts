import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  inboxAtoms,
  inboxClarificationAnswers,
  inboxClarificationRequests,
  inboxFragments,
  inboxHypotheses,
  inboxItems,
  inboxMergeCandidates,
  inboxStructuredPackets,
  inboxWorkflowEvents,
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

        whereResult.limit = async (count = 1) => rows.slice(0, count);
        whereResult.orderBy = async () => rows;

        return {
          where() {
            return whereResult;
          },
          orderBy: async () => rows,
          limit: async (count = 1) => rows.slice(0, count),
        };
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

import {
  getInboxClarificationRequestForUserQuery,
  getInboxItemDetailForUserQuery,
  getInboxItemDetailQuery,
  getInboxItemForUserQuery,
  listInboxItemsForUserQuery,
} from "@/features/inbox/queries";

function createItemRow(input: {
  id: string;
  userId: string;
  rawText?: string;
  normalizedText?: string | null;
  status?: string;
  route?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: input.id,
    userId: input.userId,
    sourceType: "manual_note",
    sourceRef: null,
    rawText: input.rawText ?? `raw-${input.id}`,
    normalizedText: input.normalizedText ?? null,
    language: "en",
    status: input.status ?? "received",
    score: null,
    confidence: null,
    ambiguity: null,
    risk: null,
    route: input.route ?? null,
    idempotencyKey: `key-${input.id}`,
    createdAt: input.createdAt ?? new Date("2026-03-20T10:00:00.000Z"),
    updatedAt: input.updatedAt ?? new Date("2026-03-20T10:00:00.000Z"),
  };
}

describe("inbox queries", () => {
  beforeEach(() => {
    tableResults.clear();
    mockDb.select.mockClear();
  });

  it("returns clarification history and fragment provenance in the item detail", async () => {
    const itemId = "11111111-1111-4111-8111-111111111111";
    const requestId = "22222222-2222-4222-8222-222222222222";
    const answerId = "33333333-3333-4333-8333-333333333333";
    const now = new Date("2026-03-19T10:00:00.000Z");

    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId: "44444444-4444-4444-8444-444444444444",
        rawText: "Public criticism causes withdrawal.",
        normalizedText: "Public criticism causes withdrawal.",
        status: "parked",
        route: "park",
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    tableResults.set(inboxFragments, [
      {
        id: "55555555-5555-4555-8555-555555555555",
        itemId,
        ordinal: 0,
        fragmentText: "Public criticism causes withdrawal.",
        fragmentType: "statement",
        sourceKind: "item_raw",
        clarificationAnswerId: null,
        spanStart: 0,
        spanEnd: 35,
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        itemId,
        ordinal: 1,
        fragmentText:
          "It starts when the criticism comes from a close partner in public.",
        fragmentType: "statement",
        sourceKind: "clarification_answer",
        clarificationAnswerId: answerId,
        spanStart: null,
        spanEnd: null,
      },
    ]);
    tableResults.set(inboxHypotheses, []);
    tableResults.set(inboxAtoms, []);
    tableResults.set(inboxStructuredPackets, []);
    tableResults.set(inboxMergeCandidates, []);
    tableResults.set(inboxClarificationRequests, [
      {
        id: requestId,
        itemId,
        question: "What exactly triggers the reaction first?",
        reason: "The missing trigger detail changes the route.",
        status: "answered",
        answeredAt: now,
      },
    ]);
    tableResults.set(inboxClarificationAnswers, [
      {
        id: answerId,
        requestId,
        answerText:
          "It starts when the criticism comes from a close partner in public.",
        createdAt: now,
      },
    ]);
    tableResults.set(inboxWorkflowEvents, [
      {
        id: "77777777-7777-4777-8777-777777777777",
        itemId,
        eventType: "item.clarification_answered",
        stepName: "answer_clarification",
        status: "completed",
        payload: { requestId, answerId },
        attemptNo: 2,
        createdAt: now,
      },
    ]);

    const detail = await getInboxItemDetailQuery(itemId);

    expect(detail).not.toBeNull();
    expect(detail?.clarificationRequests[0]?.status).toBe("answered");
    expect(detail?.clarificationAnswers[0]?.answerText).toContain(
      "close partner"
    );
    expect(detail?.fragments.map((fragment) => fragment.sourceKind)).toEqual([
      "item_raw",
      "clarification_answer",
    ]);
    expect(detail?.fragments[1]?.clarificationAnswerId).toBe(answerId);
  });

  it("lists only the current user's items in newest-first order", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const olderCreatedAt = new Date("2026-03-20T10:00:00.000Z");
    const newerCreatedAt = new Date("2026-03-20T11:00:00.000Z");
    const newestUpdatedAt = new Date("2026-03-20T13:00:00.000Z");

    tableResults.set(inboxItems, [
      createItemRow({
        id: "11111111-1111-4111-8111-111111111111",
        userId,
        createdAt: olderCreatedAt,
        updatedAt: olderCreatedAt,
      }),
      createItemRow({
        id: "22222222-2222-4222-8222-222222222222",
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        createdAt: newerCreatedAt,
        updatedAt: newestUpdatedAt,
      }),
      createItemRow({
        id: "33333333-3333-4333-8333-333333333333",
        userId,
        createdAt: newerCreatedAt,
        updatedAt: newestUpdatedAt,
      }),
    ]);

    const items = await listInboxItemsForUserQuery(userId);

    expect(items.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(items.every((item) => item.userId === userId)).toBe(true);
  });

  it("returns null when a foreign inbox item is requested", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "11111111-1111-4111-8111-111111111111";

    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ]);

    const item = await getInboxItemForUserQuery(userId, itemId);
    const detail = await getInboxItemDetailForUserQuery(userId, itemId);

    expect(item).toBeNull();
    expect(detail).toBeNull();
  });

  it("returns owned item detail when the selected item belongs to the user", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "11111111-1111-4111-8111-111111111111";

    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId,
        rawText: "Owned item",
      }),
    ]);
    tableResults.set(inboxFragments, []);
    tableResults.set(inboxHypotheses, []);
    tableResults.set(inboxAtoms, []);
    tableResults.set(inboxStructuredPackets, []);
    tableResults.set(inboxMergeCandidates, []);
    tableResults.set(inboxClarificationRequests, []);
    tableResults.set(inboxClarificationAnswers, []);
    tableResults.set(inboxWorkflowEvents, []);

    const detail = await getInboxItemDetailForUserQuery(userId, itemId);

    expect(detail?.item.id).toBe(itemId);
    expect(detail?.item.userId).toBe(userId);
  });

  it("rejects clarification requests that belong to another user", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "11111111-1111-4111-8111-111111111111";
    const requestId = "22222222-2222-4222-8222-222222222222";

    tableResults.set(inboxClarificationRequests, [
      {
        id: requestId,
        itemId,
        question: "What exactly triggers the reaction first?",
        reason: "Missing trigger detail.",
        status: "pending",
        answeredAt: null,
      },
    ]);
    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ]);

    const request = await getInboxClarificationRequestForUserQuery(
      userId,
      requestId
    );

    expect(request).toBeNull();
  });

  it("returns owned clarification requests with the parent user id", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "11111111-1111-4111-8111-111111111111";
    const requestId = "22222222-2222-4222-8222-222222222222";
    const answeredAt = new Date("2026-03-21T09:00:00.000Z");

    tableResults.set(inboxClarificationRequests, [
      {
        id: requestId,
        itemId,
        question: "What exactly triggers the reaction first?",
        reason: "Missing trigger detail.",
        status: "answered",
        answeredAt,
      },
    ]);
    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId,
      }),
    ]);

    const request = await getInboxClarificationRequestForUserQuery(
      userId,
      requestId
    );

    expect(request).toEqual({
      id: requestId,
      itemId,
      userId,
      question: "What exactly triggers the reaction first?",
      reason: "Missing trigger detail.",
      status: "answered",
      answeredAt,
    });
  });
});
