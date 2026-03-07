import Dexie, { type Table } from "dexie";
import type { OperationLogEntry, SorelaEdge, SorelaNode } from "@/core/domain/entities";

export class SorelaDexie extends Dexie {
  nodes!: Table<SorelaNode, string>;
  edges!: Table<SorelaEdge, string>;
  operations!: Table<OperationLogEntry, string>;

  constructor() {
    super("sorela");
    this.version(1).stores({
      nodes: "id, workspaceId, type, updatedAt",
      edges: "id, workspaceId, sourceId, targetId, updatedAt",
      operations: "id, workspaceId, entityType, syncStatus, localTimestamp"
    });
  }
}

export const dexieDb = new SorelaDexie();
