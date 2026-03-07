"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SorelaNode } from "@/core/domain/entities";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

type EvidenceKind = "note" | "quote" | "link" | "transcript_excerpt" | "observation";

type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  content: string;
  createdAt: string;
};

type EvidenceReviewPanelProps = {
  workspaceId: string | null;
  nodes: SorelaNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onNodeUpdated: (node: SorelaNode) => void;
  onAppendOperation: (payload: {
    workspaceId: string;
    entityType: "node" | "evidence";
    entityId: string;
    opType: "insert" | "update" | "delete";
    opPayload: Record<string, unknown>;
  }) => Promise<void>;
};

export function EvidenceReviewPanel({
  workspaceId,
  nodes,
  selectedNodeId,
  onSelectNode,
  onNodeUpdated,
  onAppendOperation
}: EvidenceReviewPanelProps) {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>("note");
  const [evidenceContent, setEvidenceContent] = useState("");
  const [reviewDays, setReviewDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const dueNodes = useMemo(() => {
    const now = new Date();
    return nodes
      .filter((node) => !node.archivedAt && new Date(node.reviewDueAt) <= now)
      .sort((a, b) => new Date(a.reviewDueAt).getTime() - new Date(b.reviewDueAt).getTime());
  }, [nodes]);

  const loadEvidences = useCallback(async () => {
    if (!workspaceId || !selectedNodeId) {
      setEvidences([]);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("evidences")
      .select("id,kind,content,created_at")
      .eq("workspace_id", workspaceId)
      .eq("attached_to_type", "node")
      .eq("attached_to_id", selectedNodeId)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setEvidences(
      (data ?? []).map((row: { id: string; kind: EvidenceKind; content: string; created_at: string }) => ({
        id: row.id,
        kind: row.kind,
        content: row.content,
        createdAt: row.created_at
      }))
    );
    setError(null);
  }, [selectedNodeId, workspaceId]);

  useEffect(() => {
    void loadEvidences();
  }, [loadEvidences]);

  const addEvidence = async () => {
    if (!workspaceId || !selectedNodeId || !evidenceContent.trim()) return;
    setBusy(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const evidenceId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("evidences").insert({
      id: evidenceId,
      workspace_id: workspaceId,
      attached_to_type: "node",
      attached_to_id: selectedNodeId,
      kind: evidenceKind,
      content: evidenceContent.trim(),
      source_meta: {},
      source_type: "manual"
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await onAppendOperation({
      workspaceId,
      entityType: "evidence",
      entityId: evidenceId,
      opType: "insert",
      opPayload: { attachedToId: selectedNodeId, kind: evidenceKind }
    });

    setEvidenceContent("");
    await loadEvidences();
  };

  const deleteEvidence = async (evidenceId: string) => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("evidences")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", evidenceId);

    setBusy(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await onAppendOperation({
      workspaceId,
      entityType: "evidence",
      entityId: evidenceId,
      opType: "delete",
      opPayload: {}
    });

    await loadEvidences();
  };

  const checkInNode = async (nodeId: string) => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);

    const now = new Date();
    const due = new Date(now.getTime() + reviewDays * 24 * 60 * 60 * 1000);
    const supabase = getSupabaseBrowserClient();

    const { data, error: updateError } = await supabase
      .from("nodes")
      .update({
        last_confirmed_at: now.toISOString(),
        review_due_at: due.toISOString()
      })
      .eq("workspace_id", workspaceId)
      .eq("id", nodeId)
      .select("*")
      .single();

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const row = data as {
      id: string;
      workspace_id: string;
      type: SorelaNode["type"];
      title: string;
      description: string;
      x: number;
      y: number;
      intensity: number | null;
      confidence: number;
      created_at: string;
      updated_at: string;
      last_confirmed_at: string;
      volatility: number;
      review_due_at: string;
      archived_at: string | null;
      version: number;
      metadata: Record<string, unknown>;
    };

    const domainNode: SorelaNode = {
      id: row.id,
      workspaceId: row.workspace_id,
      type: row.type,
      title: row.title,
      description: row.description,
      x: row.x,
      y: row.y,
      intensity: row.intensity,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastConfirmedAt: row.last_confirmed_at,
      volatility: row.volatility,
      reviewDueAt: row.review_due_at,
      archivedAt: row.archived_at,
      version: row.version,
      metadata: row.metadata
    };

    onNodeUpdated(domainNode);
    await onAppendOperation({
      workspaceId,
      entityType: "node",
      entityId: nodeId,
      opType: "update",
      opPayload: {
        lastConfirmedAt: domainNode.lastConfirmedAt,
        reviewDueAt: domainNode.reviewDueAt
      }
    });
  };

  return (
    <section>
      <h2>Evidence + Review</h2>
      {error && <p>Error: {error}</p>}

      <div className="form-row">
        <select value={selectedNodeId} onChange={(event) => onSelectNode(event.target.value)} disabled={!workspaceId || busy || nodes.length === 0}>
          <option value="">Select node for evidence</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}
            </option>
          ))}
        </select>
        <select value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as EvidenceKind)} disabled={!selectedNodeId || busy}>
          <option value="note">note</option>
          <option value="quote">quote</option>
          <option value="link">link</option>
          <option value="transcript_excerpt">transcript_excerpt</option>
          <option value="observation">observation</option>
        </select>
        <input
          value={evidenceContent}
          onChange={(event) => setEvidenceContent(event.target.value)}
          placeholder="Evidence content"
          disabled={!selectedNodeId || busy}
        />
        <button type="button" onClick={addEvidence} disabled={!selectedNodeId || busy || !evidenceContent.trim()}>
          Add evidence
        </button>
      </div>

      {selectedNode && (
        <p>
          Selected node: {selectedNode.title} | review due: {new Date(selectedNode.reviewDueAt).toLocaleString()}
        </p>
      )}

      {evidences.length > 0 && (
        <ul>
          {evidences.map((item) => (
            <li key={item.id}>
              [{item.kind}] {item.content} ({new Date(item.createdAt).toLocaleString()}){" "}
              <button type="button" onClick={() => void deleteEvidence(item.id)} disabled={busy}>
                delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="form-row">
        <input
          type="number"
          min={1}
          max={60}
          value={reviewDays}
          onChange={(event) => setReviewDays(Number(event.target.value) || 7)}
          disabled={busy}
        />
        <span>days until next review</span>
      </div>

      {dueNodes.length > 0 ? (
        <ul>
          {dueNodes.slice(0, 8).map((node) => (
            <li key={node.id}>
              {node.title} (due: {new Date(node.reviewDueAt).toLocaleString()}){" "}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onSelectNode(node.id);
                  void checkInNode(node.id);
                }}
              >
                Check-in
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No overdue nodes.</p>
      )}
    </section>
  );
}
