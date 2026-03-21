import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const runtimeEnvSchema = {
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  DOCS_HUB_PASSWORD: z.string().min(1).optional(),
};

export function parseRuntimeEnv(input: Record<string, string | undefined>) {
  return z.object(runtimeEnvSchema).parse(input);
}

export const env = createEnv({
  server: {
    DATABASE_URL: runtimeEnvSchema.DATABASE_URL,
    INTERNAL_API_SECRET: runtimeEnvSchema.INTERNAL_API_SECRET,
    SUPABASE_SECRET_KEY: runtimeEnvSchema.SUPABASE_SECRET_KEY,
    DOCS_HUB_PASSWORD: runtimeEnvSchema.DOCS_HUB_PASSWORD,
  },
  client: {
    NEXT_PUBLIC_APP_URL: runtimeEnvSchema.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: runtimeEnvSchema.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      runtimeEnvSchema.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    DOCS_HUB_PASSWORD: process.env.DOCS_HUB_PASSWORD,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});
