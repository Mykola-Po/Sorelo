"use server";

import { revalidatePath } from "next/cache";

import {
  createLinkCommand,
  deleteLinkCommand,
  updateLinkCommand,
} from "@/features/links/commands";
import {
  createLinkSchema,
  deleteLinkSchema,
  updateLinkSchema,
} from "@/features/links/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

export async function createLinkAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<
      Record<
        "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description",
        string[]
      >
    >;
  },
  formData: FormData
) {
  const parsed = createLinkSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    sourceConceptId: formData.get("sourceConceptId"),
    targetConceptId: formData.get("targetConceptId"),
    relationType: formData.get("relationType"),
    strength: formData.get("strength"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
    >(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
    await createLinkCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description || null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    return createIdleState<
      "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
    >();
  } catch (error) {
    return toActionError<
      "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
    >(error instanceof Error ? error.message : "Unable to create link.");
  }
}

export async function updateLinkAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<
      Record<
        "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description",
        string[]
      >
    >;
  },
  formData: FormData
) {
  const parsed = updateLinkSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    linkId: formData.get("linkId"),
    sourceConceptId: formData.get("sourceConceptId"),
    targetConceptId: formData.get("targetConceptId"),
    relationType: formData.get("relationType"),
    strength: formData.get("strength"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
    >(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
    await updateLinkCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      linkId: parsed.data.linkId,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description || null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    return createIdleState<
      "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
    >();
  } catch (error) {
    return toActionError<
      "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
    >(error instanceof Error ? error.message : "Unable to update link.");
  }
}

export async function deleteLinkAction(formData: FormData) {
  const parsed = deleteLinkSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    linkId: formData.get("linkId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid link removal payload.");
  }

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await deleteLinkCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    linkId: parsed.data.linkId,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}
