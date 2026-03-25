import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertInternalInboxRequestMock, collectInboxRuntimeReportMock } =
  vi.hoisted(() => ({
    assertInternalInboxRequestMock: vi.fn(),
    collectInboxRuntimeReportMock: vi.fn(),
  }));

vi.mock("@/features/inbox/internal-api", () => ({
  assertInternalInboxRequest: assertInternalInboxRequestMock,
}));

vi.mock("@/features/inbox/operations", () => ({
  collectInboxRuntimeReport: collectInboxRuntimeReportMock,
}));

import { GET } from "../../../../app/api/internal/inbox/runtime/route";

describe("internal inbox runtime route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth failures from the shared internal auth contract", async () => {
    assertInternalInboxRequestMock.mockReturnValue(
      NextResponse.json(
        {
          code: "internal_auth_invalid_token",
          error: "Unauthorized.",
        },
        { status: 401 }
      )
    );

    const response = await GET(
      new Request("http://localhost/api/internal/inbox/runtime")
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "internal_auth_invalid_token",
      error: "Unauthorized.",
    });
    expect(collectInboxRuntimeReportMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the runtime report is failed", async () => {
    assertInternalInboxRequestMock.mockReturnValue(null);
    collectInboxRuntimeReportMock.mockResolvedValue({
      status: "failed",
      generatedAt: "2026-03-22T12:00:00.000Z",
      checks: [],
    });

    const response = await GET(
      new Request("http://localhost/api/internal/inbox/runtime", {
        headers: {
          authorization: "Bearer internal-secret",
        },
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "failed",
      generatedAt: "2026-03-22T12:00:00.000Z",
      checks: [],
    });
  });

  it("returns 200 for degraded runtime reports", async () => {
    assertInternalInboxRequestMock.mockReturnValue(null);
    collectInboxRuntimeReportMock.mockResolvedValue({
      status: "degraded",
      generatedAt: "2026-03-22T12:00:00.000Z",
      checks: [
        {
          name: "items",
          status: "degraded",
          message: "Inbox has items waiting for manual review.",
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/internal/inbox/runtime", {
        headers: {
          authorization: "Bearer internal-secret",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "degraded",
      generatedAt: "2026-03-22T12:00:00.000Z",
      checks: [
        {
          name: "items",
          status: "degraded",
          message: "Inbox has items waiting for manual review.",
        },
      ],
    });
  });
});
