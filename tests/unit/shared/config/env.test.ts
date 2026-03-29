import { describe, expect, it } from "vitest";

import { parseRuntimeEnv } from "@/shared/config/env";

describe("parseRuntimeEnv", () => {
  it("parses a complete runtime env object", () => {
    const parsed = parseRuntimeEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:54322/postgres",
      INTERNAL_API_SECRET: "internal-secret",
      SUPABASE_SECRET_KEY: "secret-key",
    });

    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(parsed.INTERNAL_API_SECRET).toBe("internal-secret");
  });

  it("trims accidental trailing whitespace from runtime env values", () => {
    const parsed = parseRuntimeEnv({
      NEXT_PUBLIC_APP_URL: "https://vant-nine.vercel.app\r\n",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co\r\n",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key\r\n",
      DATABASE_URL:
        "postgres://postgres:postgres@127.0.0.1:54322/postgres\r\n",
      INTERNAL_API_SECRET: "internal-secret\r\n",
      SUPABASE_SECRET_KEY: "secret-key\r\n",
    });

    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://vant-nine.vercel.app");
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      "publishable-key"
    );
    expect(parsed.DATABASE_URL).toBe(
      "postgres://postgres:postgres@127.0.0.1:54322/postgres"
    );
    expect(parsed.INTERNAL_API_SECRET).toBe("internal-secret");
    expect(parsed.SUPABASE_SECRET_KEY).toBe("secret-key");
  });

  it("requires INTERNAL_API_SECRET", () => {
    expect(() =>
      parseRuntimeEnv({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:54322/postgres",
        SUPABASE_SECRET_KEY: "secret-key",
      })
    ).toThrow();
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      parseRuntimeEnv({
        NEXT_PUBLIC_APP_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:54322/postgres",
        INTERNAL_API_SECRET: "internal-secret",
        SUPABASE_SECRET_KEY: "secret-key",
      })
    ).toThrow();
  });
});
