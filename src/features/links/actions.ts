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
  type FieldErrors,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

type LinkFormField =
  | "sourceConceptId"
  | "targetConceptId"
  | "relationType"
  | "strength"
  | "description";
type LinkMutation = "created" | "updated";

export type LinkMutationPayload = {
  linkId: string;
  mutation: LinkMutation;
  eventId: string;
};

export type LinkActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors<LinkFormField>;
  payload?: LinkMutationPayload;
};

export async function createLinkAction(
  _: LinkActionState,
  formData: FormData
): Promise<LinkActionState> {
  const parsed = createLinkSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    expectedRevision: formData.get("expectedRevision"),
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
    const link = await createLinkCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      expectedRevision: parsed.data.expectedRevision,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description || null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    const eventId = crypto.randomUUID();
    return {
      status: "success",
      payload: {
        linkId: link.id,
        mutation: "created",
        eventId,
      },
    };
  } catch (error) {
    return toActionError<LinkFormField>(
      error instanceof Error ? error.message : "Unable to create link."
    );
  }
}

export async function updateLinkAction(
  _: LinkActionState,
  formData: FormData
): Promise<LinkActionState> {
  const parsed = updateLinkSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    linkId: formData.get("linkId"),
    expectedContentRevision: formData.get("expectedContentRevision"),
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
    const link = await updateLinkCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      expectedContentRevision: parsed.data.expectedContentRevision,
      linkId: parsed.data.linkId,
      sourceConceptId: parsed.data.sourceConceptId,
      targetConceptId: parsed.data.targetConceptId,
      relationType: parsed.data.relationType,
      strength: parsed.data.strength,
      description: parsed.data.description || null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    const eventId = crypto.randomUUID();
    return {
      status: "success",
      payload: {
        linkId: link.id,
        mutation: "updated",
        eventId,
      },
    };
  } catch (error) {
    return toActionError<LinkFormField>(
      error instanceof Error ? error.message : "Unable to update link."
    );
  }
}

export async function deleteLinkAction(formData: FormData) {
  const parsed = deleteLinkSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    expectedRevision: formData.get("expectedRevision"),
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
    expectedRevision: parsed.data.expectedRevision,
    linkId: parsed.data.linkId,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}
