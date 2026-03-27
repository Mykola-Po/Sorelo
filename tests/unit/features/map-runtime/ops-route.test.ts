import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireMapRuntimeAccessMock,
  listMapGraphOperationsAfterSeqMock,
} = vi.hoisted(() => ({
  requireMapRuntimeAccessMock: vi.fn(),
  listMapGraphOperationsAfterSeqMock: vi.fn(),
}));

vi.mock("@/features/maps/queries", () => ({
  listMapGraphOperationsAfterSeq: listMapGraphOperationsAfterSeqMock,
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
import { GET as getMapOpsRoute } from "../../../../app/api/maps/[mapId]/ops/route";

describe("map runtime ops route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMapRuntimeAccessMock.mockResolvedValue({
      access: {
        workspaceId: "workspace-1",
      },
    });
  });

  it("returns ordered graph operations after the requested sequence cursor", async () => {
    listMapGraphOperationsAfterSeqMock.mockResolvedValue({
      revision: 9,
      hasMore: false,
      ops: [
        {
          id: "op-1",
          workspaceId: "workspace-1",
          mapId: "map-1",
          seq: 9,
          actorUserId: "user-1",
          clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          opKind: "concept.position.set",
          entityType: "concept",
          entityId: "concept-1",
          payload: {
            x: 240,
            y: 320,
          },
          createdAt: new Date("2026-03-27T10:15:00.000Z"),
        },
        {
          id: "op-2",
          workspaceId: "workspace-1",
          mapId: "map-1",
          seq: 10,
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
            x: 120,
            y: 180,
            updatedAt: "2026-03-27T10:16:00.000Z",
          },
          createdAt: new Date("2026-03-27T10:16:00.000Z"),
        },
      ],
    });

    const response = await getMapOpsRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/ops?afterSeq=8&limit=25"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(200);
    expect(listMapGraphOperationsAfterSeqMock).toHaveBeenCalledWith({
      mapId: "map-1",
      workspaceId: "workspace-1",
      afterSeq: 8,
      limit: 25,
    });
    expect(await response.json()).toEqual({
      ok: true,
      revision: 9,
      hasMore: false,
      ops: [
        {
          id: "op-1",
          workspaceId: "workspace-1",
          mapId: "map-1",
          seq: 9,
          actorUserId: "user-1",
          clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          opKind: "concept.position.set",
          entityType: "concept",
          entityId: "concept-1",
          payload: {
            x: 240,
            y: 320,
          },
          createdAt: "2026-03-27T10:15:00.000Z",
        },
        {
          id: "op-2",
          workspaceId: "workspace-1",
          mapId: "map-1",
          seq: 10,
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
            x: 120,
            y: 180,
            updatedAt: "2026-03-27T10:16:00.000Z",
          },
          createdAt: "2026-03-27T10:16:00.000Z",
        },
      ],
    });
  });

  it("rejects invalid ops query parameters", async () => {
    const response = await getMapOpsRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/ops?afterSeq=-1&limit=999"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid query parameters.",
      fieldErrors: {
        afterSeq: expect.any(Array),
        limit: expect.any(Array),
      },
    });
  });

  it("maps auth failures to the runtime route contract", async () => {
    requireMapRuntimeAccessMock.mockRejectedValue(
      new RuntimeRouteError(
        "Authentication required.",
        401,
        "runtime_auth_required"
      )
    );

    const response = await getMapOpsRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/ops"),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "runtime_auth_required",
      error: "Authentication required.",
    });
  });
});
