"use server";

import { revalidatePath } from "next/cache";

import {
  archiveConceptCommand,
  createConceptCommand,
  repositionConceptCommand,
  updateConceptCommand,
} from "@/features/concepts/commands";
import {
  archiveConceptSchema,
  createConceptSchema,
  repositionConceptSchema,
  updateConceptSchema,
} from "@/features/concepts/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

export async function createConceptAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<
      Record<"title" | "conceptType" | "summary" | "description", string[]>
    >;
  },
  formData: FormData
) {
  const parsed = createConceptSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    title: formData.get("title"),
    conceptType: formData.get("conceptType"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    x: formData.get("x"),
    y: formData.get("y"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "title" | "conceptType" | "summary" | "description"
    >(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await createConceptCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary || null,
      description: parsed.data.description || null,
      x: parsed.data.x ?? null,
      y: parsed.data.y ?? null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    return createIdleState<"title" | "conceptType" | "summary" | "description">();
  } catch (error) {
    return toActionError<"title" | "conceptType" | "summary" | "description">(
      error instanceof Error ? error.message : "Unable to create concept."
    );
  }
}

export async function updateConceptAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<
      Record<"title" | "conceptType" | "summary" | "description", string[]>
    >;
  },
  formData: FormData
) {
  const parsed = updateConceptSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    conceptId: formData.get("conceptId"),
    title: formData.get("title"),
    conceptType: formData.get("conceptType"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    x: formData.get("x"),
    y: formData.get("y"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "title" | "conceptType" | "summary" | "description"
    >(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await updateConceptCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      conceptId: parsed.data.conceptId,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary || null,
      description: parsed.data.description || null,
      x: parsed.data.x,
      y: parsed.data.y,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    return createIdleState<"title" | "conceptType" | "summary" | "description">();
  } catch (error) {
    return toActionError<"title" | "conceptType" | "summary" | "description">(
      error instanceof Error ? error.message : "Unable to update concept."
    );
  }
}

export async function repositionConceptAction(input: {
  workspaceSlug: string;
  mapId: string;
  conceptId: string;
  x: number;
  y: number;
}) {
  const parsed = repositionConceptSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid concept reposition payload.");
  }

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await repositionConceptCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    conceptId: parsed.data.conceptId,
    x: parsed.data.x,
    y: parsed.data.y,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}

export async function archiveConceptAction(formData: FormData) {
  const parsed = archiveConceptSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    conceptId: formData.get("conceptId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid concept archive payload.");
  }

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await archiveConceptCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    conceptId: parsed.data.conceptId,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}
