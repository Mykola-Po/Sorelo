import type { Sigma } from "sigma";

import type { GraphViewport } from "@/features/map-runtime/types";

type ViewportPoint = {
  x: number;
  y: number;
};

type ViewportDimensions = {
  width: number;
  height: number;
};

type GraphProjection = (point: ViewportPoint) => ViewportPoint;

export type GraphViewportBounds = Pick<GraphViewport, "x" | "y" | "width" | "height">;

function isValidDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFinitePoint(point: ViewportPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function deriveGraphViewportBounds(
  dimensions: ViewportDimensions,
  projectToGraph: GraphProjection
): GraphViewportBounds | null {
  if (!isValidDimension(dimensions.width) || !isValidDimension(dimensions.height)) {
    return null;
  }

  const topLeft = projectToGraph({ x: 0, y: 0 });
  const bottomRight = projectToGraph({
    x: dimensions.width,
    y: dimensions.height,
  });

  if (!isFinitePoint(topLeft) || !isFinitePoint(bottomRight)) {
    return null;
  }

  const minX = Math.min(topLeft.x, bottomRight.x);
  const minY = Math.min(topLeft.y, bottomRight.y);
  const maxX = Math.max(topLeft.x, bottomRight.x);
  const maxY = Math.max(topLeft.y, bottomRight.y);

  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const width = Math.max(1, Math.ceil(maxX) - x);
  const height = Math.max(1, Math.ceil(maxY) - y);

  return { x, y, width, height };
}

export function deriveGraphViewportFromSigma(
  sigma: Sigma,
  dimensions: ViewportDimensions
): GraphViewportBounds | null {
  return deriveGraphViewportBounds(dimensions, (point) => sigma.viewportToGraph(point));
}
