import { Sigma } from "sigma";
import Graph from "graphology";

export type SigmaInstanceOptions = {
  container: HTMLElement;
  graph: Graph;
};

export function createSigmaInstance({ container, graph }: SigmaInstanceOptions): Sigma {
  return new Sigma(graph, container, {
    renderEdgeLabels: true,
    edgeLabelSize: 12,
    edgeLabelColor: { attribute: "color", color: "#868e96" },
    
    defaultNodeType: "circle",
    defaultEdgeType: "arrow",
    
    // Styling fallbacks
    defaultNodeColor: "#868e96",
    defaultEdgeColor: "#868e96",
  });
}
