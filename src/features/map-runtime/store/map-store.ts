import { createStore } from "zustand";
import type { InspectorSelection } from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphSnapshot, GraphViewport, GraphConceptNode } from "@/features/map-runtime/types";
import type {
  DragPointerType,
  DragSnapState,
} from "@/features/map-runtime/renderers/concept-drag";

export type ConceptPosition = {
  x: number;
  y: number;
};

export type DragPhase = "idle" | "press" | "dragging" | "saving" | "error";

export type DragState = {
  phase: DragPhase;
  conceptId: string | null;
  pointerType: DragPointerType | null;
  startGraphPosition: ConceptPosition | null;
  currentGraphPosition: ConceptPosition | null;
  pointerViewportPosition: ConceptPosition | null;
  snap: DragSnapState;
  pendingLongPress: boolean;
  retryCount: number;
  errorMessage: string | null;
};

export const IDLE_DRAG_STATE: DragState = {
  phase: "idle",
  conceptId: null,
  pointerType: null,
  startGraphPosition: null,
  currentGraphPosition: null,
  pointerViewportPosition: null,
  snap: {
    x: null,
    y: null,
  },
  pendingLongPress: false,
  retryCount: 0,
  errorMessage: null,
};

export type MapState = {
  // Config
  mapId: string;
  
  // Graph Data
  snapshot: GraphSnapshot | null;
  positions: Record<string, ConceptPosition>;
  ghosts: GraphConceptNode[];
  
  // Viewport details
  viewport: GraphViewport;
  
  // Interactions & Selections
  interactionMode: CanvasInteractionMode;
  selection: InspectorSelection;
  dragState: DragState;
  connectLinkSourceId: string | null;
  isGravityEnabled: boolean;

  // Actions
  setSnapshot: (snapshot: GraphSnapshot) => void;
  setGhosts: (ghosts: GraphConceptNode[]) => void;
  updateViewport: (partialViewport: Partial<GraphViewport>) => void;
  setPositions: (positions: Record<string, ConceptPosition>) => void;
  updateConceptPosition: (id: string, position: ConceptPosition) => void;
  setInteractionMode: (mode: CanvasInteractionMode) => void;
  setSelection: (selection: InspectorSelection) => void;
  clearSelection: () => void;
  setDragState: (dragState: DragState) => void;
  resetDragState: () => void;
  setConnectLinkSourceId: (id: string | null) => void;
  toggleGravity: () => void;
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
    ghosts: [],
    viewport: INITIAL_VIEWPORT,
    interactionMode: "inspect",
    selection: { kind: "none" },
    dragState: IDLE_DRAG_STATE,
    connectLinkSourceId: null,
    isGravityEnabled: false,

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

    resetDragState: () => set({ dragState: IDLE_DRAG_STATE }),
    
    setConnectLinkSourceId: (connectLinkSourceId) => set({ connectLinkSourceId }),
    toggleGravity: () => set((state) => ({ isGravityEnabled: !state.isGravityEnabled })),
    setGhosts: (ghosts) => set({ ghosts }),
  }));
}

export type MapStore = ReturnType<typeof createMapStore>;
