"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createWorkspaceCommand,
  setLastActiveWorkspaceCommand,
  updateMemberRoleCommand,
} from "@/features/workspace/commands";
import {
  createWorkspaceSchema,
  switchWorkspaceSchema,
  updateMemberRoleSchema,
} from "@/features/workspace/schemas";
import { getWorkspaceBySlugForUser } from "@/features/workspace/queries";
import { requireUser, requireWorkspaceAccess } from "@/shared/auth/session";
import {
  ACTIVE_WORKSPACE_COOKIE,
  workspaceMembersPath,
  workspaceRootPath,
} from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

export async function createWorkspaceAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<"name" | "slug", string[]>>;
  },
  formData: FormData
) {
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"name" | "slug">(parsed.error);
  }

  try {
    const user = await requireUser();
    const workspace = await createWorkspaceCommand({
      userId: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug || null,
    });

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.slug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    redirect(workspaceRootPath(workspace.slug));
  } catch (error) {
    return toActionError<"name" | "slug">(
      error instanceof Error ? error.message : "Unable to create workspace."
    );
  }
}

export async function switchActiveWorkspaceAction(formData: FormData) {
  "use server";

  const parsed = switchWorkspaceSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const user = await requireUser();
  const workspace = await getWorkspaceBySlugForUser(
    user.id,
    parsed.data.workspaceSlug
  );

  if (!workspace) {
    redirect("/app/new-workspace");
  }

  await setLastActiveWorkspaceCommand({
    userId: user.id,
    workspaceId: workspace.id,
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(workspaceRootPath(workspace.slug));
}

export async function updateMemberRoleAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<"role", string[]>>;
  },
  formData: FormData
) {
  const parsed = updateMemberRoleSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"role">(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await updateMemberRoleCommand({
      actorUserId: user.id,
      workspaceId: access.workspace.id,
      targetUserId: parsed.data.userId,
      nextRole: parsed.data.role,
    });

    revalidatePath(workspaceMembersPath(parsed.data.workspaceSlug));
    return createIdleState<"role">();
  } catch (error) {
    return toActionError<"role">(
      error instanceof Error ? error.message : "Unable to update member role."
    );
  }
}
