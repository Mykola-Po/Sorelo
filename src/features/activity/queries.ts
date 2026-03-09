import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/shared/db/client";
import { activityLog, users } from "@/shared/db/schema";

export async function listRecentActivity(workspaceId: string, limit = 8) {
  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      createdAt: activityLog.createdAt,
      actor: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.actorUserId, users.id))
    .where(eq(activityLog.workspaceId, workspaceId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
