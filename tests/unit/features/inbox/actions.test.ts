import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  answerInboxClarificationCommandMock,
  createInboxItemCommandMock,
  getInboxClarificationRequestForUserQueryMock,
  getInboxItemForUserQueryMock,
  processInboxItemCommandMock,
  redirectMock,
  revalidatePathMock,
  requireWorkspaceAccessMock,
} = vi.hoisted(() => ({
  answerInboxClarificationCommandMock: vi.fn(),
  createInboxItemCommandMock: vi.fn(),
  getInboxClarificationRequestForUserQueryMock: vi.fn(),
  getInboxItemForUserQueryMock: vi.fn(),
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
  getInboxClarificationRequestForUserQuery:
    getInboxClarificationRequestForUserQueryMock,
  getInboxItemForUserQuery: getInboxItemForUserQueryMock,
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

describe("inbox workbench actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireWorkspaceAccessMock.mockResolvedValue({
      user: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      access: {
        workspace: {
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

    const formData = createFormData({
      workspaceSlug: "demo-workspace",
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction.",
    });

    await expect(
      createInboxWorkbenchItemAction({ status: "idle" }, formData)
    ).rejects.toMatchObject({
      digest:
        "/app/demo-workspace/inbox?item=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(createInboxItemCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sourceType: "manual_note",
        rawText:
          "Public criticism from close people causes withdrawal and a defensive reaction.",
        sourceRef: null,
        idempotencyKey: expect.stringMatching(/^inbox-workbench-/),
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/demo-workspace/inbox");
  });

  it("rejects process requests for foreign inbox items", async () => {
    getInboxItemForUserQueryMock.mockResolvedValue(null);

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

  it("rejects clarification answers for foreign requests", async () => {
    getInboxClarificationRequestForUserQueryMock.mockResolvedValue(null);

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
    getInboxClarificationRequestForUserQueryMock.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      itemId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
