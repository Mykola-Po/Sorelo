"use client";

import { useCanonicalStore } from "@/core/store/canonical-store";

export function ScenarioSummary() {
  const workspaceId = useCanonicalStore((state) => state.workspaceId);
  const operations = useCanonicalStore((state) => state.operationLog.length);

  return (
    <section>
      <h2>Scenario Layer</h2>
      <ul>
        <li>Workspace: {workspaceId ?? "not selected"}</li>
        <li>Operation log entries: {operations}</li>
      </ul>
      <p>Manual AI actions will be wired through Edge Functions only.</p>
    </section>
  );
}
