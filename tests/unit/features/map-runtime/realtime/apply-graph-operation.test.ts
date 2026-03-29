import { describe, expect, it } from "vitest";

import { applyGraphOperationToSnapshot } from "@/features/map-runtime/realtime/apply-graph-operation";
import type { GraphSnapshot } from "@/features/map-runtime/types";
import type { MapGraphOperation } from "@/features/map-runtime/realtime/contracts";

const baseSnapshot: GraphSnapshot = {
  revision: 4,
  counts: {
    conceptCount: 2,
    linkCount: 1,
  },
  concepts: [
    {
      id: "concept-1",
      title: "Alpha",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 100,
      y: 120,
      updatedAt: "2026-03-27T10:00:00.000Z",
    },
    {
      id: "concept-2",
      title: "Beta",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 200,
      y: 240,
      updatedAt: "2026-03-27T10:00:00.000Z",
    },
  ],
  links: [
    {
      id: "link-1",
      sourceConceptId: "concept-1",
      targetConceptId: "concept-2",
      relationType: "causes",
      strength: 3,
      description: null,
      updatedAt: "2026-03-27T10:00:00.000Z",
    },
  ],
};

describe("applyGraphOperationToSnapshot", () => {
  it("applies concept.create and derives counts from the next snapshot", () => {
    const operation: MapGraphOperation = {
      id: "op-1",
      workspaceId: "workspace-1",
      mapId: "map-1",
      seq: 5,
      actorUserId: "user-1",
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      opKind: "concept.create",
      entityType: "concept",
      entityId: "concept-3",
      payload: {
        id: "concept-3",
        title: "Gamma",
        conceptType: "custom",
        summary: "new",
        description: null,
        x: 320,
        y: 280,
        updatedAt: "2026-03-27T10:05:00.000Z",
      },
      createdAt: "2026-03-27T10:05:00.000Z",
    };

    const nextSnapshot = applyGraphOperationToSnapshot(baseSnapshot, operation);

    expect(nextSnapshot).not.toBeNull();
    expect(nextSnapshot?.revision).toBe(5);
    expect(nextSnapshot?.counts).toEqual({
      conceptCount: 3,
      linkCount: 1,
    });
    expect(nextSnapshot?.concepts.at(-1)?.id).toBe("concept-3");
  });

  it("applies concept.archive and removes incident links from the live snapshot", () => {
    const operation: MapGraphOperation = {
      id: "op-2",
      workspaceId: "workspace-1",
      mapId: "map-1",
      seq: 6,
      actorUserId: "user-1",
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      opKind: "concept.archive",
      entityType: "concept",
      entityId: "concept-2",
      payload: {
        archivedAt: "2026-03-27T10:06:00.000Z",
        archivedLinkIds: ["link-1"],
      },
      createdAt: "2026-03-27T10:06:00.000Z",
    };

    const nextSnapshot = applyGraphOperationToSnapshot(baseSnapshot, operation);

    expect(nextSnapshot).not.toBeNull();
    expect(nextSnapshot?.revision).toBe(6);
    expect(nextSnapshot?.counts).toEqual({
      conceptCount: 1,
      linkCount: 0,
    });
    expect(nextSnapshot?.concepts.map((concept) => concept.id)).toEqual([
      "concept-1",
    ]);
    expect(nextSnapshot?.links).toEqual([]);
  });

  it("applies link.create and link.archive against the live edge set", () => {
    const createOperation: MapGraphOperation = {
      id: "op-3",
      workspaceId: "workspace-1",
      mapId: "map-1",
      seq: 5,
      actorUserId: "user-1",
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      opKind: "link.create",
      entityType: "link",
      entityId: "link-2",
      payload: {
        id: "link-2",
        sourceConceptId: "concept-2",
        targetConceptId: "concept-1",
        relationType: "explains",
        strength: 2,
        description: "reverse",
        updatedAt: "2026-03-27T10:07:00.000Z",
      },
      createdAt: "2026-03-27T10:07:00.000Z",
    };
    const archiveOperation: MapGraphOperation = {
      id: "op-4",
      workspaceId: "workspace-1",
      mapId: "map-1",
      seq: 6,
      actorUserId: "user-1",
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      opKind: "link.archive",
      entityType: "link",
      entityId: "link-2",
      payload: {
        sourceConceptId: "concept-2",
        targetConceptId: "concept-1",
        archivedAt: "2026-03-27T10:08:00.000Z",
      },
      createdAt: "2026-03-27T10:08:00.000Z",
    };

    const createdSnapshot = applyGraphOperationToSnapshot(
      baseSnapshot,
      createOperation
    );
    const archivedSnapshot =
      createdSnapshot &&
      applyGraphOperationToSnapshot(createdSnapshot, archiveOperation);

    expect(createdSnapshot?.counts.linkCount).toBe(2);
    expect(createdSnapshot?.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-2",
    ]);
    expect(archivedSnapshot?.counts.linkCount).toBe(1);
    expect(archivedSnapshot?.links.map((link) => link.id)).toEqual(["link-1"]);
  });

  it("returns null when replay would require a missing dependency", () => {
    const operation: MapGraphOperation = {
      id: "op-5",
      workspaceId: "workspace-1",
      mapId: "map-1",
      seq: 5,
      actorUserId: "user-1",
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      opKind: "link.create",
      entityType: "link",
      entityId: "link-2",
      payload: {
        id: "link-2",
        sourceConceptId: "concept-missing",
        targetConceptId: "concept-1",
        relationType: "explains",
        strength: 2,
        description: null,
        updatedAt: "2026-03-27T10:09:00.000Z",
      },
      createdAt: "2026-03-27T10:09:00.000Z",
    };

    expect(applyGraphOperationToSnapshot(baseSnapshot, operation)).toBeNull();
  });
});
