import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  answerInboxClarificationCommandMock,
  createInboxItemCommandMock,
  getInboxClarificationRequestForWorkspaceQueryMock,
  getInboxItemForWorkspaceQueryMock,
  processInboxItemCommandMock,
  redirectMock,
  revalidatePathMock,
  requireWorkspaceAccessMock,
} = vi.hoisted(() => ({
  answerInboxClarificationCommandMock: vi.fn(),
  createInboxItemCommandMock: vi.fn(),
  getInboxClarificationRequestForWorkspaceQueryMock: vi.fn(),
  getInboxItemForWorkspaceQueryMock: vi.fn(),
  processInboxItemCommandMock: vi.fn(),
  redirectMock: vi.fn((href: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: href });
    throw error;
  }),
  revalidatePathMock: vi.fn(),
  requireWorkspaceAccessMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError(error: unknown) {
    return error instanceof Error && error.message === "NEXT_REDIRECT";
  },
}));

vi.mock("@/shared/auth/session", () => ({
  requireWorkspaceAccess: requireWorkspaceAccessMock,
}));

vi.mock("@/features/inbox/commands", () => ({
  answerInboxClarificationCommand: answerInboxClarificationCommandMock,
  createInboxItemCommand: createInboxItemCommandMock,
  processInboxItemCommand: processInboxItemCommandMock,
}));

vi.mock("@/features/inbox/queries", () => ({
  getInboxClarificationRequestForWorkspaceQuery:
    getInboxClarificationRequestForWorkspaceQueryMock,
  getInboxItemForWorkspaceQuery: getInboxItemForWorkspaceQueryMock,
}));

import {
  answerInboxClarificationAction,
  createInboxWorkbenchItemAction,
  processInboxWorkbenchItemAction,
} from "@/features/inbox/actions";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

type RedirectListState = {
  listView: string;
  listStatus: string;
  listRoute: string;
  listMapId: string;
  listSort: string;
  listPage: string;
  listPageSize: string;
};

function buildInboxRedirectDigest(
  workspaceSlug: string,
  itemId: string,
  listState: RedirectListState
) {
  const params = new URLSearchParams();

  if (listState.listView !== "needs-attention") {
    params.set("view", listState.listView);
  }

  if (listState.listStatus !== "any") {
    params.set("status", listState.listStatus);
  }

  if (listState.listRoute !== "any") {
    params.set("route", listState.listRoute);
  }

  if (listState.listMapId !== "any") {
    params.set("mapId", listState.listMapId);
  }

  if (listState.listSort !== "updated_desc") {
    params.set("sort", listState.listSort);
  }

  if (listState.listPage !== "1") {
    params.set("page", listState.listPage);
  }

  if (listState.listPageSize !== "25") {
    params.set("pageSize", listState.listPageSize);
  }

  params.set("item", itemId);

  return `/app/${workspaceSlug}/inbox?${params.toString()}`;
}

describe("inbox workbench actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireWorkspaceAccessMock.mockResolvedValue({
      user: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      access: {
        workspace: {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          name: "Test workspace",
        },
      },
    });
  });

  it("creates an inbox item with a server-side idempotency key and redirects to the selected item", async () => {
    createInboxItemCommandMock.mockResolvedValue({
      item: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
    });

    const listState = {
      listView: "all",
      listStatus: "clarification_requested",
      listRoute: "clarify",
      listMapId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      listSort: "created_desc",
      listPage: "3",
      listPageSize: "25",
    };

    const formData = createFormData({
      workspaceSlug: "demo-workspace",
      mapId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction.",
      ...listState,
    });

    await expect(
      createInboxWorkbenchItemAction({ status: "idle" }, formData)
    ).rejects.toMatchObject({
      digest: buildInboxRedirectDigest(
        "demo-workspace",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        listState
      ),
    });

    expect(createInboxItemCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        mapId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        sourceType: "manual_note",
        rawText:
          "Public criticism from close people causes withdrawal and a defensive reaction.",
        sourceRef: null,
        idempotencyKey: expect.stringMatching(/^inbox-workbench-/),
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/demo-workspace/inbox"
    );
  });

  it("rejects process requests for inbox items outside the current workspace", async () => {
    getInboxItemForWorkspaceQueryMock.mockResolvedValue(null);

    const result = await processInboxWorkbenchItemAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        itemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      })
    );

    expect(result).toEqual({
      status: "error",
      message: "Inbox item not found.",
    });
    expect(processInboxItemCommandMock).not.toHaveBeenCalled();
  });

  it("processes scoped inbox items inside the current workspace", async () => {
    getInboxItemForWorkspaceQueryMock.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });

    const listState = {
      listView: "needs-attention",
      listStatus: "any",
      listRoute: "any",
      listMapId: "any",
      listSort: "updated_desc",
      listPage: "2",
      listPageSize: "25",
    };

    await expect(
      processInboxWorkbenchItemAction(
        { status: "idle" },
        createFormData({
          workspaceSlug: "demo-workspace",
          itemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          ...listState,
        })
      )
    ).rejects.toMatchObject({
      digest: buildInboxRedirectDigest(
        "demo-workspace",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        listState
      ),
    });

    expect(processInboxItemCommandMock).toHaveBeenCalledWith({
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      itemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
  });

  it("rejects clarification answers for requests outside the current workspace", async () => {
    getInboxClarificationRequestForWorkspaceQueryMock.mockResolvedValue(null);

    const result = await answerInboxClarificationAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        answerText: "It starts when the criticism comes from a close partner.",
      })
    );

    expect(result).toEqual({
      status: "error",
      message: "Clarification request not found.",
    });
    expect(answerInboxClarificationCommandMock).not.toHaveBeenCalled();
  });

  it("surfaces command conflicts from clarification answers as visible form errors", async () => {
    getInboxClarificationRequestForWorkspaceQueryMock.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      itemId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      question: "What exactly triggers the reaction first?",
      reason: "Missing trigger detail.",
      status: "pending",
      answeredAt: null,
    });
    answerInboxClarificationCommandMock.mockRejectedValue(
      new Error("Clarification request is no longer pending.")
    );

    const result = await answerInboxClarificationAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        answerText: "It starts when the criticism comes from a close partner.",
      })
    );

    expect(result).toEqual({
      status: "error",
      message: "Clarification request is no longer pending.",
    });
    expect(answerInboxClarificationCommandMock).toHaveBeenCalledWith({
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      answerText: "It starts when the criticism comes from a close partner.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("redirects clarification answers back to the selected item while preserving list state", async () => {
    getInboxClarificationRequestForWorkspaceQueryMock.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      itemId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      question: "What exactly triggers the reaction first?",
      reason: "Missing trigger detail.",
      status: "pending",
      answeredAt: null,
    });
    answerInboxClarificationCommandMock.mockResolvedValue({
      item: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
    });

    const listState = {
      listView: "all",
      listStatus: "clarification_requested",
      listRoute: "clarify",
      listMapId: "any",
      listSort: "updated_asc",
      listPage: "4",
      listPageSize: "25",
    };

    await expect(
      answerInboxClarificationAction(
        { status: "idle" },
        createFormData({
          workspaceSlug: "demo-workspace",
          requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          answerText: "It starts when the criticism comes from a close partner.",
          ...listState,
        })
      )
    ).rejects.toMatchObject({
      digest: buildInboxRedirectDigest(
        "demo-workspace",
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        listState
      ),
    });

    expect(answerInboxClarificationCommandMock).toHaveBeenCalledWith({
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workspaceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      answerText: "It starts when the criticism comes from a close partner.",
    });
  });
});
