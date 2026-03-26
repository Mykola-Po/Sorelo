import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  answerInboxClarificationCommandMock,
  assertInternalInboxRequestMock,
  createInboxItemCommandMock,
  getInboxItemDetailQueryMock,
  processInboxItemCommandMock,
} = vi.hoisted(() => ({
  answerInboxClarificationCommandMock: vi.fn(),
  assertInternalInboxRequestMock: vi.fn(),
  createInboxItemCommandMock: vi.fn(),
  getInboxItemDetailQueryMock: vi.fn(),
  processInboxItemCommandMock: vi.fn(),
}));

vi.mock("@/features/inbox/internal-api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/inbox/internal-api")
  >("@/features/inbox/internal-api");

  return {
    ...actual,
    assertInternalInboxRequest: assertInternalInboxRequestMock,
  };
});

vi.mock("@/features/inbox/commands", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/inbox/commands")
  >("@/features/inbox/commands");

  return {
    ...actual,
    answerInboxClarificationCommand: answerInboxClarificationCommandMock,
    createInboxItemCommand: createInboxItemCommandMock,
    processInboxItemCommand: processInboxItemCommandMock,
  };
});

vi.mock("@/features/inbox/queries", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/inbox/queries")
  >("@/features/inbox/queries");

  return {
    ...actual,
    getInboxItemDetailQuery: getInboxItemDetailQueryMock,
  };
});

import { InboxCommandError } from "@/features/inbox/commands";
import { POST as answerClarificationRoute } from "../../../../app/api/internal/inbox/clarification-requests/[requestId]/answer/route";
import { GET as getInboxItemRoute } from "../../../../app/api/internal/inbox/items/[itemId]/route";
import { POST as processInboxItemRoute } from "../../../../app/api/internal/inbox/items/[itemId]/process/route";
import { POST as createInboxItemRoute } from "../../../../app/api/internal/inbox/items/route";

function createAuthorizedRequest(
  url: string,
  init?: RequestInit,
  caller = "inbox-test-caller"
) {
  return new Request(url, {
    ...init,
    headers: {
      authorization: "Bearer internal-secret",
      "x-internal-caller": caller,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function allowInboxAuth(channel: "create" | "process" | "runtime" = "create") {
  assertInternalInboxRequestMock.mockReturnValue({
    ok: true as const,
    caller: `inbox-${channel}-caller`,
    channel,
  });
}

describe("internal inbox route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowInboxAuth();
  });

  it("passes through shared internal auth failures", async () => {
    assertInternalInboxRequestMock.mockReturnValue(
      {
        ok: false as const,
        response: NextResponse.json(
          {
            code: "internal_auth_invalid_token",
            error: "Unauthorized.",
          },
          { status: 401 }
        ),
      }
    );

    const response = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "internal_auth_invalid_token",
      error: "Unauthorized.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("returns 400 with a machine-readable code for invalid JSON on create", async () => {
    const response = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "inbox_invalid_json",
      error: "Invalid JSON body.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("returns 400 with a machine-readable code for invalid payloads", async () => {
    const response = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "inbox_invalid_payload",
      error: "Invalid request payload.",
    });
    expect(createInboxItemCommandMock).not.toHaveBeenCalled();
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("returns 201 for newly created inbox items", async () => {
    createInboxItemCommandMock.mockResolvedValue({
      created: true,
      item: {
        id: "11111111-1111-4111-8111-111111111111",
      },
    });

    const response = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          mapId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sourceType: "manual_note",
          rawText: "Signal for Inbox.",
          idempotencyKey: "key-1",
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("returns 200 for idempotent create replays", async () => {
    createInboxItemCommandMock.mockResolvedValue({
      created: false,
      item: {
        id: "11111111-1111-4111-8111-111111111111",
      },
    });

    const response = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          mapId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sourceType: "manual_note",
          rawText: "Signal for Inbox.",
          idempotencyKey: "key-1",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("returns command error taxonomy for create conflicts and access failures", async () => {
    createInboxItemCommandMock
      .mockRejectedValueOnce(
        new InboxCommandError(
          "Workspace access required.",
          403,
          "inbox_workspace_access_required"
        )
      )
      .mockRejectedValueOnce(
        new InboxCommandError(
          "Idempotency key already belongs to another inbox item.",
          409,
          "inbox_duplicate_conflict"
        )
      );

    const forbiddenResponse = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          mapId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sourceType: "manual_note",
          rawText: "Signal for Inbox.",
          idempotencyKey: "key-1",
        }),
      })
    );
    const conflictResponse = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          mapId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sourceType: "manual_note",
          rawText: "Signal for Inbox.",
          idempotencyKey: "key-1",
        }),
      })
    );

    expect(forbiddenResponse.status).toBe(403);
    expect(await forbiddenResponse.json()).toEqual({
      code: "inbox_workspace_access_required",
      error: "Workspace access required.",
    });
    expect(conflictResponse.status).toBe(409);
    expect(await conflictResponse.json()).toEqual({
      code: "inbox_duplicate_conflict",
      error: "Idempotency key already belongs to another inbox item.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("returns 500 with a stable code for unexpected create failures", async () => {
    createInboxItemCommandMock.mockRejectedValue(new Error("boom"));

    const response = await createInboxItemRoute(
      createAuthorizedRequest("http://localhost/api/internal/inbox/items", {
        method: "POST",
        body: JSON.stringify({
          userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          mapId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sourceType: "manual_note",
          rawText: "Signal for Inbox.",
          idempotencyKey: "key-1",
        }),
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "inbox_unexpected_error",
      error: "Unable to create inbox item.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "create"
    );
  });

  it("requires workspace scope on the item detail route", async () => {
    const response = await getInboxItemRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/items/11111111-1111-4111-8111-111111111111"
      ),
      {
        params: Promise.resolve({
          itemId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "inbox_invalid_payload",
      error: "Invalid inbox item request.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });

  it("returns 404 when the requested item is outside the declared workspace", async () => {
    getInboxItemDetailQueryMock.mockResolvedValue(null);

    const response = await getInboxItemRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/items/11111111-1111-4111-8111-111111111111?workspaceId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      ),
      {
        params: Promise.resolve({
          itemId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: "inbox_item_not_found",
      error: "Inbox item not found.",
    });
    expect(getInboxItemDetailQueryMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      itemId: "11111111-1111-4111-8111-111111111111",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });

  it("returns 500 JSON when the item detail route fails unexpectedly", async () => {
    getInboxItemDetailQueryMock.mockRejectedValue(new Error("boom"));

    const response = await getInboxItemRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/items/11111111-1111-4111-8111-111111111111?workspaceId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
      ),
      {
        params: Promise.resolve({
          itemId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "inbox_unexpected_error",
      error: "Unable to load inbox item.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });

  it("requires workspace scope on the process route and returns conflict codes", async () => {
    let response = await processInboxItemRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/items/11111111-1111-4111-8111-111111111111/process",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ),
      {
        params: Promise.resolve({
          itemId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "inbox_invalid_payload",
      error: "Invalid request payload.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );

    processInboxItemCommandMock.mockRejectedValueOnce(
      new InboxCommandError(
        "Inbox item is waiting for a clarification answer and cannot be blindly reprocessed.",
        409,
        "inbox_process_state_conflict"
      )
    );

    response = await processInboxItemRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/items/11111111-1111-4111-8111-111111111111/process",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          }),
        }
      ),
      {
        params: Promise.resolve({
          itemId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "inbox_process_state_conflict",
      error:
        "Inbox item is waiting for a clarification answer and cannot be blindly reprocessed.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });

  it("passes the declared workspace scope into the process command", async () => {
    processInboxItemCommandMock.mockResolvedValue({
      item: {
        id: "11111111-1111-4111-8111-111111111111",
      },
    });

    const response = await processInboxItemRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/items/11111111-1111-4111-8111-111111111111/process",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          }),
        }
      ),
      {
        params: Promise.resolve({
          itemId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(processInboxItemCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      itemId: "11111111-1111-4111-8111-111111111111",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });

  it("requires workspace scope on the clarification answer route and returns 404/409", async () => {
    let response = await answerClarificationRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/clarification-requests/11111111-1111-4111-8111-111111111111/answer",
        {
          method: "POST",
          body: JSON.stringify({
            answerText: "Need more context.",
          }),
        }
      ),
      {
        params: Promise.resolve({
          requestId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "inbox_invalid_payload",
      error: "Invalid request payload.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );

    answerInboxClarificationCommandMock
      .mockRejectedValueOnce(
        new InboxCommandError(
          "Clarification request not found.",
          404,
          "inbox_clarification_request_not_found"
        )
      )
      .mockRejectedValueOnce(
        new InboxCommandError(
          "Clarification request is no longer pending.",
          409,
          "inbox_clarification_state_conflict"
        )
      );

    response = await answerClarificationRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/clarification-requests/11111111-1111-4111-8111-111111111111/answer",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            answerText: "Need more context.",
          }),
        }
      ),
      {
        params: Promise.resolve({
          requestId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: "inbox_clarification_request_not_found",
      error: "Clarification request not found.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );

    response = await answerClarificationRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/clarification-requests/11111111-1111-4111-8111-111111111111/answer",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            answerText: "Need more context.",
          }),
        }
      ),
      {
        params: Promise.resolve({
          requestId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "inbox_clarification_state_conflict",
      error: "Clarification request is no longer pending.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });

  it("passes the declared workspace scope into the clarification answer command", async () => {
    answerInboxClarificationCommandMock.mockResolvedValue({
      item: {
        id: "22222222-2222-4222-8222-222222222222",
      },
    });

    const response = await answerClarificationRoute(
      createAuthorizedRequest(
        "http://localhost/api/internal/inbox/clarification-requests/11111111-1111-4111-8111-111111111111/answer",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            answerText: "Need more context.",
          }),
        }
      ),
      {
        params: Promise.resolve({
          requestId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(answerInboxClarificationCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      requestId: "11111111-1111-4111-8111-111111111111",
      answerText: "Need more context.",
    });
    expect(assertInternalInboxRequestMock).toHaveBeenCalledWith(
      expect.any(Request),
      "process"
    );
  });
});
