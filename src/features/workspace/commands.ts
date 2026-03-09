import "server-only";

import { and, eq } from "drizzle-orm";

import { recordActivity } from "@/features/activity/commands";
import {
  canTransitionMemberRole,
  normalizeWorkspaceSlug,
} from "@/features/workspace/utils";
import { canManageMembers, type WorkspaceRole } from "@/shared/auth/policies";
import { db } from "@/shared/db/client";
import {
  userPreferences,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";

async function setLastActiveWorkspace(
  executor: Pick<typeof db, "insert">,
  userId: string,
  workspaceId: string
) {
  await executor
    .insert(userPreferences)
    .values({
      userId,
      lastActiveWorkspaceId: workspaceId,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        lastActiveWorkspaceId: workspaceId,
        updatedAt: new Date(),
      },
    });
}

export async function createWorkspaceCommand(input: {
  userId: string;
  name: string;
  slug?: string | null;
}) {
  const slug = normalizeWorkspaceSlug(input.slug || input.name);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: input.name,
        slug,
        createdByUserId: input.userId,
      })
      .returning();

    if (!workspace) {
      throw new Error("Workspace creation failed.");
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: input.userId,
      role: "owner",
    });

    await setLastActiveWorkspace(tx, input.userId, workspace.id);

    await recordActivity(tx, {
      workspaceId: workspace.id,
      actorUserId: input.userId,
      entityType: "workspace",
      entityId: workspace.id,
      action: "workspace.created",
      payload: {
        name: workspace.name,
        slug: workspace.slug,
      },
    });

    return workspace;
  });
}

export async function updateMemberRoleCommand(input: {
  actorUserId: string;
  workspaceId: string;
  targetUserId: string;
  nextRole: WorkspaceRole;
}) {
  const [actorMembership] = await db
    .select({
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.userId, input.actorUserId)
      )
    )
    .limit(1);

  if (!actorMembership || !canManageMembers(actorMembership.role)) {
    throw new Error("You do not have permission to manage workspace members.");
  }

  const [targetMembership] = await db
    .select({
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.userId, input.targetUserId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    throw new Error("Member not found.");
  }

  if (
    !canTransitionMemberRole(
      actorMembership.role,
      targetMembership.role,
      input.nextRole
    )
  ) {
    throw new Error("This role change is not allowed.");
  }

  await db
    .update(workspaceMembers)
    .set({
      role: input.nextRole,
    })
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.workspaceId),
        eq(workspaceMembers.userId, input.targetUserId)
      )
    );

  await recordActivity(db, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: "workspace_member",
    entityId: input.targetUserId,
    action: "workspace.member_role_updated",
    payload: {
      role: input.nextRole,
    },
  });
}

export async function setLastActiveWorkspaceCommand(input: {
  userId: string;
  workspaceId: string;
}) {
  await setLastActiveWorkspace(db, input.userId, input.workspaceId);
}
