import { Sigma } from "sigma";
import Graph from "graphology";

export type SigmaInstanceOptions = {
  container: HTMLElement;
  graph: Graph;
};

export type SigmaZoomBounds = {
  minRatio: number;
  maxRatio: number;
};

export function createSigmaInstance({ container, graph }: SigmaInstanceOptions): Sigma {
  return new Sigma(graph, container, {
    renderLabels: false,
    renderEdgeLabels: true,
    edgeLabelSize: 12,
    edgeLabelColor: { attribute: "color", color: "#868e96" },
    autoRescale: false,
    nodeReducer: (_node, data) => ({ ...data, color: "rgba(0, 0, 0, 0)" }),
    
    defaultNodeType: "circle",
    defaultEdgeType: "arrow",
    
    // Styling fallbacks
    defaultNodeColor: "#868e96",
    defaultEdgeColor: "#868e96",
    minCameraRatio: null,
    maxCameraRatio: null,
  });
}

export function applySigmaZoomBounds(sigma: Sigma, bounds: SigmaZoomBounds): void {
  const minRatio =
    Number.isFinite(bounds.minRatio) && bounds.minRatio > 0 ? bounds.minRatio : null;
  const maxRatio =
    Number.isFinite(bounds.maxRatio) && bounds.maxRatio > 0 ? bounds.maxRatio : null;

  sigma.setSettings({
    minCameraRatio: minRatio,
    maxCameraRatio: maxRatio,
  });
}
