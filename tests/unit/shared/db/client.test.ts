import { beforeEach, describe, expect, it, vi } from "vitest";

const { drizzleMock, postgresClientMock, postgresMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(),
  postgresClientMock: { unsafe: vi.fn() },
  postgresMock: vi.fn(),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: drizzleMock,
}));

vi.mock("postgres", () => ({
  default: postgresMock,
}));

vi.mock("@/shared/config/env", () => ({
  env: {
    DATABASE_URL:
      "postgresql://postgres.project:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
  },
}));

vi.mock("@/shared/db/schema", () => ({}));

function clearSharedSqlClient() {
  delete (
    globalThis as typeof globalThis & {
      __sorela_sql__?: unknown;
    }
  ).__sorela_sql__;
}

describe("shared db client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    postgresMock.mockReturnValue(postgresClientMock);
    drizzleMock.mockReturnValue({ mocked: true });
    clearSharedSqlClient();
  });

  it("rewrites Supabase session pooler URLs to the transaction port", async () => {
    await import("@/shared/db/client");

    expect(postgresMock).toHaveBeenCalledWith(
      "postgresql://postgres.project:secret@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
      {
        prepare: false,
        max: 1,
        idle_timeout: 5,
        connect_timeout: 10,
      }
    );
  });

  it("keeps non-pooler URLs unchanged when resolving options directly", async () => {
    await import("@/shared/db/client");
    const { resolveSqlClientOptions } = await import("@/shared/db/client");

    expect(
      resolveSqlClientOptions(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      )
    ).toEqual({
      prepare: false,
      max: 5,
      idle_timeout: 5,
      connect_timeout: 10,
    });
  });
});
