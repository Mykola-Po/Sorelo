import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { maps, workspaceMembers } from "@/shared/db/schema";

export async function requireWorkspaceMembership(
  workspaceId: string,
  userId: string
) {
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

  if (!membership) {
    throw new Error("Workspace access required.");
  }

  return membership;
}

export async function requireActiveMap(workspaceId: string, mapId: string) {
  const [map] = await db
    .select({
      id: maps.id,
      title: maps.title,
      workspaceId: maps.workspaceId,
    })
    .from(maps)
    .where(
      and(
        eq(maps.id, mapId),
        eq(maps.workspaceId, workspaceId),
        isNull(maps.archivedAt)
      )
    )
    .limit(1);

  if (!map) {
    throw new Error("Map not found.");
  }

  return map;
}

export async function requireMapMembershipById(mapId: string, userId: string) {
  const rows = await db
    .select({
      mapId: maps.id,
      workspaceId: maps.workspaceId,
      mapTitle: maps.title,
      role: workspaceMembers.role,
    })
    .from(maps)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, maps.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .where(and(eq(maps.id, mapId), isNull(maps.archivedAt)))
    .limit(1);

  const mapAccess = rows[0];

  if (!mapAccess) {
    throw new Error("Map access required.");
  }

  return mapAccess;
}
