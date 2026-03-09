import { describe, expect, it } from "vitest";

import {
  createDocsHubAccessCookieValue,
  hasDocsHubAccess,
} from "@/features/docs-hub/access";

describe("docs hub access", () => {
  it("accepts a valid signed cookie", () => {
    const cookieValue = createDocsHubAccessCookieValue(
      "shared-password",
      "server-secret"
    );

    expect(
      hasDocsHubAccess(cookieValue, "shared-password", "server-secret")
    ).toBe(true);
  });

  it("rejects a cookie signed with another password", () => {
    const cookieValue = createDocsHubAccessCookieValue(
      "shared-password",
      "server-secret"
    );

    expect(
      hasDocsHubAccess(cookieValue, "different-password", "server-secret")
    ).toBe(false);
  });

  it("rejects a cookie signed with another secret", () => {
    const cookieValue = createDocsHubAccessCookieValue(
      "shared-password",
      "server-secret"
    );

    expect(
      hasDocsHubAccess(cookieValue, "shared-password", "other-secret")
    ).toBe(false);
  });
});
