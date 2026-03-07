import type { OperationLogEntry } from "@/core/domain/entities";
import { dexieDb } from "@/services/persistence/dexie";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

export type SyncResult = {
  pushed: number;
  pulled: number;
  conflicts: number;
};

export async function queueLocalOperation(entry: OperationLogEntry): Promise<void> {
  await dexieDb.operations.put(entry);
}

export async function getLocalQueueStats(workspaceId: string): Promise<{
  total: number;
  pending: number;
  conflicts: number;
}> {
  const items = await dexieDb.operations.where("workspaceId").equals(workspaceId).toArray();
  return {
    total: items.length,
    pending: items.filter((item) => item.syncStatus === "pending").length,
    conflicts: items.filter((item) => item.syncStatus === "conflict" || item.conflictFlag).length
  };
}

export async function runSyncCycle(params: { workspaceId: string; actorId: string }): Promise<SyncResult> {
  const { workspaceId, actorId } = params;
  const supabase = getSupabaseBrowserClient();

  const localItems = await dexieDb.operations.where("workspaceId").equals(workspaceId).toArray();
  const pendingIds = localItems
    .filter((item) => item.actorId === actorId && item.syncStatus === "pending" && !item.conflictFlag)
    .map((item) => item.id);

  let pushed = 0;
  if (pendingIds.length > 0) {
    const { data, error } = await supabase
      .from("operation_log")
      .update({
        sync_status: "synced",
        remote_timestamp: new Date().toISOString()
      })
      .eq("workspace_id", workspaceId)
      .eq("actor_id", actorId)
      .in("id", pendingIds)
      .eq("conflict_flag", false)
      .select("id,sync_status,conflict_flag");

    if (error) {
      throw new Error(`Sync push failed: ${error.message}`);
    }

    const syncedIds = (data ?? []).map((row: { id: string }) => row.id);
    pushed = syncedIds.length;
    for (const id of syncedIds) {
      await dexieDb.operations.update(id, { syncStatus: "synced", remoteTimestamp: new Date().toISOString() });
    }
  }

  const { data: pulledRows, error: pullError } = await supabase
    .from("operation_log")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("actor_id", actorId)
    .order("local_timestamp", { ascending: false })
    .limit(200);

  if (pullError) {
    throw new Error(`Sync pull failed: ${pullError.message}`);
  }

  const pulled = pulledRows?.length ?? 0;
  let conflicts = 0;

  for (const row of pulledRows ?? []) {
    const entry: OperationLogEntry = {
      id: row.id,
      workspaceId: row.workspace_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      opType: row.op_type,
      payload: row.payload,
      localTimestamp: row.local_timestamp,
      actorId: row.actor_id,
      syncStatus: row.sync_status,
      remoteTimestamp: row.remote_timestamp,
      conflictFlag: row.conflict_flag
    };
    if (entry.conflictFlag || entry.syncStatus === "conflict") {
      conflicts += 1;
    }
    await dexieDb.operations.put(entry);
  }

  return { pushed, pulled, conflicts };
}

export async function markOperationConflict(params: {
  workspaceId: string;
  actorId: string;
  operationId: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("operation_log")
    .update({
      sync_status: "conflict",
      conflict_flag: true,
      remote_timestamp: now
    })
    .eq("workspace_id", params.workspaceId)
    .eq("actor_id", params.actorId)
    .eq("id", params.operationId);

  if (error) {
    throw new Error(`Mark conflict failed: ${error.message}`);
  }

  await dexieDb.operations.update(params.operationId, {
    syncStatus: "conflict",
    conflictFlag: true,
    remoteTimestamp: now
  });
}

export async function resolveOperationConflict(params: {
  workspaceId: string;
  actorId: string;
  operationId: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("operation_log")
    .update({
      sync_status: "synced",
      conflict_flag: false,
      remote_timestamp: now
    })
    .eq("workspace_id", params.workspaceId)
    .eq("actor_id", params.actorId)
    .eq("id", params.operationId);

  if (error) {
    throw new Error(`Resolve conflict failed: ${error.message}`);
  }

  await dexieDb.operations.update(params.operationId, {
    syncStatus: "synced",
    conflictFlag: false,
    remoteTimestamp: now
  });
}