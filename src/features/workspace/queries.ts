import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { listRecentActivity } from "@/features/activity/queries";
import { db } from "@/shared/db/client";
import {
  projects,
  tasks,
  userPreferences,
  users,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";

export async function listWorkspacesForUser(userId: string) {
  return db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
      name: workspaces.name,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name);
}

export async function countWorkspacesForUser(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  return row?.value ?? 0;
}

export async function getWorkspaceBySlugForUser(
  userId: string,
  workspaceSlug: string
) {
  const rows = await db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
      name: workspaces.name,
      createdByUserId: workspaces.createdByUserId,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaces.slug, workspaceSlug)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getWorkspaceDashboard(workspaceId: string) {
  const [projectCountRow] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  const [taskCountRow] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId));

  const recentProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      status: projects.status,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.updatedAt))
    .limit(5);

  const activity = await listRecentActivity(workspaceId, 6);

  return {
    counts: {
      projects: projectCountRow?.value ?? 0,
      tasks: taskCountRow?.value ?? 0,
    },
    recentProjects,
    activity,
  };
}

export async function getLastActiveWorkspaceForUser(userId: string) {
  const rows = await db
    .select({
      id: workspaces.id,
      slug: workspaces.slug,
      name: workspaces.name,
    })
    .from(userPreferences)
    .innerJoin(
      workspaces,
      eq(userPreferences.lastActiveWorkspaceId, workspaces.id)
    )
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, userId)
      )
    )
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(users.fullName, users.email);
}
