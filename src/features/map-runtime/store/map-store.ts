import { createStore } from "zustand";
import type { InspectorSelection } from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphSnapshot, GraphConceptNode } from "@/features/map-runtime/types";
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

  // Interactions & Selections
  interactionMode: CanvasInteractionMode;
  selection: InspectorSelection;
  dragState: DragState;
  connectLinkSourceId: string | null;
  isGravityEnabled: boolean;

  // Actions
  setSnapshot: (snapshot: GraphSnapshot) => void;
  setGhosts: (ghosts: GraphConceptNode[]) => void;
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

export function createMapStore(
  initProps: { mapId: string; initialSnapshot: GraphSnapshot }
) {
  return createStore<MapState>((set) => ({
    mapId: initProps.mapId,
    snapshot: initProps.initialSnapshot,
    positions: {},
    ghosts: [],
    interactionMode: "inspect",
    selection: { kind: "none" },
    dragState: IDLE_DRAG_STATE,
    connectLinkSourceId: null,
    isGravityEnabled: false,

    setSnapshot: (snapshot) => set({ snapshot }),

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
