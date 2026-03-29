import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/shared/config/env";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export type InternalAuthStatus =
  | "authorized"
  | "missing_secret"
  | "missing_header"
  | "malformed_bearer"
  | "invalid_token";

export function resolveInternalAuthSecret(
  internalApiSecret: string | null = env.INTERNAL_API_SECRET ?? null
) {
  return internalApiSecret;
}

export function hasValidInternalBearerToken(
  authorizationHeader: string | null,
  secret: string | null = resolveInternalAuthSecret()
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
  secret: string | null = resolveInternalAuthSecret()
) : InternalAuthStatus {
  if (!secret) {
    return "missing_secret";
  }

  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader) {
    return "missing_header";
  }

  const [scheme, token, ...rest] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token || rest.length > 0) {
    return "malformed_bearer";
  }

  return hasValidInternalBearerToken(authorizationHeader, secret)
    ? "authorized"
    : "invalid_token";
}
