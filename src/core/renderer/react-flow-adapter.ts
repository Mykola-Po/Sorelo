import type { Edge, Node } from "reactflow";
import type { SorelaEdge, SorelaNode } from "@/core/domain/entities";

export function mapNodeToRenderNode(node: SorelaNode): Node {
  return {
    id: node.id,
    type: "default",
    position: { x: node.x, y: node.y },
    data: {
      label: node.title,
      subtype: node.type,
      confidence: node.confidence
    }
  };
}

export function mapEdgeToRenderEdge(edge: SorelaEdge): Edge {
  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.relationType
  };
}
