"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeDragHandler
} from "reactflow";
import "reactflow/dist/style.css";
import type { SorelaEdge, SorelaNode } from "@/core/domain/entities";

type GraphEditorCanvasProps = {
  nodes: SorelaNode[];
  edges: SorelaEdge[];
  relationTypeForConnect: SorelaEdge["relationType"];
  busy: boolean;
  onMoveNode: (params: { nodeId: string; x: number; y: number }) => void;
  onConnectNodes: (params: {
    sourceId: string;
    targetId: string;
    relationType: SorelaEdge["relationType"];
  }) => void;
};

export function GraphEditorCanvas({
  nodes,
  edges,
  relationTypeForConnect,
  busy,
  onMoveNode,
  onConnectNodes
}: GraphEditorCanvasProps) {
  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        position: { x: node.x, y: node.y },
        data: { label: `${node.title} (${node.type})` },
        draggable: !busy
      })),
    [busy, nodes]
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.relationType
      })),
    [edges]
  );

  const handleNodeDragStop: NodeDragHandler = (_event, node) => {
    onMoveNode({ nodeId: node.id, x: node.position.x, y: node.position.y });
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }
    onConnectNodes({
      sourceId: connection.source,
      targetId: connection.target,
      relationType: relationTypeForConnect
    });
  };

  return (
    <div className="graph-canvas-wrap">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
