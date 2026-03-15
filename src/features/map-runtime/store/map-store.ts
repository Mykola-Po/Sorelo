import { createStore } from "zustand";
import type { InspectorSelection } from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphSnapshot, GraphViewport } from "@/features/map-runtime/types";

export type DragState = {
  id: string;
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
};

export type ConceptPosition = {
  x: number;
  y: number;
};

export type MapState = {
  // Config
  mapId: string;
  
  // Graph Data
  snapshot: GraphSnapshot | null;
  positions: Record<string, ConceptPosition>;
  
  // Viewport details
  viewport: GraphViewport;
  
  // Interactions & Selections
  interactionMode: CanvasInteractionMode;
  selection: InspectorSelection;
  dragState: DragState | null;
  connectLinkSourceId: string | null;

  // Actions
  setSnapshot: (snapshot: GraphSnapshot) => void;
  updateViewport: (partialViewport: Partial<GraphViewport>) => void;
  setPositions: (positions: Record<string, ConceptPosition>) => void;
  updateConceptPosition: (id: string, position: ConceptPosition) => void;
  setInteractionMode: (mode: CanvasInteractionMode) => void;
  setSelection: (selection: InspectorSelection) => void;
  clearSelection: () => void;
  setDragState: (dragState: DragState | null) => void;
  setConnectLinkSourceId: (id: string | null) => void;
};

export const INITIAL_VIEWPORT: GraphViewport = {
  x: 0,
  y: 0,
  width: 1280,
  height: 860,
  overscan: 320,
};

export function createMapStore(
  initProps: { mapId: string; initialSnapshot?: GraphSnapshot | null }
) {
  return createStore<MapState>((set) => ({
    mapId: initProps.mapId,
    snapshot: initProps.initialSnapshot ?? null,
    positions: {},
    viewport: INITIAL_VIEWPORT,
    interactionMode: "inspect",
    selection: { kind: "none" },
    dragState: null,
    connectLinkSourceId: null,

    setSnapshot: (snapshot) => set({ snapshot }),
    
    updateViewport: (partial) =>
      set((state) => {
        const nextViewport = { ...state.viewport, ...partial };
        const isUnchanged =
          nextViewport.x === state.viewport.x &&
          nextViewport.y === state.viewport.y &&
          nextViewport.width === state.viewport.width &&
          nextViewport.height === state.viewport.height &&
          nextViewport.overscan === state.viewport.overscan;

        if (isUnchanged) {
          return state;
        }

        return { viewport: nextViewport };
      }),
      
    setPositions: (positions) => set({ positions }),
    
    updateConceptPosition: (id, position) =>
      set((state) => ({
        positions: {
          ...state.positions,
          [id]: position,
        },
      })),

    setInteractionMode: (interactionMode) => set({ interactionMode }),
    
    setSelection: (selection) => set({ selection }),
    
    clearSelection: () => set({ selection: { kind: "none" } }),
    
    setDragState: (dragState) => set({ dragState }),
    
    setConnectLinkSourceId: (connectLinkSourceId) => set({ connectLinkSourceId }),
  }));
}

export type MapStore = ReturnType<typeof createMapStore>;
