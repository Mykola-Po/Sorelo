import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createLinkCommandMock,
  deleteLinkCommandMock,
  revalidatePathMock,
  requireWorkspaceAccessMock,
  updateLinkCommandMock,
} = vi.hoisted(() => ({
  createLinkCommandMock: vi.fn(),
  deleteLinkCommandMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requireWorkspaceAccessMock: vi.fn(),
  updateLinkCommandMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/shared/auth/session", () => ({
  requireWorkspaceAccess: requireWorkspaceAccessMock,
}));

vi.mock("@/features/links/commands", () => ({
  createLinkCommand: createLinkCommandMock,
  deleteLinkCommand: deleteLinkCommandMock,
  updateLinkCommand: updateLinkCommandMock,
}));

import {
  createLinkAction,
  deleteLinkAction,
  updateLinkAction,
} from "@/features/links/actions";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("link actions", () => {
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

  it("forwards expectedRevision on link creation forms", async () => {
    createLinkCommandMock.mockResolvedValue({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    });

    const result = await createLinkAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        expectedRevision: "11",
        sourceConceptId: "11111111-1111-4111-8111-111111111111",
        targetConceptId: "22222222-2222-4222-8222-222222222222",
        relationType: "explains",
        strength: "4",
        description: "Link description",
      })
    );

    expect(result).toMatchObject({
      status: "success",
      payload: {
        linkId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        mutation: "created",
      },
    });
    expect(createLinkCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      expectedRevision: 11,
      sourceConceptId: "11111111-1111-4111-8111-111111111111",
      targetConceptId: "22222222-2222-4222-8222-222222222222",
      relationType: "explains",
      strength: 4,
      description: "Link description",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/demo-workspace/maps/dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    );
  });

  it("forwards expectedContentRevision on link updates", async () => {
    updateLinkCommandMock.mockResolvedValue({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    });

    const result = await updateLinkAction(
      { status: "idle" },
      createFormData({
        workspaceSlug: "demo-workspace",
        mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        linkId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        expectedContentRevision: "2",
        sourceConceptId: "11111111-1111-4111-8111-111111111111",
        targetConceptId: "22222222-2222-4222-8222-222222222222",
        relationType: "explains",
        strength: "5",
        description: "Updated link description",
      })
    );

    expect(result).toMatchObject({
      status: "success",
      payload: {
        linkId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        mutation: "updated",
      },
    });
    expect(updateLinkCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      linkId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      expectedContentRevision: 2,
      sourceConceptId: "11111111-1111-4111-8111-111111111111",
      targetConceptId: "22222222-2222-4222-8222-222222222222",
      relationType: "explains",
      strength: 5,
      description: "Updated link description",
    });
  });

  it("forwards expectedRevision on link delete forms", async () => {
    deleteLinkCommandMock.mockResolvedValue(undefined);

    await deleteLinkAction(
      createFormData({
        workspaceSlug: "demo-workspace",
        mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        expectedRevision: "12",
        linkId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      })
    );

    expect(deleteLinkCommandMock).toHaveBeenCalledWith({
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mapId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      expectedRevision: 12,
      linkId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/demo-workspace/maps/dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    );
  });
});
