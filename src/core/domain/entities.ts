export const NODE_TYPES = ["fact", "emotion_state", "belief", "trigger_scenario"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const RELATION_TYPES = ["causes", "strengthens", "weakens", "contradicts", "explains"] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export type SorelaNode = {
  id: string;
  workspaceId: string;
  type: NodeType;
  title: string;
  description: string;
  x: number;
  y: number;
  intensity: number | null;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  lastConfirmedAt: string;
  volatility: number;
  reviewDueAt: string;
  archivedAt: string | null;
  version: number;
  metadata: Record<string, unknown>;
};

export type SorelaEdge = {
  id: string;
  workspaceId: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  strength: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  metadata: Record<string, unknown>;
};

export type OperationLogEntry = {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  opType: string;
  payload: Record<string, unknown>;
  localTimestamp: string;
  actorId: string;
  syncStatus: "pending" | "synced" | "conflict" | "error";
  remoteTimestamp: string | null;
  conflictFlag: boolean;
};
