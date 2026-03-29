import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

function loadDotenvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const env: Record<string, string> = {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

const fileEnv = loadDotenvFile(path.resolve(__dirname, ".env.local"));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
    env: {
      SKIP_ENV_VALIDATION: "true",
      INBOX_LLM_ENABLED: "false",
      DATABASE_URL:
        fileEnv.DATABASE_URL ??
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@127.0.0.1:54322/postgres",
      INTERNAL_API_SECRET:
        fileEnv.INTERNAL_API_SECRET ??
        process.env.INTERNAL_API_SECRET ??
        "internal-secret",
      NEXT_PUBLIC_APP_URL:
        fileEnv.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://127.0.0.1:3000",
      NEXT_PUBLIC_SUPABASE_URL:
        fileEnv.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        "publishable-key",
      SUPABASE_SECRET_KEY:
        fileEnv.SUPABASE_SECRET_KEY ??
        process.env.SUPABASE_SECRET_KEY ??
        "secret-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(
        __dirname,
        "./tests/unit/stubs/server-only.ts"
      ),
    },
  },
});
