import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  archiveConceptCommandMock,
  createConceptCommandMock,
  revalidatePathMock,
  requireWorkspaceAccessMock,
  updateConceptCommandMock,
} = vi.hoisted(() => ({
  archiveConceptCommandMock: vi.fn(),
  createConceptCommandMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requireWorkspaceAccessMock: vi.fn(),
  updateConceptCommandMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/shared/auth/session", () => ({
  requireWorkspaceAccess: requireWorkspaceAccessMock,
}));

vi.mock("@/features/concepts/commands", () => ({
  archiveConceptCommand: archiveConceptCommandMock,
  createConceptCommand: createConceptCommandMock,
  repositionConceptCommand: vi.fn(),
  updateConceptCommand: updateConceptCommandMock,
}));

import {
  archiveConceptAction,
  createConceptAction,
  updateConceptAction,
} from "@/features/concepts/actions";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("concept actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireWorkspaceAccessMock.mockResolvedValue({
      user: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      access: {
        workspace: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      },
    });
  });

  it("forwards expectedRevision on concept creation forms", async () => {
    createConceptCommandMock.mockResolvedValue({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    const result = await createConceptAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        expectedRevision: "8",
        title: "Signal",
        conceptType: "belief",
        summary: "Summary",
        description: "Description",
        x: "180",
        y: "220",
      })
    );

    expect(result).toMatchObject({
      status: "success",
      payload: {
        conceptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        mutation: "created",
      },
    });
    expect(createConceptCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      expectedRevision: 8,
      title: "Signal",
      conceptType: "belief",
      summary: "Summary",
      description: "Description",
      x: 180,
      y: 220,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/demo-workspace/maps/dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    );
  });

  it("forwards expectedContentRevision on concept updates", async () => {
    updateConceptCommandMock.mockResolvedValue({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    const result = await updateConceptAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        conceptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        expectedContentRevision: "5",
        title: "Signal",
        conceptType: "belief",
        summary: "Fresh summary",
        description: "Fresh description",
      })
    );

    expect(result).toMatchObject({
      status: "success",
      payload: {
        conceptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        mutation: "updated",
      },
    });
    expect(updateConceptCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      conceptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      expectedContentRevision: 5,
      title: "Signal",
      conceptType: "belief",
      summary: "Fresh summary",
      description: "Fresh description",
    });
  });

  it("forwards expectedRevision on concept archive forms", async () => {
    archiveConceptCommandMock.mockResolvedValue(undefined);

    await archiveConceptAction(
      createFormData({
        workspaceSlug: "demo-workspace",
        mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        expectedRevision: "9",
        conceptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      })
    );

    expect(archiveConceptCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      expectedRevision: 9,
      conceptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/demo-workspace/maps/dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    );
  });
});
