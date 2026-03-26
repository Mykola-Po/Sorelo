import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUserMock,
  requireActiveMapByIdMock,
  requireWorkspaceMembershipMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  requireActiveMapByIdMock: vi.fn(),
  requireWorkspaceMembershipMock: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/features/maps/access", () => ({
  requireActiveMapById: requireActiveMapByIdMock,
  requireWorkspaceMembership: requireWorkspaceMembershipMock,
}));

import {
  RuntimeRouteError,
  requireMapRuntimeAccess,
  toRuntimeRouteErrorResponse,
} from "@/features/map-runtime/server";

describe("map runtime server helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps missing auth to a 401 runtime route error", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireMapRuntimeAccess("map-1")).rejects.toMatchObject({
      code: "runtime_auth_required",
      message: "Authentication required.",
      statusCode: 401,
    });
  });

  it("maps missing maps to a 404 runtime route error", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    requireActiveMapByIdMock.mockRejectedValue(new Error("Map not found."));

    await expect(requireMapRuntimeAccess("map-1")).rejects.toMatchObject({
      code: "runtime_map_not_found",
      message: "Map not found.",
      statusCode: 404,
    });
  });

  it("maps missing membership to a 403 runtime route error", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    requireActiveMapByIdMock.mockResolvedValue({
      id: "map-1",
      title: "Runtime Map",
      workspaceId: "workspace-1",
    });
    requireWorkspaceMembershipMock.mockRejectedValue(
      new Error("Workspace access required.")
    );

    await expect(requireMapRuntimeAccess("map-1")).rejects.toMatchObject({
      code: "runtime_map_access_required",
      message: "Map access required.",
      statusCode: 403,
    });
  });

  it("returns normalized runtime access for active members", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    requireActiveMapByIdMock.mockResolvedValue({
      id: "map-1",
      title: "Runtime Map",
      workspaceId: "workspace-1",
    });
    requireWorkspaceMembershipMock.mockResolvedValue({
      role: "owner",
    });

    await expect(requireMapRuntimeAccess("map-1")).resolves.toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
      },
      access: {
        mapId: "map-1",
        mapTitle: "Runtime Map",
        workspaceId: "workspace-1",
        role: "owner",
      },
    });
  });

  it("serializes runtime route errors to structured JSON responses", async () => {
    const response = toRuntimeRouteErrorResponse(
      new RuntimeRouteError(
        "Map access required.",
        403,
        "runtime_map_access_required"
      ),
      "Unable to load runtime data."
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "runtime_map_access_required",
      error: "Map access required.",
    });
  });
});
