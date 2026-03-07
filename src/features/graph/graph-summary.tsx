"use client";

import { useCanonicalStore } from "@/core/store/canonical-store";

export function GraphSummary() {
  const nodes = useCanonicalStore((state) => Object.keys(state.nodes).length);
  const edges = useCanonicalStore((state) => Object.keys(state.edges).length);
  const operationLog = useCanonicalStore((state) => state.operationLog);
  const syncStatus = useCanonicalStore((state) => state.syncStatus);
  const pendingOps = operationLog.filter((item) => item.syncStatus === "pending").length;
  const conflictOps = operationLog.filter((item) => item.syncStatus === "conflict" || item.conflictFlag).length;

  return (
    <section>
      <h2>Graph State</h2>
      <ul>
        <li>Nodes: {nodes}</li>
        <li>Edges: {edges}</li>
        <li>Sync: {syncStatus}</li>
        <li>Pending operations: {pendingOps}</li>
        <li>Conflicts: {conflictOps}</li>
      </ul>
    </section>
  );
}
