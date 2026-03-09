import { createHmac, timingSafeEqual } from "node:crypto";

export const DOCS_HUB_ACCESS_COOKIE = "sorelo-handbook-access";

const DOCS_HUB_COOKIE_PAYLOAD = "handbook-access";

function getDocsHubSigningKey(
  password: string,
  serverSecret?: string | null | undefined
) {
  return `${serverSecret ?? "sorelo-handbook"}:${password}`;
}

export function createDocsHubAccessCookieValue(
  password: string,
  serverSecret?: string | null | undefined
) {
  return createHmac("sha256", getDocsHubSigningKey(password, serverSecret))
    .update(DOCS_HUB_COOKIE_PAYLOAD)
    .digest("hex");
}

export function hasDocsHubAccess(
  cookieValue: string | undefined,
  password: string | undefined,
  serverSecret?: string | null | undefined
) {
  if (!cookieValue || !password) {
    return false;
  }

  const expectedValue = createDocsHubAccessCookieValue(password, serverSecret);
  const actualBuffer = Buffer.from(cookieValue, "utf8");
  const expectedBuffer = Buffer.from(expectedValue, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
