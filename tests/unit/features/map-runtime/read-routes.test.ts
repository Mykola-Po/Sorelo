import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireMapRuntimeAccessMock,
  getFullGraphSnapshotMock,
  listConceptCatalogForMapMock,
  getInspectorPayloadMock,
} = vi.hoisted(() => ({
  requireMapRuntimeAccessMock: vi.fn(),
  getFullGraphSnapshotMock: vi.fn(),
  listConceptCatalogForMapMock: vi.fn(),
  getInspectorPayloadMock: vi.fn(),
}));

vi.mock("@/features/maps/queries", () => ({
  getFullGraphSnapshot: getFullGraphSnapshotMock,
  listConceptCatalogForMap: listConceptCatalogForMapMock,
  getInspectorPayload: getInspectorPayloadMock,
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

import { RuntimeRouteError } from "@/features/map-runtime/server";
import { GET as getConceptCatalogRoute } from "../../../../app/api/maps/[mapId]/concept-catalog/route";
import { GET as getGraphRoute } from "../../../../app/api/maps/[mapId]/graph/route";
import { GET as getInspectorRoute } from "../../../../app/api/maps/[mapId]/inspector/route";

describe("map runtime read routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMapRuntimeAccessMock.mockResolvedValue({
      access: {
        workspaceId: "workspace-1",
      },
    });
  });

  it("returns a full graph snapshot without viewport query params", async () => {
    getFullGraphSnapshotMock.mockResolvedValue({
      revision: 4,
      counts: {
        conceptCount: 1,
        linkCount: 0,
      },
      concepts: [
        {
          id: "concept-1",
          title: "Visible concept",
          conceptType: "custom",
          summary: null,
          description: null,
          x: 100,
          y: 140,
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
      ],
      links: [],
    });

    const response = await getGraphRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/graph"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(200);
    expect(getFullGraphSnapshotMock).toHaveBeenCalledWith(
      "map-1",
      "workspace-1"
    );
    expect(await response.json()).toEqual({
      revision: 4,
      counts: {
        conceptCount: 1,
        linkCount: 0,
      },
      concepts: [
        {
          id: "concept-1",
          title: "Visible concept",
          conceptType: "custom",
          summary: null,
          description: null,
          x: 100,
          y: 140,
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
      ],
      links: [],
    });
  });

  it("maps auth failures on the graph route to 401 JSON", async () => {
    requireMapRuntimeAccessMock.mockRejectedValue(
      new RuntimeRouteError(
        "Authentication required.",
        401,
        "runtime_auth_required"
      )
    );

    const response = await getGraphRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/graph"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "runtime_auth_required",
      error: "Authentication required.",
    });
  });

  it("returns 404 when the graph snapshot is missing", async () => {
    getFullGraphSnapshotMock.mockResolvedValue(null);

    const response = await getGraphRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/graph"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Map not found.",
    });
  });

  it("maps access failures on the concept catalog route to 403 JSON", async () => {
    requireMapRuntimeAccessMock.mockRejectedValue(
      new RuntimeRouteError(
        "Map access required.",
        403,
        "runtime_map_access_required"
      )
    );

    const response = await getConceptCatalogRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/concept-catalog?q=term"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "runtime_map_access_required",
      error: "Map access required.",
    });
  });

  it("returns 404 when the inspector payload is missing", async () => {
    getInspectorPayloadMock.mockResolvedValue(null);

    const response = await getInspectorRoute(
      new Request(
        "http://127.0.0.1:3000/api/maps/map-1/inspector?kind=concept&id=concept-1"
      ),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Inspector payload not found.",
    });
  });
});
