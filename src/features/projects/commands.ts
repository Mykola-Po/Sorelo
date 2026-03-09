import "server-only";

import { and, eq } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import { normalizeWorkspaceSlug } from "@/features/workspace/utils";
import { canCreateProject } from "@/shared/auth/policies";
import { db } from "@/shared/db/client";
import { projects, workspaceMembers } from "@/shared/db/schema";

async function getActorWorkspaceRole(workspaceId: string, userId: string) {
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

  return membership?.role ?? null;
}

export async function createProjectCommand(input: {
  workspaceId: string;
  actorUserId: string;
  name: string;
  slug?: string | null;
  description?: string | null;
}) {
  const role = await getActorWorkspaceRole(
    input.workspaceId,
    input.actorUserId
  );

  if (!role || !canCreateProject(role)) {
    throw new Error("You do not have permission to create projects.");
  }

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        workspaceId: input.workspaceId,
        createdByUserId: input.actorUserId,
        name: input.name,
        slug: normalizeWorkspaceSlug(input.slug || input.name).slice(0, 80),
        description: input.description || null,
      })
      .returning();

    if (!project) {
      throw new Error("Project creation failed.");
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      entityType: "project",
      entityId: project.id,
      action: "project.created",
      payload: {
        name: project.name,
      },
    });

    return project;
  });
}

export async function updateProjectCommand(input: {
  workspaceId: string;
  actorUserId: string;
  projectId: string;
  name: string;
  description?: string | null;
}) {
  const role = await getActorWorkspaceRole(
    input.workspaceId,
    input.actorUserId
  );

  if (!role || !canCreateProject(role)) {
    throw new Error("You do not have permission to update projects.");
  }

  const [project] = await db
    .update(projects)
    .set({
      name: input.name,
      description: input.description || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.workspaceId, input.workspaceId),
        eq(projects.id, input.projectId)
      )
    )
    .returning();

  if (!project) {
    throw new Error("Project not found.");
  }

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "project",
    entityId: project.id,
    action: "project.updated",
    payload: {
      name: project.name,
    },
  });

  return project;
}

export async function archiveProjectCommand(input: {
  workspaceId: string;
  actorUserId: string;
  projectId: string;
}) {
  const role = await getActorWorkspaceRole(
    input.workspaceId,
    input.actorUserId
  );

  if (!role || !canCreateProject(role)) {
    throw new Error("You do not have permission to archive projects.");
  }

  const [project] = await db
    .update(projects)
    .set({
      status: "archived",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.workspaceId, input.workspaceId),
        eq(projects.id, input.projectId)
      )
    )
    .returning();

  if (!project) {
    throw new Error("Project not found.");
  }

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "project",
    entityId: project.id,
    action: "project.archived",
  });

  return project;
}
