import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  inboxAtoms,
  inboxClarificationAnswers,
  inboxClarificationRequests,
  inboxFragments,
  inboxHypotheses,
  inboxItems,
  inboxMergeCandidates,
  inboxPipelineAttempts,
  inboxStructuredPackets,
  inboxStepRuns,
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
        const orderedResult = Promise.resolve(rows) as Promise<unknown[]> & {
          limit: (count?: number) => Promise<unknown[]>;
        };

        whereResult.limit = async (count = 1) => rows.slice(0, count);
        orderedResult.limit = async (count = 1) => rows.slice(0, count);
        whereResult.orderBy = () => orderedResult;

        const chain = {
          leftJoin() {
            return chain;
          },
          innerJoin() {
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

import {
  getInboxClarificationRequestForWorkspaceQuery,
  getInboxItemDetailForWorkspaceQuery,
  getInboxItemDetailQuery,
  getInboxItemForWorkspaceQuery,
  listInboxItemsForWorkspaceQuery,
} from "@/features/inbox/queries";

function createItemRow(input: {
  id: string;
  userId: string;
  workspaceId?: string;
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
    workspaceId:
      input.workspaceId ?? "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    mapId: null,
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

function createRoutingPolicyTrace() {
  return {
    policyVersion: "inbox-routing.v1",
    input: {
      rInbox: 0.81,
      confidence: 0.78,
      ambiguity: 0.18,
      risk: 0.12,
      isDuplicate: false,
      isEmptySignal: false,
      hasReusableSignal: true,
      expectedValueGain: 0.22,
      askCost: 0.32,
      gates: {
        discard: false,
        promote: true,
        clarify: false,
        park: true,
      },
    },
    requestedDecision: {
      ruleId: "promote.strong_signal_low_ambiguity",
      route: "promote",
      nextStatus: "ready_for_review",
      reason:
        "The signal is strong enough to emit a structured packet without forcing extra clarification.",
    },
    finalDecision: {
      ruleId: "override.promotion_scope_requires_target_map",
      route: "park",
      nextStatus: "parked",
      reason:
        "The signal is preserved for review because a target map is required before promote materialization.",
    },
    overrides: [
      {
        ruleId: "override.promotion_scope_requires_target_map",
        fromRoute: "promote",
        toRoute: "park",
        note: {
          id: "route.override.promotion_scope_requires_target_map",
          text:
            "The signal is preserved for review because a target map is required before promote materialization.",
        },
      },
    ],
    decisionNotes: [
      {
        id: "route.promote.strong_signal_low_ambiguity",
        text:
          "The signal is strong enough to emit a structured packet without forcing extra clarification.",
      },
      {
        id: "route.override.promotion_scope_requires_target_map",
        text:
          "The signal is preserved for review because a target map is required before promote materialization.",
      },
    ],
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
    expect(detail?.attempts).toEqual([]);
  });

  it("returns execution attempts with ordered step telemetry", async () => {
    const itemId = "11111111-1111-4111-8111-111111111111";
    const attemptId = "22222222-2222-4222-8222-222222222222";
    const now = new Date("2026-03-22T12:00:00.000Z");
    const routingPolicy = createRoutingPolicyTrace();

    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId: "44444444-4444-4444-8444-444444444444",
        status: "parked",
        route: "park",
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    tableResults.set(inboxFragments, []);
    tableResults.set(inboxHypotheses, []);
    tableResults.set(inboxAtoms, []);
    tableResults.set(inboxStructuredPackets, [
      {
        id: "99999999-9999-4999-8999-999999999999",
        itemId,
        packetType: "parked_packet",
        summary: "Structured packet with routing provenance.",
        payload: {
          entities: [],
          relations: [],
          intents: [],
          questions: [],
          constraints: [],
          clarificationContext: [],
          applyContract: null,
        },
        metadata: {
          routingPolicy,
        },
        route: "park",
        status: "draft",
      },
    ]);
    tableResults.set(inboxMergeCandidates, []);
    tableResults.set(inboxClarificationRequests, []);
    tableResults.set(inboxClarificationAnswers, []);
    tableResults.set(inboxWorkflowEvents, [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        itemId,
        eventType: "item.parked",
        stepName: "park",
        status: "completed",
        payload: {
          requestedRoute: "promote",
          effectiveRoute: "park",
          route: "park",
          reason:
            "The signal is preserved for review because a target map is required before promote materialization.",
          overrideReason:
            "The signal is preserved for review because a target map is required before promote materialization.",
          routingPolicy,
        },
        attemptNo: 2,
        createdAt: now,
      },
    ]);
    tableResults.set(inboxPipelineAttempts, [
      {
        id: attemptId,
        itemId,
        attemptNo: 2,
        triggerKind: "manual_process",
        runnerKind: "sync_command_chain.v1",
        status: "completed",
        route: "park",
        reason: "The signal is preserved for review.",
        failureCode: null,
        failureMessage: null,
        clarificationRequestId: null,
        clarificationAnswerId: null,
        startedAt: now,
        finishedAt: new Date("2026-03-22T12:00:01.000Z"),
        latencyMs: 1000,
      },
    ]);
    tableResults.set(inboxStepRuns, [
      {
        stepRun: {
          id: "33333333-3333-4333-8333-333333333333",
          attemptId,
          stepName: "persist_raw",
          stepOrder: 1,
          runNo: 1,
          status: "completed",
          modelName: null,
          promptVersion: null,
          route: null,
          reason: null,
          inputHash: "raw",
          outputHash: "raw",
          failureCode: null,
          failureMessage: null,
          metadata: {},
          startedAt: now,
          finishedAt: new Date("2026-03-22T12:00:00.100Z"),
          latencyMs: 100,
        },
      },
      {
        stepRun: {
          id: "44444444-4444-4444-8444-444444444444",
          attemptId,
          stepName: "route",
          stepOrder: 7,
          runNo: 1,
          status: "completed",
          modelName: null,
          promptVersion: null,
          route: "park",
          reason: "The signal is preserved for review.",
          inputHash: "route-in",
          outputHash: "route-out",
          failureCode: null,
          failureMessage: null,
          metadata: {
            requestedRoute: "promote",
            effectiveRoute: "park",
            overrideReason:
              "The signal is preserved for review because a target map is required before promote materialization.",
            routingPolicy,
          },
          startedAt: new Date("2026-03-22T12:00:00.700Z"),
          finishedAt: new Date("2026-03-22T12:00:00.900Z"),
          latencyMs: 200,
        },
      },
    ]);

    const detail = await getInboxItemDetailQuery(itemId);

    expect(detail?.attempts).toHaveLength(1);
    expect(detail?.attempts[0]?.attemptNo).toBe(2);
    expect(detail?.attempts[0]?.steps.map((step) => step.stepName)).toEqual([
      "persist_raw",
      "route",
    ]);
    expect(detail?.attempts[0]?.steps[1]?.route).toBe("park");
    expect(
      (
        detail?.attempts[0]?.steps[1]?.metadata.routingPolicy as {
          policyVersion?: string;
        }
      )?.policyVersion
    ).toBe("inbox-routing.v1");
    expect(detail?.structuredPackets[0]?.metadata.routingPolicy?.finalDecision.ruleId).toBe(
      "override.promotion_scope_requires_target_map"
    );
    expect(
      (
        detail?.workflowEvents[0]?.payload as {
          routingPolicy?: { policyVersion?: string };
        } | null
      )?.routingPolicy?.policyVersion
    ).toBe("inbox-routing.v1");
  });

  it("lists only the current workspace's items in newest-first order", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const olderCreatedAt = new Date("2026-03-20T10:00:00.000Z");
    const newerCreatedAt = new Date("2026-03-20T11:00:00.000Z");
    const newestUpdatedAt = new Date("2026-03-20T13:00:00.000Z");

    tableResults.set(inboxItems, [
      createItemRow({
        id: "11111111-1111-4111-8111-111111111111",
        userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        workspaceId,
        createdAt: olderCreatedAt,
        updatedAt: olderCreatedAt,
      }),
      createItemRow({
        id: "22222222-2222-4222-8222-222222222222",
        userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        createdAt: newerCreatedAt,
        updatedAt: newestUpdatedAt,
      }),
      createItemRow({
        id: "33333333-3333-4333-8333-333333333333",
        userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        workspaceId,
        createdAt: newerCreatedAt,
        updatedAt: newestUpdatedAt,
      }),
    ]);

    const items = await listInboxItemsForWorkspaceQuery(workspaceId);

    expect(items.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(items.every((item) => item.workspaceId === workspaceId)).toBe(true);
  });

  it("returns null when an inbox item from another workspace is requested", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "11111111-1111-4111-8111-111111111111";

    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        workspaceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ]);

    const item = await getInboxItemForWorkspaceQuery(workspaceId, itemId);
    const detail = await getInboxItemDetailForWorkspaceQuery(workspaceId, itemId);

    expect(item).toBeNull();
    expect(detail).toBeNull();
  });

  it("returns workspace item detail when the selected item belongs to the current workspace", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "11111111-1111-4111-8111-111111111111";

    tableResults.set(inboxItems, [
      createItemRow({
        id: itemId,
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        workspaceId,
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

    const detail = await getInboxItemDetailForWorkspaceQuery(workspaceId, itemId);

    expect(detail?.item.id).toBe(itemId);
    expect(detail?.item.workspaceId).toBe(workspaceId);
    expect(detail?.attempts).toEqual([]);
  });

  it("rejects clarification requests that belong to another workspace", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
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
        workspaceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ]);

    const request = await getInboxClarificationRequestForWorkspaceQuery(
      workspaceId,
      requestId
    );

    expect(request).toBeNull();
  });

  it("returns workspace clarification requests with the parent workspace id", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
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
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        workspaceId,
      }),
    ]);

    const request = await getInboxClarificationRequestForWorkspaceQuery(
      workspaceId,
      requestId
    );

    expect(request).toEqual({
      id: requestId,
      itemId,
      workspaceId,
      question: "What exactly triggers the reaction first?",
      reason: "Missing trigger detail.",
      status: "answered",
      answeredAt,
    });
  });
});
