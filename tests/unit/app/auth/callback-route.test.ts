import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  countWorkspacesForUserMock,
  createServerSupabaseClientMock,
  cookiesMock,
  exchangeCodeForSessionMock,
  getLastActiveWorkspaceForUserMock,
  syncAuthenticatedUserMock,
} = vi.hoisted(() => ({
  countWorkspacesForUserMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  cookiesMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  getLastActiveWorkspaceForUserMock: vi.fn(),
  syncAuthenticatedUserMock: vi.fn(),
}));

vi.mock("@/features/workspace/queries", () => ({
  countWorkspacesForUser: countWorkspacesForUserMock,
  getLastActiveWorkspaceForUser: getLastActiveWorkspaceForUserMock,
}));

vi.mock("@/shared/auth/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock("@/shared/auth/session", () => ({
  syncAuthenticatedUser: syncAuthenticatedUserMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import { GET as callbackRoute } from "../../../../app/auth/callback/route";

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      get() {
        return undefined;
      },
    });
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: exchangeCodeForSessionMock,
      },
    });
    syncAuthenticatedUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      fullName: "Callback User",
      avatarUrl: null,
      emailVerifiedAt: null,
    });
    countWorkspacesForUserMock.mockResolvedValue(1);
    getLastActiveWorkspaceForUserMock.mockResolvedValue({
      slug: "signal-lab",
    });
  });

  it("exchanges the callback code, syncs the user explicitly, and redirects to the active workspace", async () => {
    const response = await callbackRoute(
      new Request("http://127.0.0.1:3000/auth/callback?code=auth-code"),
    );

    expect(createServerSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("auth-code");
    expect(syncAuthenticatedUserMock).toHaveBeenCalledTimes(1);
    expect(countWorkspacesForUserMock).toHaveBeenCalledWith("user-1");
    expect(getLastActiveWorkspaceForUserMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/app/signal-lab");
  });
});
