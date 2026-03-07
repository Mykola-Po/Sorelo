"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCanonicalStore } from "@/core/store/canonical-store";
import {
  getLocalQueueStats,
  markOperationConflict,
  resolveOperationConflict,
  runSyncCycle
} from "@/services/sync/run-sync-cycle";

type SyncPanelProps = {
  workspaceId: string | null;
  actorId: string | null;
  onRefresh: () => Promise<void>;
};

export function SyncPanel({ workspaceId, actorId, onRefresh }: SyncPanelProps) {
  const operations = useCanonicalStore((state) => state.operationLog);
  const setSyncStatus = useCanonicalStore((state) => state.setSyncStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [localStats, setLocalStats] = useState({ total: 0, pending: 0, conflicts: 0 });

  const syncDerived = useMemo(
    () => ({
      pending: operations.filter((item) => item.syncStatus === "pending").length,
      conflicts: operations.filter((item) => item.syncStatus === "conflict" || item.conflictFlag).length
    }),
    [operations]
  );

  const refreshLocalStats = useCallback(async () => {
    if (!workspaceId) {
      setLocalStats({ total: 0, pending: 0, conflicts: 0 });
      return;
    }
    const stats = await getLocalQueueStats(workspaceId);
    setLocalStats(stats);
  }, [workspaceId]);

  useEffect(() => {
    void refreshLocalStats();
  }, [operations.length, refreshLocalStats, workspaceId]);

  const doRunSync = async () => {
    if (!workspaceId || !actorId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await runSyncCycle({ workspaceId, actorId });
      await onRefresh();
      await refreshLocalStats();
      setSyncStatus(result.conflicts > 0 ? "conflict" : result.pushed > 0 ? "synced" : "pending");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Sync failed.");
      setSyncStatus("error");
    } finally {
      setBusy(false);
    }
  };

  const doMarkConflict = async () => {
    if (!workspaceId || !actorId || !selectedOperationId) return;
    setBusy(true);
    setError(null);
    try {
      await markOperationConflict({
        workspaceId,
        actorId,
        operationId: selectedOperationId
      });
      await onRefresh();
      await refreshLocalStats();
      setSyncStatus("conflict");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Mark conflict failed.");
      setSyncStatus("error");
    } finally {
      setBusy(false);
    }
  };

  const doResolveConflict = async () => {
    if (!workspaceId || !actorId || !selectedOperationId) return;
    setBusy(true);
    setError(null);
    try {
      await resolveOperationConflict({
        workspaceId,
        actorId,
        operationId: selectedOperationId
      });
      await onRefresh();
      await refreshLocalStats();
      setSyncStatus("pending");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Resolve failed.");
      setSyncStatus("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Sync Control</h2>
      <ul>
        <li>Remote pending: {syncDerived.pending}</li>
        <li>Remote conflicts: {syncDerived.conflicts}</li>
        <li>Local queue total: {localStats.total}</li>
        <li>Local queue pending: {localStats.pending}</li>
      </ul>
      {error && <p>Sync error: {error}</p>}
      <div className="form-row">
        <button type="button" disabled={!workspaceId || !actorId || busy} onClick={doRunSync}>
          Run sync now
        </button>
        <button type="button" disabled={!workspaceId || busy} onClick={() => void onRefresh()}>
          Reload remote log
        </button>
      </div>
      <div className="form-row">
        <select
          value={selectedOperationId}
          onChange={(event) => setSelectedOperationId(event.target.value)}
          disabled={!workspaceId || busy || operations.length === 0}
        >
          <option value="">Select operation</option>
          {operations.slice(-40).reverse().map((item) => (
            <option key={item.id} value={item.id}>
              {item.opType}:{item.entityType}:{item.syncStatus}
            </option>
          ))}
        </select>
        <button type="button" onClick={doMarkConflict} disabled={!selectedOperationId || busy}>
          Mark conflict
        </button>
        <button type="button" onClick={doResolveConflict} disabled={!selectedOperationId || busy}>
          Resolve conflict
        </button>
      </div>
    </section>
  );
}
