import "server-only";

import { and, eq } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import { canEditTask, hasWorkspaceRole } from "@/shared/auth/policies";
import { db } from "@/shared/db/client";
import { tasks, workspaceMembers } from "@/shared/db/schema";

async function getActorMembership(workspaceId: string, userId: string) {
  const [membership] = await db
    .select({
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  return membership ?? null;
}

async function getTaskOrThrow(workspaceId: string, taskId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.id, taskId)))
    .limit(1);

  if (!task) {
    throw new Error("Task not found.");
  }

  return task;
}

export async function createTaskCommand(input: {
  workspaceId: string;
  actorUserId: string;
  projectId: string;
  title: string;
  description?: string | null;
}) {
  const membership = await getActorMembership(
    input.workspaceId,
    input.actorUserId
  );

  if (!membership) {
    throw new Error("Workspace access required.");
  }

  return db.transaction(async (tx) => {
    const [task] = await tx
      .insert(tasks)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        title: input.title,
        description: input.description || null,
        createdByUserId: input.actorUserId,
      })
      .returning();

    if (!task) {
      throw new Error("Task creation failed.");
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "task",
      entityId: task.id,
      action: "task.created",
      payload: {
        title: task.title,
      },
    });

    return task;
  });
}

export async function updateTaskStatusCommand(input: {
  workspaceId: string;
  actorUserId: string;
  taskId: string;
  status: "todo" | "in_progress" | "done";
}) {
  const membership = await getActorMembership(
    input.workspaceId,
    input.actorUserId
  );
  const task = await getTaskOrThrow(input.workspaceId, input.taskId);

  if (
    !membership ||
    !canEditTask(membership.role, task.createdByUserId, input.actorUserId)
  ) {
    throw new Error("You do not have permission to update this task.");
  }

  const [updatedTask] = await db
    .update(tasks)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tasks.workspaceId, input.workspaceId), eq(tasks.id, input.taskId))
    )
    .returning();

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "task",
    entityId: input.taskId,
    action: "task.status_updated",
    payload: {
      status: input.status,
    },
  });

  return updatedTask;
}

export async function assignTaskCommand(input: {
  workspaceId: string;
  actorUserId: string;
  taskId: string;
  assigneeUserId: string | null;
}) {
  const membership = await getActorMembership(
    input.workspaceId,
    input.actorUserId
  );

  if (!membership || !hasWorkspaceRole(membership.role, "admin")) {
    throw new Error("You do not have permission to assign tasks.");
  }

  const [task] = await db
    .update(tasks)
    .set({
      assigneeUserId: input.assigneeUserId,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tasks.workspaceId, input.workspaceId), eq(tasks.id, input.taskId))
    )
    .returning();

  if (!task) {
    throw new Error("Task not found.");
  }

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "task",
    entityId: task.id,
    action: "task.assigned",
    payload: {
      assigneeUserId: input.assigneeUserId,
    },
  });

  return task;
}

export async function renameTaskCommand(input: {
  workspaceId: string;
  actorUserId: string;
  taskId: string;
  title: string;
}) {
  const membership = await getActorMembership(
    input.workspaceId,
    input.actorUserId
  );
  const task = await getTaskOrThrow(input.workspaceId, input.taskId);

  if (
    !membership ||
    !canEditTask(membership.role, task.createdByUserId, input.actorUserId)
  ) {
    throw new Error("You do not have permission to rename this task.");
  }

  const [updatedTask] = await db
    .update(tasks)
    .set({
      title: input.title,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tasks.workspaceId, input.workspaceId), eq(tasks.id, input.taskId))
    )
    .returning();

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "task",
    entityId: input.taskId,
    action: "task.renamed",
    payload: {
      title: input.title,
    },
  });

  return updatedTask;
}

export async function removeTaskCommand(input: {
  workspaceId: string;
  actorUserId: string;
  taskId: string;
}) {
  const membership = await getActorMembership(
    input.workspaceId,
    input.actorUserId
  );
  const task = await getTaskOrThrow(input.workspaceId, input.taskId);

  if (
    !membership ||
    !canEditTask(membership.role, task.createdByUserId, input.actorUserId)
  ) {
    throw new Error("You do not have permission to remove this task.");
  }

  await db
    .delete(tasks)
    .where(
      and(eq(tasks.workspaceId, input.workspaceId), eq(tasks.id, input.taskId))
    );

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "task",
    entityId: input.taskId,
    action: "task.removed",
  });
}
