import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/env", () => ({
  env: {
    INBOX_INTERNAL_CREATE_SECRET: "create-secret",
    INBOX_INTERNAL_PROCESS_SECRET: "process-secret",
    INBOX_INTERNAL_RUNTIME_SECRET: "runtime-secret",
    INBOX_INTERNAL_CREATE_CALLERS: "inbox-create-service,inbox-workbench",
    INBOX_INTERNAL_PROCESS_CALLERS: "inbox-process-service,inbox-reviewer",
    INBOX_INTERNAL_RUNTIME_CALLERS: "inbox-runtime-check",
  },
}));

import {
  assertInternalInboxRequest,
  logInboxInternalRouteEvent,
} from "@/features/inbox/internal-api";

describe("inbox internal api auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a declared channel secret with an allowed caller", () => {
    const request = new Request("http://localhost/api/internal/inbox/items", {
      headers: {
        authorization: "Bearer create-secret",
        "x-internal-caller": "inbox-create-service",
      },
    });

    expect(assertInternalInboxRequest(request, "create")).toEqual({
      ok: true,
      caller: "inbox-create-service",
      channel: "create",
    });
  });

  it("rejects missing caller headers", async () => {
    const request = new Request("http://localhost/api/internal/inbox/items", {
      headers: {
        authorization: "Bearer create-secret",
      },
    });

    const result = assertInternalInboxRequest(request, "create");
    if (result.ok) {
      throw new Error("Expected auth failure for missing caller header.");
    }

    expect(result.response.status).toBe(401);
    expect(await result.response.json()).toEqual({
      code: "internal_auth_missing_caller",
      error: "Missing internal caller header.",
    });
  });

  it("rejects callers outside the channel allowlist", async () => {
    const request = new Request("http://localhost/api/internal/inbox/items", {
      headers: {
        authorization: "Bearer process-secret",
        "x-internal-caller": "inbox-runtime-check",
      },
    });

    const result = assertInternalInboxRequest(request, "process");
    if (result.ok) {
      throw new Error("Expected auth failure for forbidden caller.");
    }

    expect(result.response.status).toBe(403);
    expect(await result.response.json()).toEqual({
      code: "internal_auth_forbidden_caller",
      error: "Internal caller is not allowed for this route.",
    });
  });

  it("rejects wrong secrets for a channel", async () => {
    const request = new Request("http://localhost/api/internal/inbox/items", {
      headers: {
        authorization: "Bearer wrong-secret",
        "x-internal-caller": "inbox-create-service",
      },
    });

    const result = assertInternalInboxRequest(request, "create");
    if (result.ok) {
      throw new Error("Expected auth failure for wrong secret.");
    }

    expect(result.response.status).toBe(401);
    expect(await result.response.json()).toEqual({
      code: "internal_auth_invalid_token",
      error: "Unauthorized.",
    });
  });

  it("logs structured route outcomes without payload bodies", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logInboxInternalRouteEvent({
      channel: "runtime",
      caller: "inbox-runtime-check",
      outcome: "success",
      status: 200,
      code: "inbox_runtime_report_ok",
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [firstCall] = infoSpy.mock.calls;
    if (!firstCall) {
      throw new Error("Expected a structured inbox log call.");
    }

    const logged = JSON.parse(firstCall[0] as string);
    expect(logged).toEqual({
      event: "inbox_internal_route",
      channel: "runtime",
      caller: "inbox-runtime-check",
      outcome: "success",
      status: 200,
      code: "inbox_runtime_report_ok",
    });
  });
});
