import { describe, it, expect } from "vitest";
import { createMapStore, INITIAL_VIEWPORT } from "@/features/map-runtime/store/map-store";

describe("MapStore (Zustand)", () => {
  it("should initialize with default states and custom mapId", () => {
    const store = createMapStore({ mapId: "map-123" });
    const state = store.getState();
    
    expect(state.mapId).toBe("map-123");
    expect(state.viewport).toEqual(INITIAL_VIEWPORT);
    expect(state.interactionMode).toBe("inspect");
    expect(state.selection).toEqual({ kind: "none" });
    expect(state.dragState).toBeNull();
  });

  it("should update viewport correctly", () => {
    const store = createMapStore({ mapId: "map-1" });
    
    store.getState().updateViewport({ x: 500, y: 300 });
    const viewport = store.getState().viewport;
    
    // x and y should be updated, others remain defaults
    expect(viewport.x).toBe(500);
    expect(viewport.y).toBe(300);
    expect(viewport.width).toBe(INITIAL_VIEWPORT.width);
  });

  it("should avoid viewport writes when values are unchanged", () => {
    const store = createMapStore({ mapId: "map-1" });
    const beforeState = store.getState();
    const beforeViewport = beforeState.viewport;

    store.getState().updateViewport({
      x: beforeViewport.x,
      y: beforeViewport.y,
      width: beforeViewport.width,
      height: beforeViewport.height,
      overscan: beforeViewport.overscan,
    });

    const afterState = store.getState();
    expect(afterState).toBe(beforeState);
    expect(afterState.viewport).toBe(beforeViewport);
  });

  it("should manage node positions", () => {
    const store = createMapStore({ mapId: "map-1" });
    
    // set multiple at once
    store.getState().setPositions({
      "node-1": { x: 10, y: 10 },
      "node-2": { x: 20, y: 20 },
    });
    
    expect(store.getState().positions["node-1"]).toEqual({ x: 10, y: 10 });

    // update one specifically
    store.getState().updateConceptPosition("node-1", { x: 99, y: 99 });
    
    const positions = store.getState().positions;
    expect(positions["node-1"]).toEqual({ x: 99, y: 99 });
    expect(positions["node-2"]).toEqual({ x: 20, y: 20 }); // unaffected
  });

  it("should handle selection changes", () => {
    const store = createMapStore({ mapId: "map-1" });
    
    store.getState().setSelection({ kind: "concept", id: "concept-1" });
    expect(store.getState().selection).toEqual({ kind: "concept", id: "concept-1" });

    store.getState().clearSelection();
    expect(store.getState().selection).toEqual({ kind: "none" });
  });

  it("should handle drag state changes", () => {
    const store = createMapStore({ mapId: "map-1" });
    
    const dragPayload = {
      id: "concept-3",
      pointerX: 100,
      pointerY: 100,
      startX: 0,
      startY: 0
    };

    store.getState().setDragState(dragPayload);
    expect(store.getState().dragState).toEqual(dragPayload);

    store.getState().setDragState(null);
    expect(store.getState().dragState).toBeNull();
  });
});
