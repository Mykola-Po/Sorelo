import "server-only";

import { cache } from "react";
import { and, count, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import {
  userPreferences,
  users,
  workspaceMembers,
  workspaces,
} from "@/shared/db/schema";

export const listWorkspacesForUser = cache(async (userId: string) => {
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
});

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

export const getLastActiveWorkspaceForUser = cache(async (userId: string) => {
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
});

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
