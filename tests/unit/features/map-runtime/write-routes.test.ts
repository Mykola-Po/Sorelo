import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createConceptWithOperationCommandMock,
  createLinkWithOperationCommandMock,
  deleteLinkCommandMock,
  getMapGraphMetricsMock,
  repositionConceptWithOperationCommandMock,
  repositionConceptsBatchCommandMock,
  requireMapRuntimeAccessMock,
  updateConceptCommandMock,
  updateLinkCommandMock,
} = vi.hoisted(() => ({
  createConceptWithOperationCommandMock: vi.fn(),
  createLinkWithOperationCommandMock: vi.fn(),
  deleteLinkCommandMock: vi.fn(),
  getMapGraphMetricsMock: vi.fn(),
  repositionConceptWithOperationCommandMock: vi.fn(),
  repositionConceptsBatchCommandMock: vi.fn(),
  requireMapRuntimeAccessMock: vi.fn(),
  updateConceptCommandMock: vi.fn(),
  updateLinkCommandMock: vi.fn(),
}));

vi.mock("@/features/concepts/commands", () => ({
  createConceptWithOperationCommand: createConceptWithOperationCommandMock,
  repositionConceptWithOperationCommand: repositionConceptWithOperationCommandMock,
  repositionConceptsBatchCommand: repositionConceptsBatchCommandMock,
  updateConceptCommand: updateConceptCommandMock,
}));

vi.mock("@/features/links/commands", () => ({
  createLinkWithOperationCommand: createLinkWithOperationCommandMock,
  deleteLinkCommand: deleteLinkCommandMock,
  updateLinkCommand: updateLinkCommandMock,
}));

vi.mock("@/features/maps/queries", () => ({
  getMapGraphMetrics: getMapGraphMetricsMock,
}));

vi.mock("@/features/map-runtime/server", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/map-runtime/server")>(
      "@/features/map-runtime/server"
    );

  return {
    ...actual,
    requireMapRuntimeAccess: requireMapRuntimeAccessMock,
  };
});

import { POST as createConceptRoute } from "../../../../app/api/maps/[mapId]/concepts/route";
import { PATCH as updateConceptRoute } from "../../../../app/api/maps/[mapId]/concepts/[conceptId]/route";
import { PATCH as repositionConceptPositionRoute } from "../../../../app/api/maps/[mapId]/concepts/[conceptId]/position/route";
import { PATCH as repositionConceptPositionsRoute } from "../../../../app/api/maps/[mapId]/concepts/positions/route";
import { POST as createLinkRoute } from "../../../../app/api/maps/[mapId]/links/route";
import { PATCH as updateLinkRoute } from "../../../../app/api/maps/[mapId]/links/[linkId]/route";
import { DELETE as deleteLinkRoute } from "../../../../app/api/maps/[mapId]/links/[linkId]/route";
import {
  EntityContentRevisionConflictError,
  MapRevisionConflictError,
} from "@/features/maps/commands";

describe("map runtime write routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMapRuntimeAccessMock.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      access: { workspaceId: "workspace-1" },
    });
    getMapGraphMetricsMock.mockResolvedValue({
      revision: 17,
      conceptCount: 2,
      linkCount: 1,
    });
  });

  it("forwards expectedRevision and client metadata on concept creation", async () => {
    createConceptWithOperationCommandMock.mockResolvedValue({
      revision: 12,
      seq: 12,
      concept: {
        id: "concept-1",
        title: "New concept",
        conceptType: "custom",
        summary: null,
        description: null,
        x: 100,
        y: 120,
        updatedAt: new Date("2026-03-24T00:00:00.000Z"),
      },
      op: {
        id: "op-concept-1",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 12,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        opKind: "concept.create",
        entityType: "concept",
        entityId: "concept-1",
        payload: {
          title: "New concept",
          conceptType: "custom",
          summary: null,
          description: null,
          x: 100,
          y: 120,
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
        createdAt: "2026-03-27T10:00:00.000Z",
      },
      duplicate: false,
    });

    const response = await createConceptRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 7,
          title: "New concept",
          conceptType: "custom",
          summary: null,
          description: null,
          x: 100,
          y: 120,
          clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(201);
    expect(createConceptWithOperationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 7,
        mapId: "map-1",
        workspaceId: "workspace-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 12,
      seq: 12,
      concept: {
        id: "concept-1",
      },
      op: {
        opKind: "concept.create",
        entityId: "concept-1",
      },
      duplicate: false,
    });
  });

  it("returns the durable op payload for link creation", async () => {
    createLinkWithOperationCommandMock.mockResolvedValue({
      revision: 13,
      seq: 13,
      link: {
        id: "link-1",
        sourceConceptId: "11111111-1111-4111-8111-111111111111",
        targetConceptId: "22222222-2222-4222-8222-222222222222",
        relationType: "causes",
        strength: 4,
        description: "Because of this",
        updatedAt: new Date("2026-03-24T00:10:00.000Z"),
      },
      op: {
        id: "op-link-1",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 13,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        opKind: "link.create",
        entityType: "link",
        entityId: "link-1",
        payload: {
          sourceConceptId: "11111111-1111-4111-8111-111111111111",
          targetConceptId: "22222222-2222-4222-8222-222222222222",
          relationType: "causes",
          strength: 4,
          description: "Because of this",
          updatedAt: "2026-03-24T00:10:00.000Z",
        },
        createdAt: "2026-03-27T10:05:00.000Z",
      },
      duplicate: false,
    });

    const response = await createLinkRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 12,
          sourceConceptId: "11111111-1111-4111-8111-111111111111",
          targetConceptId: "22222222-2222-4222-8222-222222222222",
          relationType: "causes",
          strength: 4,
          description: "Because of this",
          clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          clientMutationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(201);
    expect(createLinkWithOperationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapId: "map-1",
        expectedRevision: 12,
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 13,
      seq: 13,
      link: {
        id: "link-1",
      },
      op: {
        opKind: "link.create",
        entityId: "link-1",
      },
    });
  });

  it("forwards expectedContentRevision on concept updates", async () => {
    updateConceptCommandMock.mockResolvedValue({
      id: "concept-1",
      title: "Updated concept",
      conceptType: "belief",
      summary: "Fresh summary",
      description: "Fresh description",
      x: 180,
      y: 220,
      contentRevision: 4,
    });

    const response = await updateConceptRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/concepts/concept-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedContentRevision: 3,
          title: "Updated concept",
          conceptType: "belief",
          summary: "Fresh summary",
          description: "Fresh description",
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1", conceptId: "concept-1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateConceptCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        mapId: "map-1",
        conceptId: "concept-1",
        expectedContentRevision: 3,
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 17,
      concept: {
        id: "concept-1",
        title: "Updated concept",
        contentRevision: 4,
      },
    });
  });

  it("maps stale concept updates to content-revision conflicts", async () => {
    updateConceptCommandMock.mockRejectedValue(
      new EntityContentRevisionConflictError("concept", 6)
    );

    const response = await updateConceptRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/concepts/concept-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedContentRevision: 5,
          title: "Updated concept",
          conceptType: "belief",
          summary: null,
          description: null,
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1", conceptId: "concept-1" }) }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "entity_content_revision_conflict",
      error: "Concept changed since you opened Inspector. Refresh and try again.",
      currentContentRevision: 6,
    });
  });

  it("forwards expectedContentRevision on link updates", async () => {
    updateLinkCommandMock.mockResolvedValue({
      id: "link-1",
      sourceConceptId: "11111111-1111-4111-8111-111111111111",
      targetConceptId: "22222222-2222-4222-8222-222222222222",
      relationType: "explains",
      strength: 5,
      description: "Updated link",
      contentRevision: 2,
    });

    const response = await updateLinkRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/links/link-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedContentRevision: 1,
          sourceConceptId: "11111111-1111-4111-8111-111111111111",
          targetConceptId: "22222222-2222-4222-8222-222222222222",
          relationType: "explains",
          strength: 5,
          description: "Updated link",
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1", linkId: "link-1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateLinkCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        mapId: "map-1",
        linkId: "link-1",
        expectedContentRevision: 1,
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 17,
      link: {
        id: "link-1",
        relationType: "explains",
        contentRevision: 2,
      },
    });
  });

  it("maps stale link updates to content-revision conflicts", async () => {
    updateLinkCommandMock.mockRejectedValue(
      new EntityContentRevisionConflictError("link", 4)
    );

    const response = await updateLinkRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/links/link-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedContentRevision: 3,
          sourceConceptId: "11111111-1111-4111-8111-111111111111",
          targetConceptId: "22222222-2222-4222-8222-222222222222",
          relationType: "explains",
          strength: 5,
          description: "Updated link",
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1", linkId: "link-1" }) }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "entity_content_revision_conflict",
      error: "Link changed since you opened Inspector. Refresh and try again.",
      currentContentRevision: 4,
    });
  });

  it("maps stale delete requests to a 409 conflict response", async () => {
    deleteLinkCommandMock.mockRejectedValue(
      new MapRevisionConflictError(23)
    );

    const response = await deleteLinkRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/links/link-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 7,
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1", linkId: "link-1" }) }
    );

    expect(response.status).toBe(409);
    expect(deleteLinkCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 7,
        linkId: "link-1",
      })
    );
    expect(await response.json()).toEqual({
      code: "map_revision_conflict",
      error: "Map changed since your last snapshot. Refresh and try again.",
      currentRevision: 23,
    });
  });

  it("returns the durable op payload for single concept position writes", async () => {
    repositionConceptWithOperationCommandMock.mockResolvedValue({
      revision: 9,
      seq: 9,
      concept: {
        id: "11111111-1111-4111-8111-111111111111",
        x: 220,
        y: 340,
      },
      op: {
        id: "op-1",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 9,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        opKind: "concept.position.set",
        entityType: "concept",
        entityId: "11111111-1111-4111-8111-111111111111",
        payload: {
          x: 220,
          y: 340,
        },
        createdAt: "2026-03-27T10:00:00.000Z",
      },
    });

    const response = await repositionConceptPositionRoute(
      new Request(
        "http://127.0.0.1:3000/api/maps/map-1/concepts/concept-1/position",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: 8,
            x: 220,
            y: 340,
            clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          }),
        }
      ),
      {
        params: Promise.resolve({
          mapId: "map-1",
          conceptId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(repositionConceptWithOperationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapId: "map-1",
        conceptId: "11111111-1111-4111-8111-111111111111",
        expectedRevision: 8,
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 9,
      seq: 9,
      concept: {
        id: "11111111-1111-4111-8111-111111111111",
        x: 220,
        y: 340,
      },
      op: {
        opKind: "concept.position.set",
        entityId: "11111111-1111-4111-8111-111111111111",
      },
    });
  });

  it("routes single-item batch position writes through the durable op path", async () => {
    repositionConceptWithOperationCommandMock.mockResolvedValue({
      revision: 4,
      seq: 4,
      concept: {
        id: "11111111-1111-4111-8111-111111111111",
        x: 200,
        y: 260,
      },
      op: {
        id: "op-2",
        workspaceId: "workspace-1",
        mapId: "map-1",
        seq: 4,
        actorUserId: "user-1",
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientMutationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        opKind: "concept.position.set",
        entityType: "concept",
        entityId: "11111111-1111-4111-8111-111111111111",
        payload: {
          x: 200,
          y: 260,
        },
        createdAt: "2026-03-27T10:05:00.000Z",
      },
    });

    const response = await repositionConceptPositionsRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/concepts/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 3,
          clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          clientMutationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          positions: [
            {
              conceptId: "11111111-1111-4111-8111-111111111111",
              x: 200,
              y: 260,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(200);
    expect(repositionConceptWithOperationCommandMock).toHaveBeenCalledTimes(1);
    expect(repositionConceptsBatchCommandMock).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 4,
      seq: 4,
      concepts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          x: 200,
          y: 260,
        },
      ],
      op: {
        opKind: "concept.position.set",
      },
    });
  });

  it("keeps multi-item batch writes on the legacy batch command path", async () => {
    repositionConceptsBatchCommandMock.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        x: 100,
        y: 120,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        x: 240,
        y: 320,
      },
    ]);

    const response = await repositionConceptPositionsRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/concepts/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: 7,
          positions: [
            {
              conceptId: "11111111-1111-4111-8111-111111111111",
              x: 100,
              y: 120,
            },
            {
              conceptId: "22222222-2222-4222-8222-222222222222",
              x: 240,
              y: 320,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(200);
    expect(repositionConceptsBatchCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapId: "map-1",
        expectedRevision: 7,
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 8,
      concepts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          x: 100,
          y: 120,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          x: 240,
          y: 320,
        },
      ],
    });
  });
});
