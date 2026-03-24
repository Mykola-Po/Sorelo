export const MOUSE_DRAG_THRESHOLD_PX = 4;
export const TOUCH_LONG_PRESS_MS = 180;
export const TOUCH_LONG_PRESS_CANCEL_THRESHOLD_PX = 8;
export const SOFT_SNAP_THRESHOLD_PX = 10;
export const EDGE_AUTO_PAN_HOT_ZONE_PX = 56;
export const POSITION_SAVE_RETRY_DELAY_MS = 2000;
const MIN_SIGMA_BBOX_PADDING = 120;
const SIGMA_BBOX_PADDING_RATIO = 0.25;

export type DragPointerType = "mouse" | "touch" | "pen";

export type DragViewportPoint = {
  x: number;
  y: number;
};

export type DragSnapAxis = {
  conceptId: string;
  guideViewport: number;
  delta: number;
};

export type DragSnapState = {
  x: DragSnapAxis | null;
  y: DragSnapAxis | null;
};

export type DragSnapCandidate = DragViewportPoint & {
  conceptId: string;
  isOutside: boolean;
};

export type EdgeAutoPanIntent = {
  x: number;
  y: number;
  isActive: boolean;
};

import type {
  GraphConceptNode,
  GraphSnapshot,
} from "@/features/map-runtime/types";

export type StableSigmaBBox = {
  x: [number, number];
  y: [number, number];
};

export type PositionPersistencePhase = "idle" | "dragging" | "saving" | "error";

export type PositionPersistenceState = {
  phase: PositionPersistencePhase;
  retryCount: number;
  errorMessage: string | null;
};

export type PositionPersistenceEvent =
  | { type: "dragging" }
  | { type: "saving" }
  | { type: "retry" }
  | { type: "success" }
  | { type: "error"; message: string };

export const INITIAL_POSITION_PERSISTENCE_STATE: PositionPersistenceState = {
  phase: "idle",
  retryCount: 0,
  errorMessage: null,
};

export function deriveGraphSigmaBBox(input: {
  snapshot: GraphSnapshot;
  ghosts?: GraphConceptNode[];
  positions?: Record<string, DragViewportPoint>;
}): StableSigmaBBox | null {
  const positions = input.positions ?? {};
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let hasFiniteCoordinate = false;

  const collectPoint = (id: string, x: number, y: number) => {
    const override = positions[id];
    const nextX = override?.x ?? x;
    const nextY = override?.y ?? y;

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      return;
    }

    hasFiniteCoordinate = true;
    minX = Math.min(minX, nextX);
    maxX = Math.max(maxX, nextX);
    minY = Math.min(minY, nextY);
    maxY = Math.max(maxY, nextY);
  };

  for (const concept of input.snapshot.concepts) {
    collectPoint(concept.id, concept.x, concept.y);
  }

  for (const ghost of input.ghosts ?? []) {
    collectPoint(ghost.id, ghost.x, ghost.y);
  }

  if (!hasFiniteCoordinate) {
    return null;
  }

  if (minX === maxX) {
    minX -= 0.5;
    maxX += 0.5;
  }

  if (minY === maxY) {
    minY -= 0.5;
    maxY += 0.5;
  }

  const paddingX = Math.max(
    (maxX - minX) * SIGMA_BBOX_PADDING_RATIO,
    MIN_SIGMA_BBOX_PADDING
  );
  const paddingY = Math.max(
    (maxY - minY) * SIGMA_BBOX_PADDING_RATIO,
    MIN_SIGMA_BBOX_PADDING
  );

  return {
    x: [minX - paddingX, maxX + paddingX],
    y: [minY - paddingY, maxY + paddingY],
  };
}

export function getPointerTravelDistance(
  start: DragViewportPoint,
  current: DragViewportPoint
): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

export function shouldStartPointerDrag(
  pointerType: DragPointerType,
  distance: number
): boolean {
  if (pointerType === "touch") {
    return false;
  }

  return distance >= MOUSE_DRAG_THRESHOLD_PX;
}

export function shouldCancelTouchLongPress(distance: number): boolean {
  return distance > TOUCH_LONG_PRESS_CANCEL_THRESHOLD_PX;
}

export function resolveConceptSoftSnap(input: {
  activeConceptId: string;
  center: DragViewportPoint;
  candidates: Iterable<DragSnapCandidate>;
  thresholdPx?: number;
}): { center: DragViewportPoint; snap: DragSnapState } {
  const thresholdPx = input.thresholdPx ?? SOFT_SNAP_THRESHOLD_PX;
  let snappedX: DragSnapAxis | null = null;
  let snappedY: DragSnapAxis | null = null;

  for (const candidate of input.candidates) {
    if (candidate.conceptId === input.activeConceptId || candidate.isOutside) {
      continue;
    }

    const deltaX = candidate.x - input.center.x;
    const deltaY = candidate.y - input.center.y;

    if (
      Math.abs(deltaX) <= thresholdPx &&
      (snappedX === null || Math.abs(deltaX) < Math.abs(snappedX.delta))
    ) {
      snappedX = {
        conceptId: candidate.conceptId,
        guideViewport: candidate.x,
        delta: deltaX,
      };
    }

    if (
      Math.abs(deltaY) <= thresholdPx &&
      (snappedY === null || Math.abs(deltaY) < Math.abs(snappedY.delta))
    ) {
      snappedY = {
        conceptId: candidate.conceptId,
        guideViewport: candidate.y,
        delta: deltaY,
      };
    }
  }

  return {
    center: {
      x: snappedX?.guideViewport ?? input.center.x,
      y: snappedY?.guideViewport ?? input.center.y,
    },
    snap: {
      x: snappedX,
      y: snappedY,
    },
  };
}

export function deriveEdgeAutoPanIntent(input: {
  pointer: DragViewportPoint;
  width: number;
  height: number;
  hotZonePx?: number;
}): EdgeAutoPanIntent {
  const hotZonePx = input.hotZonePx ?? EDGE_AUTO_PAN_HOT_ZONE_PX;
  const horizontal =
    deriveDirectionalIntensity(input.pointer.x, input.width, hotZonePx);
  const vertical =
    deriveDirectionalIntensity(input.pointer.y, input.height, hotZonePx);

  return {
    x: horizontal,
    y: vertical,
    isActive: Math.abs(horizontal) > 0 || Math.abs(vertical) > 0,
  };
}

function deriveDirectionalIntensity(
  coordinate: number,
  extent: number,
  hotZonePx: number
): number {
  if (!Number.isFinite(coordinate) || !Number.isFinite(extent) || extent <= 0) {
    return 0;
  }

  const clampedCoordinate = Math.min(Math.max(coordinate, 0), extent);
  const distanceFromStart = clampedCoordinate;
  const distanceFromEnd = extent - clampedCoordinate;

  if (distanceFromStart <= hotZonePx) {
    return -normalizeHotZoneDistance(distanceFromStart, hotZonePx);
  }

  if (distanceFromEnd <= hotZonePx) {
    return normalizeHotZoneDistance(distanceFromEnd, hotZonePx);
  }

  return 0;
}

function normalizeHotZoneDistance(distance: number, hotZonePx: number): number {
  return Math.max(0, Math.min(1, (hotZonePx - distance) / hotZonePx));
}

export function reducePositionPersistenceState(
  state: PositionPersistenceState,
  event: PositionPersistenceEvent
): PositionPersistenceState {
  switch (event.type) {
    case "dragging":
      return {
        phase: "dragging",
        retryCount: 0,
        errorMessage: null,
      };
    case "saving":
      return {
        phase: "saving",
        retryCount: state.retryCount,
        errorMessage: null,
      };
    case "retry":
      return {
        phase: "saving",
        retryCount: state.retryCount + 1,
        errorMessage: null,
      };
    case "success":
      return INITIAL_POSITION_PERSISTENCE_STATE;
    case "error":
      return {
        phase: "error",
        retryCount: state.retryCount,
        errorMessage: event.message,
      };
    default:
      return state;
  }
}
