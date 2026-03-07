import { create } from "zustand";
import type { OperationLogEntry, SorelaEdge, SorelaNode } from "@/core/domain/entities";

type CanonicalState = {
  workspaceId: string | null;
  nodes: Record<string, SorelaNode>;
  edges: Record<string, SorelaEdge>;
  operationLog: OperationLogEntry[];
  syncStatus: "synced" | "syncing" | "pending" | "conflict" | "error";
  setWorkspace: (workspaceId: string) => void;
  setSyncStatus: (status: CanonicalState["syncStatus"]) => void;
  upsertNode: (node: SorelaNode) => void;
  upsertEdge: (edge: SorelaEdge) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  appendOperation: (entry: OperationLogEntry) => void;
  replaceSnapshot: (payload: {
    workspaceId: string;
    nodes: SorelaNode[];
    edges: SorelaEdge[];
    operationLog: OperationLogEntry[];
  }) => void;
};

export const useCanonicalStore = create<CanonicalState>((set) => ({
  workspaceId: null,
  nodes: {},
  edges: {},
  operationLog: [],
  syncStatus: "synced",
  setWorkspace: (workspaceId) => set({ workspaceId }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  upsertNode: (node) =>
    set((state) => ({
      nodes: {
        ...state.nodes,
        [node.id]: node
      },
      syncStatus: "pending"
    })),
  upsertEdge: (edge) =>
    set((state) => ({
      edges: {
        ...state.edges,
        [edge.id]: edge
      },
      syncStatus: "pending"
    })),
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: Object.fromEntries(Object.entries(state.nodes).filter(([id]) => id !== nodeId)),
      edges: Object.fromEntries(
        Object.entries(state.edges).filter(([, edge]) => edge.sourceId !== nodeId && edge.targetId !== nodeId)
      ),
      syncStatus: "pending"
    })),
  removeEdge: (edgeId) =>
    set((state) => ({
      edges: Object.fromEntries(Object.entries(state.edges).filter(([id]) => id !== edgeId)),
      syncStatus: "pending"
    })),
  appendOperation: (entry) =>
    set((state) => ({
      operationLog: [...state.operationLog, entry],
      syncStatus: entry.conflictFlag ? "conflict" : "pending"
    })),
  replaceSnapshot: ({ workspaceId, nodes, edges, operationLog }) =>
    set({
      workspaceId,
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
      edges: Object.fromEntries(edges.map((edge) => [edge.id, edge])),
      operationLog,
      syncStatus: "synced"
    })
}));
