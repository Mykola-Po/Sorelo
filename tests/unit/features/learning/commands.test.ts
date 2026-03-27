import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  concepts,
  inboxFragments,
  learningCanonicalMutationEvidence,
  learningCanonicalMutationProvenance,
  learningMapVersions,
  learningSuggestions,
  maps,
} from "@/shared/db/schema";

const {
  createConceptWithTxMock,
  createLinkWithTxMock,
  updateConceptWithTxMock,
} = vi.hoisted(() => ({
  createConceptWithTxMock: vi.fn(),
  createLinkWithTxMock: vi.fn(),
  updateConceptWithTxMock: vi.fn(),
}));

vi.mock("@/shared/db/client", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock("@/features/concepts/commands", () => ({
  createConceptWithTx: createConceptWithTxMock,
  updateConceptWithTx: updateConceptWithTxMock,
}));

vi.mock("@/features/links/commands", () => ({
  createLinkWithTx: createLinkWithTxMock,
}));

import { applyInboxReviewResolutionTx } from "@/features/learning/commands";

type SelectQueueMap = Map<unknown, unknown[][]>;
type InsertQueueMap = Map<unknown, unknown[][]>;
type InsertLogMap = Map<unknown, unknown[]>;

function createMockTx() {
  const selectQueues: SelectQueueMap = new Map();
  const insertReturningQueues: InsertQueueMap = new Map();
  const insertLog: InsertLogMap = new Map();

  const resolveSelectRows = (table: unknown) => {
    const queue = selectQueues.get(table) ?? [];
    const nextRows = queue.shift() ?? [];
    selectQueues.set(table, queue);
    return nextRows;
  };

  const tx = {
    select: vi.fn(() => ({
      from(table: unknown) {
        const rows = resolveSelectRows(table);
        const orderedResult = Promise.resolve(rows) as Promise<unknown[]> & {
          limit: (count?: number) => Promise<unknown[]>;
        };
        orderedResult.limit = async (count = 1) => rows.slice(0, count);
        const afterWhere = {
          orderBy() {
            return orderedResult;
          },
          limit: async (count = 1) => rows.slice(0, count),
        };

        return {
          where() {
            return afterWhere;
          },
          orderBy() {
            return orderedResult;
          },
          limit: async (count = 1) => rows.slice(0, count),
        };
      },
    })),
    insert: vi.fn((table: unknown) => ({
      values(value: unknown) {
        const current = insertLog.get(table) ?? [];
        current.push(value);
        insertLog.set(table, current);

        const promise = Promise.resolve([]);
        Object.assign(promise, {
          returning() {
            const queue = insertReturningQueues.get(table) ?? [];
            const nextRows = queue.shift() ?? [];
            insertReturningQueues.set(table, queue);
            return Promise.resolve(nextRows);
          },
        });

        return promise;
      },
    })),
  };

  return {
    tx,
    queueSelect(table: unknown, rows: unknown[]) {
      const queue = selectQueues.get(table) ?? [];
      queue.push(rows);
      selectQueues.set(table, queue);
    },
    queueInsertReturning(table: unknown, rows: unknown[]) {
      const queue = insertReturningQueues.get(table) ?? [];
      queue.push(rows);
      insertReturningQueues.set(table, queue);
    },
    getInsertedValues(table: unknown) {
      return insertLog.get(table) ?? [];
    },
  };
}

function createSuggestionRow(input: {
  id?: string;
  batchId?: string;
  workspaceId?: string;
  mapId?: string;
  inboxItemId?: string;
  inboxPacketId?: string;
  proposedPayload: Record<string, unknown>;
}): typeof learningSuggestions.$inferSelect {
  return {
    id: input.id ?? "11111111-1111-4111-8111-111111111111",
    batchId: input.batchId ?? "22222222-2222-4222-8222-222222222222",
    workspaceId: input.workspaceId ?? "33333333-3333-4333-8333-333333333333",
    mapId: input.mapId ?? "44444444-4444-4444-8444-444444444444",
    inboxItemId: input.inboxItemId ?? "55555555-5555-4555-8555-555555555555",
    inboxPacketId: input.inboxPacketId ?? "66666666-6666-4666-8666-666666666666",
    sourceFragmentId: null,
    artifactOrder: 0,
    suggestionType: "create_concept",
    targetEntityType: "none",
    targetEntityId: null,
    proposedPayload: input.proposedPayload,
    rationale: "Because the evidence is direct.",
    confidence: 0.91,
    createdAt: new Date("2026-03-22T10:00:00.000Z"),
  };
}

describe("applyInboxReviewResolutionTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records append-only provenance and clarification evidence for create_concept", async () => {
    const workspaceId = "33333333-3333-4333-8333-333333333333";
    const mapId = "44444444-4444-4444-8444-444444444444";
    const suggestionId = "11111111-1111-4111-8111-111111111111";
    const resolutionId = "77777777-7777-4777-8777-777777777777";
    const inboxItemId = "55555555-5555-4555-8555-555555555555";
    const inboxPacketId = "66666666-6666-4666-8666-666666666666";
    const conceptId = "88888888-8888-4888-8888-888888888888";
    const provenanceId = "99999999-9999-4999-8999-999999999999";
    const mapVersionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const answerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const txState = createMockTx();

    createConceptWithTxMock.mockResolvedValue({ id: conceptId });
    txState.queueSelect(maps, [{ revision: 1 }]);
    txState.queueSelect(learningMapVersions, [{ id: mapVersionId }]);
    txState.queueSelect(inboxFragments, [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ordinal: 1,
        clarificationAnswerId: answerId,
      },
    ]);
    txState.queueInsertReturning(learningCanonicalMutationProvenance, [
      { id: provenanceId },
    ]);

    const suggestion = createSuggestionRow({
      id: suggestionId,
      workspaceId,
      mapId,
      inboxItemId,
      inboxPacketId,
      proposedPayload: {
        operation: {
          operationType: "create_concept",
          conceptRef: "trigger-ref",
          title: "Public criticism",
          conceptType: "trigger",
          summary: "A trigger",
          description: "The moment criticism is public.",
          evidenceFragmentOrdinals: [1],
        },
        before: {},
        after: {},
        evidenceFragmentOrdinals: [1],
        inboxItemId,
        inboxPacketId,
        artifactOrder: 0,
      },
    });

    const result = await applyInboxReviewResolutionTx(txState.tx as never, {
      suggestion,
      resolutionId,
      actorUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      workspaceId,
      mapId,
      afterPayload: {},
    });

    expect(createConceptWithTxMock).toHaveBeenCalledWith(
      txState.tx,
      expect.objectContaining({
        workspaceId,
        mapId,
        originType: "ai_suggested",
        originSuggestionId: suggestionId,
        causedByResolutionId: resolutionId,
      })
    );
    expect(txState.getInsertedValues(learningCanonicalMutationProvenance)[0]).toEqual(
      expect.objectContaining({
        workspaceId,
        mapId,
        mapVersionId,
        entityType: "concept",
        entityId: conceptId,
        mutationType: "create_concept",
        originSuggestionId: suggestionId,
        reviewResolutionId: resolutionId,
        inboxItemId,
        inboxPacketId,
      })
    );
    expect(txState.getInsertedValues(learningCanonicalMutationEvidence)[0]).toEqual([
      expect.objectContaining({
        provenanceId,
        inboxFragmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        clarificationAnswerId: answerId,
        evidenceOrder: 0,
        fragmentOrdinal: 1,
      }),
    ]);
    expect(result).toEqual({
      entityType: "concept",
      entityId: conceptId,
      operationType: "create_concept",
      provenanceId,
      mapVersionId,
      evidenceCount: 1,
    });
  });

  it("records update provenance without overwriting creation-origin on the concept", async () => {
    const workspaceId = "33333333-3333-4333-8333-333333333333";
    const mapId = "44444444-4444-4444-8444-444444444444";
    const suggestionId = "11111111-1111-4111-8111-111111111111";
    const resolutionId = "77777777-7777-4777-8777-777777777777";
    const conceptId = "88888888-8888-4888-8888-888888888888";
    const provenanceId = "99999999-9999-4999-8999-999999999999";
    const mapVersionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const txState = createMockTx();

    updateConceptWithTxMock.mockResolvedValue({ id: conceptId });
    txState.queueSelect(concepts, [
      {
        id: conceptId,
        title: "Fear of criticism",
        conceptType: "belief",
        summary: "Existing summary",
        description: "Existing description",
        x: 120,
        y: 180,
      },
    ]);
    txState.queueSelect(maps, [{ revision: 1 }]);
    txState.queueSelect(learningMapVersions, [{ id: mapVersionId }]);
    txState.queueSelect(inboxFragments, [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ordinal: 0,
        clarificationAnswerId: null,
      },
    ]);
    txState.queueInsertReturning(learningCanonicalMutationProvenance, [
      { id: provenanceId },
    ]);

    const suggestion = createSuggestionRow({
      id: suggestionId,
      workspaceId,
      mapId,
      proposedPayload: {
        operation: {
          operationType: "update_concept",
          conceptId,
          title: "Fear of criticism",
          conceptType: "belief",
          summary: "Existing summary",
          description: "Existing description",
          evidenceFragmentOrdinals: [0],
        },
        before: {
          title: "Fear of criticism",
          conceptType: "belief",
          summary: "Existing summary",
          description: "Existing description",
          x: 120,
          y: 180,
        },
        after: {},
        evidenceFragmentOrdinals: [0],
        inboxItemId: "55555555-5555-4555-8555-555555555555",
        inboxPacketId: "66666666-6666-4666-8666-666666666666",
        artifactOrder: 0,
      },
    });

    const result = await applyInboxReviewResolutionTx(txState.tx as never, {
      suggestion,
      resolutionId,
      actorUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      workspaceId,
      mapId,
      afterPayload: {
        title: "Fear of criticism",
        conceptType: "belief",
        summary: "Refined summary",
        description: "Existing description",
        x: 120,
        y: 180,
      },
    });

    const updateInput = updateConceptWithTxMock.mock.calls[0]?.[1];
    expect(updateInput).toEqual(
      expect.objectContaining({
        workspaceId,
        mapId,
        conceptId,
        causedByResolutionId: resolutionId,
      })
    );
    expect(updateInput).not.toHaveProperty("originType");
    expect(updateInput).not.toHaveProperty("originSuggestionId");
    expect(txState.getInsertedValues(learningCanonicalMutationProvenance)[0]).toEqual(
      expect.objectContaining({
        entityType: "concept",
        entityId: conceptId,
        mutationType: "update_concept",
        originSuggestionId: suggestionId,
        reviewResolutionId: resolutionId,
      })
    );
    expect(result).toEqual({
      entityType: "concept",
      entityId: conceptId,
      operationType: "update_concept",
      provenanceId,
      mapVersionId,
      evidenceCount: 1,
    });
  });

  it("records append-only provenance for create_link on the canonical apply path", async () => {
    const workspaceId = "33333333-3333-4333-8333-333333333333";
    const mapId = "44444444-4444-4444-8444-444444444444";
    const suggestionId = "11111111-1111-4111-8111-111111111111";
    const resolutionId = "77777777-7777-4777-8777-777777777777";
    const linkId = "88888888-8888-4888-8888-888888888888";
    const provenanceId = "99999999-9999-4999-8999-999999999999";
    const mapVersionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const sourceConceptId = "12121212-1212-4121-8121-121212121212";
    const targetConceptId = "34343434-3434-4343-8343-343434343434";
    const txState = createMockTx();

    createLinkWithTxMock.mockResolvedValue({ id: linkId });
    txState.queueSelect(concepts, [
      {
        id: sourceConceptId,
        title: "Trigger",
        conceptType: "trigger",
        summary: null,
        description: null,
        x: 120,
        y: 180,
      },
    ]);
    txState.queueSelect(concepts, [
      {
        id: targetConceptId,
        title: "Reaction",
        conceptType: "state",
        summary: null,
        description: null,
        x: 220,
        y: 280,
      },
    ]);
    txState.queueSelect(maps, [{ revision: 1 }]);
    txState.queueSelect(learningMapVersions, [{ id: mapVersionId }]);
    txState.queueSelect(inboxFragments, [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ordinal: 2,
        clarificationAnswerId: null,
      },
    ]);
    txState.queueInsertReturning(learningCanonicalMutationProvenance, [
      { id: provenanceId },
    ]);

    const suggestion = createSuggestionRow({
      id: suggestionId,
      workspaceId,
      mapId,
      proposedPayload: {
        operation: {
          operationType: "create_link",
          source: {
            source: "existing",
            conceptId: sourceConceptId,
          },
          target: {
            source: "existing",
            conceptId: targetConceptId,
          },
          relationType: "causes",
          strength: 4,
          description: "Direct causal link",
          evidenceFragmentOrdinals: [2],
        },
        before: {},
        after: {},
        evidenceFragmentOrdinals: [2],
        inboxItemId: "55555555-5555-4555-8555-555555555555",
        inboxPacketId: "66666666-6666-4666-8666-666666666666",
        artifactOrder: 2,
      },
    });

    const result = await applyInboxReviewResolutionTx(txState.tx as never, {
      suggestion,
      resolutionId,
      actorUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      workspaceId,
      mapId,
      afterPayload: {},
    });

    expect(createLinkWithTxMock).toHaveBeenCalledWith(
      txState.tx,
      expect.objectContaining({
        workspaceId,
        mapId,
        sourceConceptId,
        targetConceptId,
        originType: "ai_suggested",
        originSuggestionId: suggestionId,
        causedByResolutionId: resolutionId,
      })
    );
    expect(txState.getInsertedValues(learningCanonicalMutationProvenance)[0]).toEqual(
      expect.objectContaining({
        entityType: "link",
        entityId: linkId,
        mutationType: "create_link",
      })
    );
    expect(result).toEqual({
      entityType: "link",
      entityId: linkId,
      operationType: "create_link",
      provenanceId,
      mapVersionId,
      evidenceCount: 1,
    });
  });
});
