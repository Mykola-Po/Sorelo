import { describe, expect, it } from "vitest";

import {
  INITIAL_POSITION_PERSISTENCE_STATE,
  deriveStableSigmaBBox,
  deriveEdgeAutoPanIntent,
  getPointerTravelDistance,
  reducePositionPersistenceState,
  resolveConceptSoftSnap,
  shouldCancelTouchLongPress,
  shouldStartPointerDrag,
} from "@/features/map-runtime/renderers/concept-drag";

describe("concept drag helpers", () => {
  it("starts mouse drag only after the 4px threshold", () => {
    const distanceBelowThreshold = getPointerTravelDistance(
      { x: 100, y: 100 },
      { x: 103, y: 102 }
    );
    const distanceAtThreshold = getPointerTravelDistance(
      { x: 100, y: 100 },
      { x: 104, y: 100 }
    );

    expect(shouldStartPointerDrag("mouse", distanceBelowThreshold)).toBe(false);
    expect(shouldStartPointerDrag("mouse", distanceAtThreshold)).toBe(true);
    expect(shouldStartPointerDrag("pen", distanceAtThreshold)).toBe(true);
    expect(shouldStartPointerDrag("touch", distanceAtThreshold)).toBe(false);
  });

  it("cancels touch long-press only after the 8px movement threshold", () => {
    const smallMovement = getPointerTravelDistance(
      { x: 24, y: 24 },
      { x: 30, y: 29 }
    );
    const cancellingMovement = getPointerTravelDistance(
      { x: 24, y: 24 },
      { x: 33, y: 24 }
    );

    expect(shouldCancelTouchLongPress(smallMovement)).toBe(false);
    expect(shouldCancelTouchLongPress(cancellingMovement)).toBe(true);
  });

  it("soft-snaps only when another visible Concept is within the 10px threshold", () => {
    const outsideThreshold = resolveConceptSoftSnap({
      activeConceptId: "concept-a",
      center: { x: 100, y: 100 },
      candidates: [
        { conceptId: "concept-b", x: 112, y: 88, isOutside: false },
        { conceptId: "concept-c", x: 160, y: 160, isOutside: false },
      ],
    });

    expect(outsideThreshold.center).toEqual({ x: 100, y: 100 });
    expect(outsideThreshold.snap).toEqual({ x: null, y: null });

    const insideThreshold = resolveConceptSoftSnap({
      activeConceptId: "concept-a",
      center: { x: 100, y: 100 },
      candidates: [
        { conceptId: "concept-b", x: 108, y: 95, isOutside: false },
        { conceptId: "concept-c", x: 101, y: 140, isOutside: true },
      ],
    });

    expect(insideThreshold.center).toEqual({ x: 108, y: 95 });
    expect(insideThreshold.snap.x?.conceptId).toBe("concept-b");
    expect(insideThreshold.snap.y?.conceptId).toBe("concept-b");
  });

  it("derives edge auto-pan intent only inside the hot zone", () => {
    expect(
      deriveEdgeAutoPanIntent({
        pointer: { x: 240, y: 180 },
        width: 480,
        height: 360,
      })
    ).toEqual({
      x: 0,
      y: 0,
      isActive: false,
    });

    const rightBottomIntent = deriveEdgeAutoPanIntent({
      pointer: { x: 474, y: 350 },
      width: 480,
      height: 360,
    });

    expect(rightBottomIntent.isActive).toBe(true);
    expect(rightBottomIntent.x).toBeGreaterThan(0);
    expect(rightBottomIntent.y).toBeGreaterThan(0);
  });

  it("derives a stable Sigma bounding box from viewport bounds", () => {
    expect(
      deriveStableSigmaBBox({
        x: 120,
        y: 240,
        width: 1280,
        height: 860,
      })
    ).toEqual({
      x: [120, 1400],
      y: [240, 1100],
    });

    expect(
      deriveStableSigmaBBox({
        x: 0,
        y: 0,
        width: 640,
        height: 480,
      })
    ).toEqual({
      x: [0, 640],
      y: [0, 480],
    });
  });

  it("tracks saving lifecycle from dragging through retry and error states", () => {
    const dragging = reducePositionPersistenceState(
      INITIAL_POSITION_PERSISTENCE_STATE,
      { type: "dragging" }
    );
    expect(dragging).toEqual({
      phase: "dragging",
      retryCount: 0,
      errorMessage: null,
    });

    const saving = reducePositionPersistenceState(dragging, { type: "saving" });
    expect(saving).toEqual({
      phase: "saving",
      retryCount: 0,
      errorMessage: null,
    });

    const retrying = reducePositionPersistenceState(saving, { type: "retry" });
    expect(retrying).toEqual({
      phase: "saving",
      retryCount: 1,
      errorMessage: null,
    });

    const failed = reducePositionPersistenceState(retrying, {
      type: "error",
      message: "Unable to update concept positions.",
    });
    expect(failed).toEqual({
      phase: "error",
      retryCount: 1,
      errorMessage: "Unable to update concept positions.",
    });

    expect(
      reducePositionPersistenceState(failed, { type: "success" })
    ).toEqual(INITIAL_POSITION_PERSISTENCE_STATE);
  });
});
