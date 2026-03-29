import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  recordMapTransportActivityMock,
  requireMapRuntimeAccessMock,
} = vi.hoisted(() => ({
  recordMapTransportActivityMock: vi.fn(),
  requireMapRuntimeAccessMock: vi.fn(),
}));

vi.mock("@/features/maps/commands", () => ({
  recordMapTransportActivity: recordMapTransportActivityMock,
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
import { POST as postTransportTelemetryRoute } from "../../../../app/api/maps/[mapId]/telemetry/transport/route";

describe("map transport telemetry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMapRuntimeAccessMock.mockResolvedValue({
      user: { id: "user-1" },
      access: { workspaceId: "workspace-1" },
    });
  });

  it("records validated transport telemetry events", async () => {
    const response = await postTransportTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/telemetry/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "map_transport.ops_replayed",
          trigger: "window_focus",
          opCount: 2,
          fromSeq: 4,
          toSeq: 6,
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(200);
    expect(recordMapTransportActivityMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        workspaceId: "workspace-1",
        actorUserId: "user-1",
        mapId: "map-1",
        action: "map_transport.ops_replayed",
        payload: {
          trigger: "window_focus",
          opCount: 2,
          fromSeq: 4,
          toSeq: 6,
        },
      }
    );
    expect(await response.json()).toEqual({ ok: true });
  });

  it("rejects invalid transport telemetry payloads", async () => {
    const response = await postTransportTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/telemetry/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "map_transport.gap_recovery",
          trigger: "revision_event",
          opCount: 2,
          fromSeq: 4,
          toSeq: 6,
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid request payload.",
      fieldErrors: {
        trigger: expect.any(Array),
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

    const response = await postTransportTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/maps/map-1/telemetry/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "map_transport.transport_resubscribe",
          afterSeq: 8,
        }),
      }),
      { params: Promise.resolve({ mapId: "map-1" }) }
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "runtime_auth_required",
      error: "Authentication required.",
    });
  });
});
