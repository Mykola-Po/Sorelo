export const E2E_AUTH_COOKIE = "sorela-e2e-auth";
export const E2E_AUTH_USER_COOKIE = "sorela-e2e-auth-user";

export function isE2EAuthBypassEnabled() {
  const explicitBypass = process.env.E2E_AUTH_BYPASS;
  if (explicitBypass === "true") {
    return true;
  }

  if (explicitBypass === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

export function getE2EAuthProfile(userId: string) {
  const normalizedUserId = userId.toLowerCase();
  return {
    id: normalizedUserId,
    email:
      process.env.E2E_AUTH_EMAIL ??
      `e2e+${normalizedUserId.replace(/-/g, "")}@sorelo.local`,
    fullName: process.env.E2E_AUTH_FULL_NAME ?? "Sorelo E2E User",
    avatarUrl: null,
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
