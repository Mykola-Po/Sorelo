"use server";

import { revalidatePath } from "next/cache";

import {
  assignTaskCommand,
  createTaskCommand,
  removeTaskCommand,
  renameTaskCommand,
  updateTaskStatusCommand,
} from "@/features/tasks/commands";
import {
  assignTaskSchema,
  createTaskSchema,
  removeTaskSchema,
  renameTaskSchema,
  updateTaskStatusSchema,
} from "@/features/tasks/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceProjectPath } from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

export async function createTaskAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<"title" | "description", string[]>>;
  },
  formData: FormData
) {
  const parsed = createTaskSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"title" | "description">(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await createTaskCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description || null,
    });

    revalidatePath(
      workspaceProjectPath(parsed.data.workspaceSlug, parsed.data.projectId)
    );
    return createIdleState<"title" | "description">();
  } catch (error) {
    return toActionError<"title" | "description">(
      error instanceof Error ? error.message : "Unable to create task."
    );
  }
}

export async function updateTaskStatusAction(formData: FormData) {
  const parsed = updateTaskStatusSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Invalid task status update.");
  }

  const { user, access } = await requireWorkspaceAccess(
    parsed.data.workspaceSlug
  );
  await updateTaskStatusCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    taskId: parsed.data.taskId,
    status: parsed.data.status,
  });

  revalidatePath(
    workspaceProjectPath(parsed.data.workspaceSlug, parsed.data.projectId)
  );
}

export async function assignTaskAction(formData: FormData) {
  const rawAssignee = formData.get("assigneeUserId");
  const parsed = assignTaskSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    taskId: formData.get("taskId"),
    assigneeUserId: rawAssignee ? String(rawAssignee) : null,
  });

  if (!parsed.success) {
    throw new Error("Invalid task assignment.");
  }

  const { user, access } = await requireWorkspaceAccess(
    parsed.data.workspaceSlug
  );
  await assignTaskCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    taskId: parsed.data.taskId,
    assigneeUserId: parsed.data.assigneeUserId,
  });
}

export async function renameTaskAction(formData: FormData) {
  const parsed = renameTaskSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    taskId: formData.get("taskId"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    throw new Error("Invalid task rename payload.");
  }

  const { user, access } = await requireWorkspaceAccess(
    parsed.data.workspaceSlug
  );
  await renameTaskCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    taskId: parsed.data.taskId,
    title: parsed.data.title,
  });
}

export async function removeTaskAction(formData: FormData) {
  const parsed = removeTaskSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid task removal payload.");
  }

  const { user, access } = await requireWorkspaceAccess(
    parsed.data.workspaceSlug
  );
  await removeTaskCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    taskId: parsed.data.taskId,
  });

  revalidatePath(
    workspaceProjectPath(parsed.data.workspaceSlug, parsed.data.projectId)
  );
}
