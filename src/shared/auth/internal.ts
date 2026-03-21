import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/shared/config/env";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function resolveInternalAuthSecret(
  internalApiSecret = env.INTERNAL_API_SECRET ?? null,
  legacySupabaseSecret = env.SUPABASE_SECRET_KEY ?? null
) {
  return internalApiSecret ?? legacySupabaseSecret ?? null;
}

export function hasValidInternalBearerToken(
  authorizationHeader: string | null,
  secret = resolveInternalAuthSecret()
) {
  if (!secret || !authorizationHeader) {
    return false;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return false;
  }

  return timingSafeEqual(sha256(token), sha256(secret));
}

export function getInternalAuthStatus(
  request: Request,
  secret = resolveInternalAuthSecret()
) {
  if (!secret) {
    return "misconfigured" as const;
  }

  return hasValidInternalBearerToken(
    request.headers.get("authorization"),
    secret
  )
    ? ("authorized" as const)
    : ("unauthorized" as const);
}
