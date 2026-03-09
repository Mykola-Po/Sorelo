import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { projects, tasks, users, workspaceMembers } from "@/shared/db/schema";

export async function listProjectsForWorkspace(workspaceId: string) {
  return db
    .select({
      id: projects.id,
      workspaceId: projects.workspaceId,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectDetail(workspaceId: string, projectId: string) {
  const [project] = await db
    .select({
      id: projects.id,
      workspaceId: projects.workspaceId,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(
      and(eq(projects.workspaceId, workspaceId), eq(projects.id, projectId))
    )
    .limit(1);

  if (!project) {
    return null;
  }

  const projectTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      createdByUserId: tasks.createdByUserId,
      assigneeUserId: tasks.assigneeUserId,
      dueDate: tasks.dueDate,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(
      and(eq(tasks.workspaceId, workspaceId), eq(tasks.projectId, projectId))
    )
    .orderBy(desc(tasks.updatedAt));

  const members = await db
    .select({
      userId: users.id,
      label: users.fullName,
      email: users.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(users.fullName, users.email);

  return {
    project,
    tasks: projectTasks,
    members,
  };
}
