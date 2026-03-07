"use client";

import { useMemo, useState } from "react";
import { useCanonicalStore } from "@/core/store/canonical-store";
import { EdgeFunctionAiProvider } from "@/services/ai/ai-provider";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

export function ScenarioAiPanel() {
  const workspaceId = useCanonicalStore((state) => state.workspaceId);
  const nodesById = useCanonicalStore((state) => state.nodes);
  const edgesById = useCanonicalStore((state) => state.edges);

  const nodes = useMemo(() => Object.values(nodesById), [nodesById]);
  const edges = useMemo(() => Object.values(edgesById), [edgesById]);

  const [seedNodeId, setSeedNodeId] = useState("");
  const [scenarioContext, setScenarioContext] = useState("");
  const [scenarioResult, setScenarioResult] = useState<string>("");
  const [scenarioPath, setScenarioPath] = useState<string[]>([]);
  const [scenarioConfidence, setScenarioConfidence] = useState<string>("-");

  const [inboxText, setInboxText] = useState("");
  const [inboxItems, setInboxItems] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(() => new EdgeFunctionAiProvider(), []);

  const runScenario = async () => {
    if (!workspaceId || !seedNodeId) return;
    setBusy(true);
    setError(null);

    try {
      const response = await provider.runScenario({
        workspaceId,
        seedNodeId,
        inputContext: scenarioContext,
        nodes: nodes.map((node) => ({
          id: node.id,
          title: node.title,
          type: node.type,
          confidence: node.confidence
        })),
        edges: edges.map((edge) => ({
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          relationType: edge.relationType,
          strength: edge.strength
        }))
      });

      setScenarioResult(response.resultText);
      setScenarioPath(response.explanationPath);
      setScenarioConfidence(response.confidenceLabel);

      const supabase = getSupabaseBrowserClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const runId = crypto.randomUUID();
      const { error: insertRunError } = await supabase.from("scenario_runs").insert({
        id: runId,
        workspace_id: workspaceId,
        seed_node_id: seedNodeId,
        input_context: scenarioContext,
        result_text: response.resultText,
        explanation_path: response.explanationPath,
        confidence_label: response.confidenceLabel,
        metadata: {
          generatedBy: "edge-function"
        }
      });

      if (insertRunError) {
        throw new Error(insertRunError.message);
      }

      if (user) {
        await supabase.from("operation_log").insert({
          id: crypto.randomUUID(),
          workspace_id: workspaceId,
          entity_type: "scenario_run",
          entity_id: runId,
          op_type: "insert",
          payload: {
            seedNodeId,
            confidenceLabel: response.confidenceLabel
          },
          local_timestamp: new Date().toISOString(),
          actor_id: user.id,
          sync_status: "pending",
          conflict_flag: false
        });
      }
    } catch (scenarioError) {
      setError(scenarioError instanceof Error ? scenarioError.message : "Scenario run failed.");
    } finally {
      setBusy(false);
    }
  };

  const parseInbox = async () => {
    if (!workspaceId || !inboxText.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const items = await provider.parseInboxText(inboxText);
      setInboxItems(items);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Inbox parse failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Manual AI</h2>
      {error && <p>Error: {error}</p>}

      <div className="form-row">
        <select value={seedNodeId} onChange={(event) => setSeedNodeId(event.target.value)} disabled={!workspaceId || busy || nodes.length === 0}>
          <option value="">Scenario seed node</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}
            </option>
          ))}
        </select>
        <input
          value={scenarioContext}
          onChange={(event) => setScenarioContext(event.target.value)}
          placeholder="Scenario context"
          disabled={!workspaceId || busy}
        />
        <button type="button" onClick={runScenario} disabled={!workspaceId || busy || !seedNodeId}>
          Run scenario
        </button>
      </div>

      {scenarioResult && (
        <div>
          <p>Confidence: {scenarioConfidence}</p>
          <p>{scenarioResult}</p>
          {scenarioPath.length > 0 && (
            <ul>
              {scenarioPath.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="form-row">
        <textarea
          value={inboxText}
          onChange={(event) => setInboxText(event.target.value)}
          placeholder="Paste raw notes or transcript"
          disabled={!workspaceId || busy}
          rows={4}
          style={{ width: "100%", maxWidth: 700 }}
        />
      </div>

      <div className="form-row">
        <button type="button" onClick={parseInbox} disabled={!workspaceId || busy || !inboxText.trim()}>
          Parse inbox text
        </button>
      </div>

      {inboxItems.length > 0 && (
        <ul>
          {inboxItems.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}