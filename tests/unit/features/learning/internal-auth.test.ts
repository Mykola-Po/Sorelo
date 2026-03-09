import { describe, expect, it } from "vitest";

import { assertInternalLearningRequestWithSecret } from "@/features/learning/internal-api";
import { getInternalAuthStatus, hasValidInternalBearerToken } from "@/shared/auth/internal";

describe("internal learning auth", () => {
  it("accepts the exact bearer token", () => {
    expect(
      hasValidInternalBearerToken("Bearer shared-secret", "shared-secret")
    ).toBe(true);
  });

  it("rejects malformed or incorrect bearer tokens", () => {
    expect(
      hasValidInternalBearerToken("Bearer wrong-secret", "shared-secret")
    ).toBe(false);
    expect(hasValidInternalBearerToken("shared-secret", "shared-secret")).toBe(
      false
    );
  });

  it("reports request auth status", () => {
    const request = new Request("http://localhost/api/internal/learning/test", {
      headers: {
        authorization: "Bearer shared-secret",
      },
    });

    expect(getInternalAuthStatus(request, "shared-secret")).toBe("authorized");
    expect(getInternalAuthStatus(request, null)).toBe("misconfigured");
    expect(getInternalAuthStatus(request, "different-secret")).toBe(
      "unauthorized"
    );
  });

  it("returns 401 for unauthorized internal requests", async () => {
    const request = new Request("http://localhost/api/internal/learning/test", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = assertInternalLearningRequestWithSecret(
      request,
      "shared-secret"
    );

    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({
      error: "Unauthorized.",
    });
  });
});
