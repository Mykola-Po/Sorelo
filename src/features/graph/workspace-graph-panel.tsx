"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { NODE_TYPES, RELATION_TYPES, type NodeType, type OperationLogEntry, type SorelaEdge, type SorelaNode } from "@/core/domain/entities";
import { useCanonicalStore } from "@/core/store/canonical-store";
import { EvidenceReviewPanel } from "@/features/evidence/evidence-review-panel";
import { GraphEditorCanvas } from "@/features/graph/graph-editor-canvas";
import { SyncPanel } from "@/features/sync/sync-panel";
import { getSupabaseBrowserClient } from "@/services/supabase/client";
import { queueLocalOperation } from "@/services/sync/run-sync-cycle";

type WorkspaceItem = {
  id: string;
  title: string;
};

type ClusterView = {
  id: string;
  title: string;
  nodeIds: string[];
};

type DbNode = {
  id: string;
  workspace_id: string;
  type: NodeType;
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

type DbEdge = {
  id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  relation_type: (typeof RELATION_TYPES)[number];
  strength: number;
  confidence: number;
  created_at: string;
  updated_at: string;
  version: number;
  metadata: Record<string, unknown>;
};

type DbOperationLog = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  op_type: string;
  payload: Record<string, unknown>;
  local_timestamp: string;
  actor_id: string;
  sync_status: "pending" | "synced" | "conflict" | "error";
  remote_timestamp: string | null;
  conflict_flag: boolean;
};

type DbCluster = {
  id: string;
  workspace_id: string;
  title: string;
};

type DbClusterMember = {
  cluster_id: string;
  node_id: string;
};

function toDomainNode(row: DbNode): SorelaNode {
  return {
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
}

function toDomainEdge(row: DbEdge): SorelaEdge {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relationType: row.relation_type,
    strength: row.strength,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    metadata: row.metadata
  };
}

function toDomainOperation(row: DbOperationLog): OperationLogEntry {
  return {
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
}

function deriveSyncStatus(ops: OperationLogEntry[]): "synced" | "syncing" | "pending" | "conflict" | "error" {
  if (ops.some((op) => op.conflictFlag || op.syncStatus === "conflict")) return "conflict";
  if (ops.some((op) => op.syncStatus === "error")) return "error";
  if (ops.some((op) => op.syncStatus === "pending")) return "pending";
  return "synced";
}

export function WorkspaceGraphPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [workspaceTitle, setWorkspaceTitle] = useState("My first workspace");

  const [nodeTitle, setNodeTitle] = useState("New fact");
  const [nodeType, setNodeType] = useState<NodeType>("fact");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [editNodeTitle, setEditNodeTitle] = useState("");
  const [editNodeType, setEditNodeType] = useState<NodeType>("fact");

  const [sourceNodeId, setSourceNodeId] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");
  const [relationType, setRelationType] = useState<(typeof RELATION_TYPES)[number]>("causes");

  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [editEdgeRelationType, setEditEdgeRelationType] = useState<(typeof RELATION_TYPES)[number]>("causes");
  const [clusters, setClusters] = useState<ClusterView[]>([]);
  const [clusterTitle, setClusterTitle] = useState("Core factors");
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState("");
  const [focusClusterId, setFocusClusterId] = useState("");
  const [commandQuery, setCommandQuery] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const workspaceId = useCanonicalStore((state) => state.workspaceId);
  const nodesById = useCanonicalStore((state) => state.nodes);
  const edgesById = useCanonicalStore((state) => state.edges);
  const nodes = useMemo(() => Object.values(nodesById), [nodesById]);
  const edges = useMemo(() => Object.values(edgesById), [edgesById]);
  const replaceSnapshot = useCanonicalStore((state) => state.replaceSnapshot);
  const setSyncStatus = useCanonicalStore((state) => state.setSyncStatus);
  const upsertNode = useCanonicalStore((state) => state.upsertNode);
  const upsertEdge = useCanonicalStore((state) => state.upsertEdge);
  const removeNode = useCanonicalStore((state) => state.removeNode);
  const removeEdge = useCanonicalStore((state) => state.removeEdge);
  const appendOperation = useCanonicalStore((state) => state.appendOperation);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const loadWorkspaceSnapshot = useCallback(async (nextWorkspaceId: string) => {
    if (!supabase) return;

    const [
      { data: nodeRows, error: nodesError },
      { data: edgeRows, error: edgesError },
      { data: opRows, error: opsError },
      { data: clusterRows, error: clustersError },
      { data: clusterMemberRows, error: clusterMembersError }
    ] = await Promise.all([
      supabase.from("nodes").select("*").eq("workspace_id", nextWorkspaceId).order("created_at", { ascending: true }),
      supabase.from("edges").select("*").eq("workspace_id", nextWorkspaceId).order("created_at", { ascending: true }),
      supabase.from("operation_log").select("*").eq("workspace_id", nextWorkspaceId).order("local_timestamp", { ascending: true }).limit(200),
      supabase.from("clusters").select("id,workspace_id,title").eq("workspace_id", nextWorkspaceId).order("created_at", { ascending: true }),
      supabase.from("cluster_members").select("cluster_id,node_id").eq("workspace_id", nextWorkspaceId)
    ]);

    if (nodesError || edgesError || opsError || clustersError || clusterMembersError) {
      setError(
        nodesError?.message ??
          edgesError?.message ??
          opsError?.message ??
          clustersError?.message ??
          clusterMembersError?.message ??
          "Failed loading workspace snapshot."
      );
      return;
    }

    const domainOps = ((opRows ?? []) as DbOperationLog[]).map(toDomainOperation);

    replaceSnapshot({
      workspaceId: nextWorkspaceId,
      nodes: ((nodeRows ?? []) as DbNode[]).map(toDomainNode),
      edges: ((edgeRows ?? []) as DbEdge[]).map(toDomainEdge),
      operationLog: domainOps
    });

    setSyncStatus(deriveSyncStatus(domainOps));
    setSourceNodeId("");
    setTargetNodeId("");
    setSelectedNodeId("");
    setSelectedEdgeId("");

    const clustersMap = new Map<string, ClusterView>();
    for (const row of (clusterRows ?? []) as DbCluster[]) {
      clustersMap.set(row.id, { id: row.id, title: row.title, nodeIds: [] });
    }
    for (const row of (clusterMemberRows ?? []) as DbClusterMember[]) {
      const cluster = clustersMap.get(row.cluster_id);
      if (cluster) {
        cluster.nodeIds.push(row.node_id);
      }
    }
    setClusters(Array.from(clustersMap.values()));
    setError(null);
  }, [replaceSnapshot, setSyncStatus, supabase]);

  const loadWorkspaces = useCallback(async () => {
    if (!supabase) return;
    const { data, error: listError } = await supabase
      .from("workspaces")
      .select("id,title")
      .order("created_at", { ascending: false });

    if (listError) {
      setError(listError.message);
      return;
    }

    const items = (data ?? []) as WorkspaceItem[];
    setWorkspaces(items);

    if (!workspaceId && items.length > 0) {
      await loadWorkspaceSnapshot(items[0].id);
    }
  }, [loadWorkspaceSnapshot, supabase, workspaceId]);

  const appendOperationRecord = async (payload: {
    workspaceId: string;
    entityType: "workspace" | "node" | "edge" | "cluster" | "evidence";
    entityId: string;
    opType: "insert" | "update" | "delete";
    opPayload: Record<string, unknown>;
  }) => {
    if (!supabase || !user) return;
    const localTimestamp = new Date().toISOString();
    const operationId = crypto.randomUUID();

    const { data, error: opError } = await supabase
      .from("operation_log")
      .insert({
        id: operationId,
        workspace_id: payload.workspaceId,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        op_type: payload.opType,
        payload: payload.opPayload,
        local_timestamp: localTimestamp,
        actor_id: user.id,
        sync_status: "pending",
        conflict_flag: false
      })
      .select("*")
      .single();

    if (opError) {
      setError(`Operation log failed: ${opError.message}`);
      return;
    }

    const op = toDomainOperation(data as DbOperationLog);
    appendOperation(op);
    try {
      await queueLocalOperation(op);
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "Local queue write failed.");
    }
    setSyncStatus("pending");
  };

  const createWorkspace = async () => {
    if (!supabase || !user || !workspaceTitle.trim()) return;
    setBusy(true);
    setError(null);

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null
      },
      { onConflict: "id" }
    );

    if (profileError) {
      setBusy(false);
      setError(`Profile bootstrap failed: ${profileError.message}`);
      return;
    }

    const { data, error: createError } = await supabase
      .from("workspaces")
      .insert({
        owner_id: user.id,
        title: workspaceTitle.trim(),
        description: "",
        plan: "free"
      })
      .select("id,title")
      .single();

    setBusy(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    const created = data as WorkspaceItem;
    setWorkspaces((prev) => [created, ...prev]);
    await loadWorkspaceSnapshot(created.id);
    await appendOperationRecord({
      workspaceId: created.id,
      entityType: "workspace",
      entityId: created.id,
      opType: "insert",
      opPayload: { title: created.title }
    });
  };

  const createNode = async () => {
    if (!supabase || !user || !workspaceId || !nodeTitle.trim()) return;
    setBusy(true);
    setError(null);

    const nodeId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { data, error: nodeError } = await supabase
      .from("nodes")
      .insert({
        id: nodeId,
        workspace_id: workspaceId,
        type: nodeType,
        title: nodeTitle.trim(),
        description: "",
        x: Math.floor(Math.random() * 400),
        y: Math.floor(Math.random() * 300),
        confidence: 0.5,
        volatility: 0.5,
        last_confirmed_at: nowIso,
        review_due_at: nowIso,
        metadata: {}
      })
      .select("*")
      .single();

    setBusy(false);

    if (nodeError) {
      setError(nodeError.message);
      return;
    }

    const domainNode = toDomainNode(data as DbNode);
    upsertNode(domainNode);
    await appendOperationRecord({
      workspaceId,
      entityType: "node",
      entityId: domainNode.id,
      opType: "insert",
      opPayload: { title: domainNode.title, type: domainNode.type }
    });
  };

  const updateNode = async () => {
    if (!supabase || !workspaceId || !selectedNodeId || !editNodeTitle.trim()) return;
    setBusy(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from("nodes")
      .update({ title: editNodeTitle.trim(), type: editNodeType })
      .eq("workspace_id", workspaceId)
      .eq("id", selectedNodeId)
      .select("*")
      .single();

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const domainNode = toDomainNode(data as DbNode);
    upsertNode(domainNode);
    await appendOperationRecord({
      workspaceId,
      entityType: "node",
      entityId: domainNode.id,
      opType: "update",
      opPayload: { title: domainNode.title, type: domainNode.type }
    });
  };

  const deleteNode = async () => {
    if (!supabase || !workspaceId || !selectedNodeId) return;
    setBusy(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("nodes")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", selectedNodeId);

    setBusy(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    removeNode(selectedNodeId);
    await appendOperationRecord({
      workspaceId,
      entityType: "node",
      entityId: selectedNodeId,
      opType: "delete",
      opPayload: {}
    });

    setSelectedNodeId("");
    setEditNodeTitle("");
    setSourceNodeId("");
    setTargetNodeId("");

    await loadWorkspaceSnapshot(workspaceId);
  };

  const createEdge = async (custom?: { sourceId: string; targetId: string; relationType: (typeof RELATION_TYPES)[number] }) => {
    const sourceId = custom?.sourceId ?? sourceNodeId;
    const targetId = custom?.targetId ?? targetNodeId;
    const nextRelationType = custom?.relationType ?? relationType;

    if (!supabase || !workspaceId || !sourceId || !targetId) return;
    setBusy(true);
    setError(null);

    const edgeId = crypto.randomUUID();

    const { data, error: edgeError } = await supabase
      .from("edges")
      .insert({
        id: edgeId,
        workspace_id: workspaceId,
        source_id: sourceId,
        target_id: targetId,
        relation_type: nextRelationType,
        strength: 0,
        confidence: 0.5,
        metadata: {}
      })
      .select("*")
      .single();

    setBusy(false);

    if (edgeError) {
      setError(edgeError.message);
      return;
    }

    const domainEdge = toDomainEdge(data as DbEdge);
    upsertEdge(domainEdge);
    await appendOperationRecord({
      workspaceId,
      entityType: "edge",
      entityId: domainEdge.id,
      opType: "insert",
      opPayload: {
        sourceId: domainEdge.sourceId,
        targetId: domainEdge.targetId,
        relationType: domainEdge.relationType
      }
    });
  };

  const moveNode = async (params: { nodeId: string; x: number; y: number }) => {
    if (!supabase || !workspaceId) return;

    const { data, error: moveError } = await supabase
      .from("nodes")
      .update({ x: params.x, y: params.y })
      .eq("workspace_id", workspaceId)
      .eq("id", params.nodeId)
      .select("*")
      .single();

    if (moveError) {
      setError(moveError.message);
      return;
    }

    const domainNode = toDomainNode(data as DbNode);
    upsertNode(domainNode);
    await appendOperationRecord({
      workspaceId,
      entityType: "node",
      entityId: domainNode.id,
      opType: "update",
      opPayload: { x: domainNode.x, y: domainNode.y }
    });
  };

  const updateEdge = async () => {
    if (!supabase || !workspaceId || !selectedEdgeId) return;
    setBusy(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from("edges")
      .update({ relation_type: editEdgeRelationType })
      .eq("workspace_id", workspaceId)
      .eq("id", selectedEdgeId)
      .select("*")
      .single();

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const domainEdge = toDomainEdge(data as DbEdge);
    upsertEdge(domainEdge);
    await appendOperationRecord({
      workspaceId,
      entityType: "edge",
      entityId: domainEdge.id,
      opType: "update",
      opPayload: { relationType: domainEdge.relationType }
    });
  };

  const deleteEdge = async () => {
    if (!supabase || !workspaceId || !selectedEdgeId) return;
    setBusy(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("edges")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", selectedEdgeId);

    setBusy(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    removeEdge(selectedEdgeId);
    await appendOperationRecord({
      workspaceId,
      entityType: "edge",
      entityId: selectedEdgeId,
      opType: "delete",
      opPayload: {}
    });

    setSelectedEdgeId("");
  };

  const createCluster = async () => {
    if (!supabase || !workspaceId || !clusterTitle.trim()) return;
    setBusy(true);
    setError(null);

    const { error: clusterError } = await supabase.from("clusters").insert({
      workspace_id: workspaceId,
      title: clusterTitle.trim(),
      description: "",
      metadata: {}
    });

    setBusy(false);

    if (clusterError) {
      setError(clusterError.message);
      return;
    }

    await loadWorkspaceSnapshot(workspaceId);
  };

  const addSelectedNodeToCluster = async () => {
    if (!supabase || !workspaceId || !selectedNodeId || !selectedClusterId) return;
    setBusy(true);
    setError(null);

    const { error: memberError } = await supabase.from("cluster_members").insert({
      workspace_id: workspaceId,
      cluster_id: selectedClusterId,
      node_id: selectedNodeId
    });

    setBusy(false);

    if (memberError) {
      setError(memberError.message);
      return;
    }

    await loadWorkspaceSnapshot(workspaceId);
  };

  useEffect(() => {
    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (selectedNode) {
      setEditNodeTitle(selectedNode.title);
      setEditNodeType(selectedNode.type);
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
    if (selectedEdge) {
      setEditEdgeRelationType(selectedEdge.relationType);
    }
  }, [edges, selectedEdgeId]);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase env is missing.");
      return;
    }

    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (userError) {
        setError(userError.message);
        return;
      }
      setUser(data.user ?? null);
      if (data.user) {
        void loadWorkspaces();
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadWorkspaces();
      } else {
        setWorkspaces([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadWorkspaces, supabase]);

  const canCreateEdge = !!workspaceId && nodes.length >= 2;
  const clusterNodeSet = useMemo(() => {
    if (!focusClusterId) return null;
    const cluster = clusters.find((item) => item.id === focusClusterId);
    return cluster ? new Set(cluster.nodeIds) : null;
  }, [clusters, focusClusterId]);

  const focusNodeNeighborhood = useMemo(() => {
    if (!focusNodeId) return null;
    const neighborhood = new Set<string>([focusNodeId]);
    edges.forEach((edge) => {
      if (edge.sourceId === focusNodeId) neighborhood.add(edge.targetId);
      if (edge.targetId === focusNodeId) neighborhood.add(edge.sourceId);
    });
    return neighborhood;
  }, [edges, focusNodeId]);

  const visibleNodeSet = useMemo(() => {
    if (!focusMode) return null;
    if (focusNodeNeighborhood) return focusNodeNeighborhood;
    if (clusterNodeSet) return clusterNodeSet;
    return null;
  }, [clusterNodeSet, focusMode, focusNodeNeighborhood]);

  const filteredNodes = useMemo(() => {
    if (!visibleNodeSet) return nodes;
    return nodes.filter((node) => visibleNodeSet.has(node.id));
  }, [nodes, visibleNodeSet]);

  const filteredEdges = useMemo(() => {
    if (!visibleNodeSet) return edges;
    return edges.filter((edge) => visibleNodeSet.has(edge.sourceId) && visibleNodeSet.has(edge.targetId));
  }, [edges, visibleNodeSet]);

  const commandResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return [];
    return nodes.filter((node) => node.title.toLowerCase().includes(query)).slice(0, 6);
  }, [commandQuery, nodes]);

  return (
    <section>
      <h2>Workspace + Graph CRUD</h2>
      {!user && <p>Sign in first to manage workspaces and graph data.</p>}
      {error && <p>Error: {error}</p>}

      <div className="form-row">
        <input
          value={workspaceTitle}
          onChange={(event) => setWorkspaceTitle(event.target.value)}
          placeholder="Workspace title"
          disabled={!user || busy}
        />
        <button type="button" onClick={createWorkspace} disabled={!user || busy || !workspaceTitle.trim()}>
          Create workspace
        </button>
      </div>

      {workspaceId && (
        <GraphEditorCanvas
          nodes={filteredNodes}
          edges={filteredEdges}
          relationTypeForConnect={relationType}
          busy={busy}
          onMoveNode={moveNode}
          onConnectNodes={(params) => {
            void createEdge({
              sourceId: params.sourceId,
              targetId: params.targetId,
              relationType: params.relationType
            });
          }}
        />
      )}

      <div className="form-row">
        <button type="button" onClick={() => setFocusMode((prev) => !prev)} disabled={!workspaceId || busy}>
          {focusMode ? "Disable focus mode" : "Enable focus mode"}
        </button>
        <select value={focusNodeId} onChange={(event) => setFocusNodeId(event.target.value)} disabled={!workspaceId || busy || nodes.length === 0}>
          <option value="">Focus by node (neighbors)</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}
            </option>
          ))}
        </select>
        <select value={focusClusterId} onChange={(event) => setFocusClusterId(event.target.value)} disabled={!workspaceId || busy || clusters.length === 0}>
          <option value="">Focus by cluster</option>
          {clusters.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.title}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <input
          value={commandQuery}
          onChange={(event) => setCommandQuery(event.target.value)}
          placeholder="Command palette: find node by title"
          disabled={!workspaceId || busy}
        />
        {commandResults.map((node) => (
          <button
            key={node.id}
            type="button"
            disabled={busy}
            onClick={() => {
              setSelectedNodeId(node.id);
              setFocusNodeId(node.id);
              setFocusMode(true);
            }}
          >
            Go: {node.title}
          </button>
        ))}
      </div>

      <div className="form-row">
        <input
          value={clusterTitle}
          onChange={(event) => setClusterTitle(event.target.value)}
          placeholder="Cluster title"
          disabled={!workspaceId || busy}
        />
        <button type="button" onClick={createCluster} disabled={!workspaceId || busy || !clusterTitle.trim()}>
          Create cluster
        </button>
        <select
          value={selectedClusterId}
          onChange={(event) => setSelectedClusterId(event.target.value)}
          disabled={!workspaceId || busy || clusters.length === 0}
        >
          <option value="">Select cluster</option>
          {clusters.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.title} ({cluster.nodeIds.length})
            </option>
          ))}
        </select>
        <button type="button" onClick={addSelectedNodeToCluster} disabled={!selectedNodeId || !selectedClusterId || busy}>
          Add selected node to cluster
        </button>
      </div>

      <SyncPanel
        workspaceId={workspaceId}
        actorId={user?.id ?? null}
        onRefresh={async () => {
          if (workspaceId) {
            await loadWorkspaceSnapshot(workspaceId);
          }
        }}
      />

      <EvidenceReviewPanel
        workspaceId={workspaceId}
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onNodeUpdated={upsertNode}
        onAppendOperation={appendOperationRecord}
      />

      {workspaces.length > 0 && (
        <div className="form-row">
          <select
            value={workspaceId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value;
              if (nextId) {
                void loadWorkspaceSnapshot(nextId);
              }
            }}
            disabled={!user || busy}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => workspaceId && loadWorkspaceSnapshot(workspaceId)} disabled={!workspaceId || busy}>
            Refresh snapshot
          </button>
        </div>
      )}

      <div className="form-row">
        <input
          value={nodeTitle}
          onChange={(event) => setNodeTitle(event.target.value)}
          placeholder="Node title"
          disabled={!workspaceId || busy}
        />
        <select value={nodeType} onChange={(event) => setNodeType(event.target.value as NodeType)} disabled={!workspaceId || busy}>
          {NODE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button type="button" onClick={createNode} disabled={!workspaceId || busy || !nodeTitle.trim()}>
          Add node
        </button>
      </div>

      <div className="form-row">
        <select value={selectedNodeId} onChange={(event) => setSelectedNodeId(event.target.value)} disabled={!workspaceId || busy || nodes.length === 0}>
          <option value="">Select node to edit</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}
            </option>
          ))}
        </select>
        <input
          value={editNodeTitle}
          onChange={(event) => setEditNodeTitle(event.target.value)}
          placeholder="Updated node title"
          disabled={!selectedNodeId || busy}
        />
        <select value={editNodeType} onChange={(event) => setEditNodeType(event.target.value as NodeType)} disabled={!selectedNodeId || busy}>
          {NODE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button type="button" onClick={updateNode} disabled={!selectedNodeId || busy || !editNodeTitle.trim()}>
          Update node
        </button>
        <button type="button" onClick={deleteNode} disabled={!selectedNodeId || busy}>
          Delete node
        </button>
      </div>

      <div className="form-row">
        <select value={sourceNodeId} onChange={(event) => setSourceNodeId(event.target.value)} disabled={!canCreateEdge || busy}>
          <option value="">Source node</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}
            </option>
          ))}
        </select>
        <select value={targetNodeId} onChange={(event) => setTargetNodeId(event.target.value)} disabled={!canCreateEdge || busy}>
          <option value="">Target node</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.title}
            </option>
          ))}
        </select>
        <select value={relationType} onChange={(event) => setRelationType(event.target.value as (typeof RELATION_TYPES)[number])} disabled={!canCreateEdge || busy}>
          {RELATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            void createEdge();
          }}
          disabled={!canCreateEdge || busy || !sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId}
        >
          Add edge
        </button>
      </div>

      <div className="form-row">
        <select value={selectedEdgeId} onChange={(event) => setSelectedEdgeId(event.target.value)} disabled={!workspaceId || busy || edges.length === 0}>
          <option value="">Select edge to edit</option>
          {edges.map((edge) => (
            <option key={edge.id} value={edge.id}>
              {edge.sourceId.slice(0, 5)}-{edge.relationType}-{edge.targetId.slice(0, 5)}
            </option>
          ))}
        </select>
        <select
          value={editEdgeRelationType}
          onChange={(event) => setEditEdgeRelationType(event.target.value as (typeof RELATION_TYPES)[number])}
          disabled={!selectedEdgeId || busy}
        >
          {RELATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button type="button" onClick={updateEdge} disabled={!selectedEdgeId || busy}>
          Update edge
        </button>
        <button type="button" onClick={deleteEdge} disabled={!selectedEdgeId || busy}>
          Delete edge
        </button>
      </div>
    </section>
  );
}
