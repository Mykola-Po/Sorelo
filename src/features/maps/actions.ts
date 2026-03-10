"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveMapCommand,
  createMapCommand,
  renameMapCommand,
} from "@/features/maps/commands";
import {
  archiveMapSchema,
  createMapSchema,
  renameMapSchema,
} from "@/features/maps/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import {
  workspaceMapPath,
  workspaceMapsPath,
} from "@/shared/config/routes";
import {
  resolveSupportedLocale,
  type SupportedLocale,
} from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

function getCreateMapLocale(formData: FormData): SupportedLocale {
  return resolveSupportedLocale(
    typeof formData.get("locale") === "string"
      ? (formData.get("locale") as string)
      : undefined
  );
}

export async function createMapAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<
      Record<"title" | "slug" | "subjectLabel" | "description", string[]>
    >;
  },
  formData: FormData
) {
  const locale = getCreateMapLocale(formData);
  const messages = getAppShellMessages(locale).createMapForm;
  const parsed = createMapSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    subjectLabel: formData.get("subjectLabel"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "title" | "slug" | "subjectLabel" | "description"
    >(parsed.error, messages.reviewFields);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const map = await createMapCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      title: parsed.data.title,
      slug: parsed.data.slug || null,
      subjectLabel: parsed.data.subjectLabel,
      description: parsed.data.description || null,
    });

    redirect(workspaceMapPath(parsed.data.workspaceSlug, map.id));
  } catch (error) {
    return toActionError<"title" | "slug" | "subjectLabel" | "description">(
      error instanceof Error ? error.message : messages.unableToCreate
    );
  }
}

export async function renameMapAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<"title" | "subjectLabel" | "description", string[]>>;
  },
  formData: FormData
) {
  const parsed = renameMapSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    title: formData.get("title"),
    subjectLabel: formData.get("subjectLabel"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"title" | "subjectLabel" | "description">(
      parsed.error
    );
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await renameMapCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      title: parsed.data.title,
      subjectLabel: parsed.data.subjectLabel,
      description: parsed.data.description || null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    revalidatePath(workspaceMapsPath(parsed.data.workspaceSlug));
    return createIdleState<"title" | "subjectLabel" | "description">();
  } catch (error) {
    return toActionError<"title" | "subjectLabel" | "description">(
      error instanceof Error ? error.message : "Unable to update map."
    );
  }
}

export async function archiveMapAction(formData: FormData) {
  const parsed = archiveMapSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await archiveMapCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
  });

  revalidatePath(workspaceMapsPath(parsed.data.workspaceSlug));
  redirect(workspaceMapsPath(parsed.data.workspaceSlug));
}
