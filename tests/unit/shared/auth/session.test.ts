import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookiesMock,
  createServerSupabaseClientMock,
  dbTransactionMock,
  getUserMock,
  insertValuesMock,
  onConflictDoNothingMock,
  onConflictDoUpdateMock,
  setCookieState,
} = vi.hoisted(() => {
  const insertValuesMock = vi.fn().mockReturnThis();
  const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
  const onConflictDoNothingMock = vi.fn().mockResolvedValue(undefined);
  const insertBuilderMock = {
    values: insertValuesMock,
    onConflictDoUpdate: onConflictDoUpdateMock,
    onConflictDoNothing: onConflictDoNothingMock,
  };
  const txInsertMock = vi.fn().mockReturnValue(insertBuilderMock);
  const dbTransactionMock = vi
    .fn()
    .mockImplementation(async (callback) =>
      callback({
        insert: txInsertMock,
      })
    );
  const getUserMock = vi.fn();
  const createServerSupabaseClientMock = vi.fn();
  const cookieState = new Map<string, string>();
  const cookiesMock = vi.fn().mockImplementation(async () => ({
    get(name: string) {
      const value = cookieState.get(name);
      return value ? { value } : undefined;
    },
  }));

  return {
    cookiesMock,
    createServerSupabaseClientMock,
    dbTransactionMock,
    getUserMock,
    insertValuesMock,
    onConflictDoNothingMock,
    onConflictDoUpdateMock,
    setCookieState(nextState: Record<string, string>) {
      cookieState.clear();
      for (const [key, value] of Object.entries(nextState)) {
        cookieState.set(key, value);
      }
    },
  };
});

vi.mock("@/shared/config/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    SUPABASE_SECRET_KEY: null,
  },
}));

vi.mock("@/shared/auth/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock("@/shared/db/client", () => ({
  db: {
    transaction: dbTransactionMock,
  },
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import {
  getCurrentUser,
  syncAuthenticatedUser,
} from "@/shared/auth/session";

describe("shared auth session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.E2E_AUTH_BYPASS = "false";
    delete process.env.E2E_AUTH_EMAIL;
    delete process.env.E2E_AUTH_FULL_NAME;
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: vi.fn(),
      },
    });
    setCookieState({});
  });

  it("reads the current user without writing to the database", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: {
            full_name: "Grace Hopper",
            avatar_url: "https://example.com/avatar.png",
          },
        },
      },
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      fullName: "Grace Hopper",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(createServerSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(dbTransactionMock).not.toHaveBeenCalled();
  });

  it("returns the E2E profile without provisioning local records on read", async () => {
    process.env.E2E_AUTH_BYPASS = "true";
    process.env.E2E_AUTH_EMAIL = "e2e@example.com";
    process.env.E2E_AUTH_FULL_NAME = "E2E User";
    setCookieState({
      "sorela-e2e-auth": "1",
      "sorela-e2e-auth-user": "ABCDEFAB-1234-4ABC-8DEF-ABCDEFABCDEF",
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "abcdefab-1234-4abc-8def-abcdefabcdef",
      email: "e2e@example.com",
      fullName: "E2E User",
      avatarUrl: null,
    });

    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
    expect(dbTransactionMock).not.toHaveBeenCalled();
  });

  it("persists the authenticated user only on the explicit sync path", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "sync@example.com",
          email_confirmed_at: "2026-03-27T10:00:00.000Z",
          user_metadata: {
            full_name: "Sync User",
            avatar_url: "https://example.com/sync.png",
          },
          identities: [
            {
              provider: "google",
              id: "identity-1",
              last_sign_in_at: "2026-03-27T09:30:00.000Z",
              identity_data: {
                email: "sync@example.com",
              },
            },
          ],
        },
      },
    });

    await expect(syncAuthenticatedUser()).resolves.toEqual({
      id: "user-2",
      email: "sync@example.com",
      fullName: "Sync User",
      avatarUrl: "https://example.com/sync.png",
      emailVerifiedAt: new Date("2026-03-27T10:00:00.000Z"),
    });

    expect(dbTransactionMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: "user-2",
      email: "sync@example.com",
      fullName: "Sync User",
      avatarUrl: "https://example.com/sync.png",
      emailVerifiedAt: new Date("2026-03-27T10:00:00.000Z"),
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      userId: "user-2",
    });
    expect(onConflictDoUpdateMock).toHaveBeenCalledTimes(2);
    expect(onConflictDoNothingMock).toHaveBeenCalledTimes(1);
  });
});
