"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveProjectCommand,
  createProjectCommand,
  updateProjectCommand,
} from "@/features/projects/commands";
import {
  archiveProjectSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/features/projects/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import {
  workspaceProjectPath,
  workspaceProjectsPath,
  workspaceRootPath,
} from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

export async function createProjectAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<"name" | "slug" | "description", string[]>>;
  },
  formData: FormData
) {
  const parsed = createProjectSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"name" | "slug" | "description">(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const project = await createProjectCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug || null,
      description: parsed.data.description || null,
    });

    redirect(workspaceProjectPath(parsed.data.workspaceSlug, project.id));
  } catch (error) {
    return toActionError<"name" | "slug" | "description">(
      error instanceof Error ? error.message : "Unable to create project."
    );
  }
}

export async function updateProjectAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<"name" | "description", string[]>>;
  },
  formData: FormData
) {
  const parsed = updateProjectSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"name" | "description">(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await updateProjectCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      description: parsed.data.description || null,
    });

    revalidatePath(
      workspaceProjectPath(parsed.data.workspaceSlug, parsed.data.projectId)
    );
    return createIdleState<"name" | "description">();
  } catch (error) {
    return toActionError<"name" | "description">(
      error instanceof Error ? error.message : "Unable to update project."
    );
  }
}

export async function archiveProjectAction(formData: FormData) {
  const parsed = archiveProjectSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    projectId: formData.get("projectId"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const { user, access } = await requireWorkspaceAccess(
    parsed.data.workspaceSlug
  );
  await archiveProjectCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    projectId: parsed.data.projectId,
  });

  revalidatePath(workspaceRootPath(parsed.data.workspaceSlug));
  redirect(workspaceProjectsPath(parsed.data.workspaceSlug));
}
