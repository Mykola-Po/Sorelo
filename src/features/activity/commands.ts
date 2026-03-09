import "server-only";

import type { Database } from "@/shared/db/client";
import { activityLog } from "@/shared/db/schema";

type ActivityWriter = Pick<Database, "insert">;

export async function recordActivity(
  dbOrTx: ActivityWriter,
  input: {
    workspaceId: string;
    actorUserId: string;
    entityType: string;
    entityId: string;
    action: string;
    payload?: Record<string, unknown>;
  }
) {
  await dbOrTx.insert(activityLog).values({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    payload: input.payload ?? {},
  });
}
