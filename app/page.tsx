import { AuthPanel } from "@/features/auth/auth-panel";
import { GraphSummary } from "@/features/graph/graph-summary";
import { WorkspaceGraphPanel } from "@/features/graph/workspace-graph-panel";
import { ScenarioSummary } from "@/features/scenario/scenario-summary";

export default function HomePage() {
  return (
    <main>
      <h1>Sorela V1 Foundation</h1>
      <p>
        Project initialized as a local-first explainable decision mapping tool.
      </p>
      <AuthPanel />
      <WorkspaceGraphPanel />
      <GraphSummary />
      <ScenarioSummary />
    </main>
  );
}
