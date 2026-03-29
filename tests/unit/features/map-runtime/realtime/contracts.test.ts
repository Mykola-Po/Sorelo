import { describe, expect, it } from "vitest";

import {
  createGraphClientMutationId,
  getPendingGraphOperationKey,
  isConceptArchiveOperation,
  isConceptCreateOperation,
  isConceptPositionSetOperation,
  isLinkArchiveOperation,
  isLinkCreateOperation,
  type MapGraphOperation,
} from "@/features/map-runtime/realtime/contracts";

describe("map runtime realtime contracts", () => {
  it("narrows structural and position op kinds through runtime guards", () => {
    const operations: MapGraphOperation[] = [
      {
        id: "op-1",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 1,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        opKind: "concept.position.set",
        entityType: "concept",
        entityId: "concept-1",
        payload: { x: 120, y: 180 },
        createdAt: "2026-03-27T10:00:00.000Z",
      },
      {
        id: "op-2",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 2,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        opKind: "concept.create",
        entityType: "concept",
        entityId: "concept-2",
        payload: {
          id: "concept-2",
          title: "Signal",
          conceptType: "custom",
          summary: null,
          description: null,
          x: 100,
          y: 200,
          updatedAt: "2026-03-27T10:01:00.000Z",
        },
        createdAt: "2026-03-27T10:01:00.000Z",
      },
      {
        id: "op-3",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 3,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        opKind: "concept.archive",
        entityType: "concept",
        entityId: "concept-2",
        payload: {
          archivedAt: "2026-03-27T10:02:00.000Z",
          archivedLinkIds: ["link-1"],
        },
        createdAt: "2026-03-27T10:02:00.000Z",
      },
      {
        id: "op-4",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 4,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        opKind: "link.create",
        entityType: "link",
        entityId: "link-1",
        payload: {
          id: "link-1",
          sourceConceptId: "concept-1",
          targetConceptId: "concept-2",
          relationType: "causes",
          strength: 3,
          description: null,
          updatedAt: "2026-03-27T10:03:00.000Z",
        },
        createdAt: "2026-03-27T10:03:00.000Z",
      },
      {
        id: "op-5",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 5,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        opKind: "link.archive",
        entityType: "link",
        entityId: "link-1",
        payload: {
          sourceConceptId: "concept-1",
          targetConceptId: "concept-2",
          archivedAt: "2026-03-27T10:04:00.000Z",
        },
        createdAt: "2026-03-27T10:04:00.000Z",
      },
    ];

    expect(isConceptPositionSetOperation(operations[0]!)).toBe(true);
    expect(isConceptCreateOperation(operations[1]!)).toBe(true);
    expect(isConceptArchiveOperation(operations[2]!)).toBe(true);
    expect(isLinkCreateOperation(operations[3]!)).toBe(true);
    expect(isLinkArchiveOperation(operations[4]!)).toBe(true);
  });

  it("builds stable pending op keys from client metadata", () => {
    expect(
      getPendingGraphOperationKey(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      )
    ).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    );
  });

  it("creates client mutation ids for direct runtime writes", () => {
    const mutationId = createGraphClientMutationId();

    expect(typeof mutationId).toBe("string");
    expect(mutationId.length).toBeGreaterThan(0);
  });
});
