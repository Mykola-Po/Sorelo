import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const runtimeEnvSchema = {
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  DOCS_HUB_PASSWORD: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  INBOX_LLM_ENABLED: z.enum(["true", "false"]).optional(),
  INBOX_LLM_MODEL: z.string().min(1).optional(),
  INBOX_LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).optional(),
  INBOX_LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).optional(),
  INBOX_LLM_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(100).max(5000).optional(),
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
    OPENAI_API_KEY: runtimeEnvSchema.OPENAI_API_KEY,
    INBOX_LLM_ENABLED: runtimeEnvSchema.INBOX_LLM_ENABLED,
    INBOX_LLM_MODEL: runtimeEnvSchema.INBOX_LLM_MODEL,
    INBOX_LLM_TIMEOUT_MS: runtimeEnvSchema.INBOX_LLM_TIMEOUT_MS,
    INBOX_LLM_MAX_RETRIES: runtimeEnvSchema.INBOX_LLM_MAX_RETRIES,
    INBOX_LLM_RETRY_BASE_DELAY_MS: runtimeEnvSchema.INBOX_LLM_RETRY_BASE_DELAY_MS,
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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    INBOX_LLM_ENABLED: process.env.INBOX_LLM_ENABLED,
    INBOX_LLM_MODEL: process.env.INBOX_LLM_MODEL,
    INBOX_LLM_TIMEOUT_MS: process.env.INBOX_LLM_TIMEOUT_MS,
    INBOX_LLM_MAX_RETRIES: process.env.INBOX_LLM_MAX_RETRIES,
    INBOX_LLM_RETRY_BASE_DELAY_MS: process.env.INBOX_LLM_RETRY_BASE_DELAY_MS,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});
