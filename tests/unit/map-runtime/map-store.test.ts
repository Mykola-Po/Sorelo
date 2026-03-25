import { describe, it, expect } from "vitest";
import {
  createMapStore,
  IDLE_DRAG_STATE,
} from "@/features/map-runtime/store/map-store";
import type { GraphSnapshot } from "@/features/map-runtime/types";

const INITIAL_SNAPSHOT: GraphSnapshot = {
  revision: 1,
  counts: {
    conceptCount: 1,
    linkCount: 0,
  },
  concepts: [
    {
      id: "concept-1",
      title: "Concept 1",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 120,
      y: 240,
      updatedAt: "2026-03-24T00:00:00.000Z",
    },
  ],
  links: [],
};

describe("MapStore (Zustand)", () => {
  it("should initialize with default states, custom mapId, and the seeded snapshot", () => {
    const store = createMapStore({
      mapId: "map-123",
      initialSnapshot: INITIAL_SNAPSHOT,
    });
    const state = store.getState();
    
    expect(state.mapId).toBe("map-123");
    expect(state.snapshot).toEqual(INITIAL_SNAPSHOT);
    expect(state.interactionMode).toBe("inspect");
    expect(state.selection).toEqual({ kind: "none" });
    expect(state.dragState).toEqual(IDLE_DRAG_STATE);
  });

  it("should replace the graph snapshot when setSnapshot is called", () => {
    const store = createMapStore({
      mapId: "map-1",
      initialSnapshot: INITIAL_SNAPSHOT,
    });
    const nextSnapshot: GraphSnapshot = {
      ...INITIAL_SNAPSHOT,
      revision: 2,
      counts: {
        conceptCount: 2,
        linkCount: 1,
      },
      concepts: [
        ...INITIAL_SNAPSHOT.concepts,
        {
          id: "concept-2",
          title: "Concept 2",
          conceptType: "state",
          summary: null,
          description: null,
          x: 360,
          y: 420,
          updatedAt: "2026-03-24T00:10:00.000Z",
        },
      ],
      links: [
        {
          id: "link-1",
          sourceConceptId: "concept-1",
          targetConceptId: "concept-2",
          relationType: "causes",
          strength: 3,
          description: null,
          updatedAt: "2026-03-24T00:10:00.000Z",
        },
      ],
    };

    store.getState().setSnapshot(nextSnapshot);
    expect(store.getState().snapshot).toEqual(nextSnapshot);
  });

  it("should manage node positions", () => {
    const store = createMapStore({
      mapId: "map-1",
      initialSnapshot: INITIAL_SNAPSHOT,
    });
    
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
    const store = createMapStore({
      mapId: "map-1",
      initialSnapshot: INITIAL_SNAPSHOT,
    });
    
    store.getState().setSelection({ kind: "concept", id: "concept-1" });
    expect(store.getState().selection).toEqual({ kind: "concept", id: "concept-1" });

    store.getState().clearSelection();
    expect(store.getState().selection).toEqual({ kind: "none" });
  });

  it("should handle drag state changes", () => {
    const store = createMapStore({
      mapId: "map-1",
      initialSnapshot: INITIAL_SNAPSHOT,
    });
    
    const dragPayload = {
      phase: "dragging" as const,
      conceptId: "concept-3",
      pointerType: "mouse" as const,
      startGraphPosition: { x: 0, y: 0 },
      currentGraphPosition: { x: 24, y: 18 },
      pointerViewportPosition: { x: 100, y: 100 },
      snap: {
        x: null,
        y: null,
      },
      pendingLongPress: false,
      retryCount: 0,
      errorMessage: null,
    };

    store.getState().setDragState(dragPayload);
    expect(store.getState().dragState).toEqual(dragPayload);

    store.getState().resetDragState();
    expect(store.getState().dragState).toEqual(IDLE_DRAG_STATE);
  });
});
