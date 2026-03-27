import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createConceptCommandMock,
  deleteLinkCommandMock,
  getMapGraphMetricsMock,
  requireMapRuntimeAccessMock,
} = vi.hoisted(() => ({
  createConceptCommandMock: vi.fn(),
  deleteLinkCommandMock: vi.fn(),
  getMapGraphMetricsMock: vi.fn(),
  requireMapRuntimeAccessMock: vi.fn(),
}));

vi.mock("@/features/concepts/commands", () => ({
  createConceptCommand: createConceptCommandMock,
}));

vi.mock("@/features/links/commands", () => ({
  deleteLinkCommand: deleteLinkCommandMock,
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
import { DELETE as deleteLinkRoute } from "../../../../app/api/maps/[mapId]/links/[linkId]/route";
import { MapRevisionConflictError } from "@/features/maps/commands";

describe("map runtime write routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMapRuntimeAccessMock.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      access: { workspaceId: "workspace-1" },
    });
  });

  it("forwards expectedRevision on concept creation and returns the new revision", async () => {
    createConceptCommandMock.mockResolvedValue({
      id: "concept-1",
      title: "New concept",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 100,
      y: 120,
      updatedAt: new Date("2026-03-24T00:00:00.000Z"),
    });
    getMapGraphMetricsMock.mockResolvedValue({
      revision: 12,
      conceptCount: 3,
      linkCount: 1,
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
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(201);
    expect(createConceptCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 7,
        mapId: "map-1",
        workspaceId: "workspace-1",
      })
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 12,
      concept: {
        id: "concept-1",
      },
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
});
