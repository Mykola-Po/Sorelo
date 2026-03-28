import { describe, expect, it } from "vitest";

import {
  resolveRuntimeDatabasePoolSize,
  resolveRuntimeDatabaseUrl,
} from "@/shared/db/runtime-config";

describe("resolveRuntimeDatabaseUrl", () => {
  it("rewrites Supabase session pooler URLs to transaction mode", () => {
    const resolved = resolveRuntimeDatabaseUrl(
      "postgresql://postgres.project:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    );

    expect(resolved).toBe(
      "postgresql://postgres.project:secret@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
    );
  });

  it("keeps non-Supabase URLs unchanged", () => {
    const databaseUrl =
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

    expect(resolveRuntimeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });
});

describe("resolveRuntimeDatabasePoolSize", () => {
  it("uses a single runtime connection for Supabase pooler hosts", () => {
    expect(
      resolveRuntimeDatabasePoolSize(
        "postgresql://postgres.project:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
      )
    ).toBe(1);
  });

  it("keeps the wider local development pool size", () => {
    expect(
      resolveRuntimeDatabasePoolSize(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      )
    ).toBe(5);
  });
});
