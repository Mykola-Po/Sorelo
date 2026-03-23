import { describe, expect, it } from "vitest";

import { assertInternalLearningRequestWithSecret } from "@/features/learning/internal-api";
import { assertInternalApiRequest } from "@/shared/auth/internal-api";
import {
  getInternalAuthStatus,
  hasValidInternalBearerToken,
  resolveInternalAuthSecret,
} from "@/shared/auth/internal";

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
    expect(getInternalAuthStatus(request, null)).toBe("missing_secret");
    expect(
      getInternalAuthStatus(
        new Request("http://localhost/api/internal/learning/test"),
        "shared-secret"
      )
    ).toBe("missing_header");
    expect(
      getInternalAuthStatus(
        new Request("http://localhost/api/internal/learning/test", {
          headers: {
            authorization: "Basic shared-secret",
          },
        }),
        "shared-secret"
      )
    ).toBe("malformed_bearer");
    expect(getInternalAuthStatus(request, "different-secret")).toBe(
      "invalid_token"
    );
  });

  it("uses only INTERNAL_API_SECRET for internal auth", () => {
    expect(resolveInternalAuthSecret("internal-secret")).toBe(
      "internal-secret"
    );
    expect(resolveInternalAuthSecret(null)).toBeNull();
  });

  it("returns structured auth failures for missing secret and malformed bearer", async () => {
    const missingSecretResponse = assertInternalApiRequest(
      new Request("http://localhost/api/internal/inbox/runtime"),
      null
    );
    expect(missingSecretResponse?.status).toBe(503);
    expect(await missingSecretResponse?.json()).toEqual({
      code: "internal_auth_missing_secret",
      error: "Internal API secret is not configured.",
    });

    const malformedResponse = assertInternalApiRequest(
      new Request("http://localhost/api/internal/inbox/runtime", {
        headers: {
          authorization: "Token shared-secret",
        },
      }),
      "shared-secret"
    );
    expect(malformedResponse?.status).toBe(401);
    expect(await malformedResponse?.json()).toEqual({
      code: "internal_auth_malformed_bearer",
      error: "Authorization header must use a Bearer token.",
    });
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
      code: "internal_auth_invalid_token",
      error: "Unauthorized.",
    });
  });
});
