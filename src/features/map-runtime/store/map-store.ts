import { createStore } from "zustand";
import type { InspectorSelection } from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphSnapshot, GraphConceptNode } from "@/features/map-runtime/types";
import type {
  MapGraphEntityType,
  MapGraphOpKind,
} from "@/features/map-runtime/realtime/contracts";
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

export type PendingLocalGraphOperation = {
  clientId: string;
  clientMutationId: string;
  opKind: MapGraphOpKind;
  entityType: MapGraphEntityType;
  entityId: string;
};

export type ActiveLocalEntityLock = {
  entityType: MapGraphEntityType;
  reason: "dragging";
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
  clientId: string;
  
  // Graph Data
  snapshot: GraphSnapshot | null;
  positions: Record<string, ConceptPosition>;
  ghosts: GraphConceptNode[];
  lastAppliedSeq: number;
  pendingLocalOps: Record<string, PendingLocalGraphOperation>;
  activeLocalEntityLocks: Record<string, ActiveLocalEntityLock>;
  needsSnapshotFallback: boolean;

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
  setLastAppliedSeq: (seq: number) => void;
  addPendingLocalOp: (operation: PendingLocalGraphOperation) => void;
  clearPendingLocalOp: (key: string) => void;
  lockLocalEntity: (entityId: string, lock: ActiveLocalEntityLock) => void;
  unlockLocalEntity: (entityId: string) => void;
  setNeedsSnapshotFallback: (value: boolean) => void;
  setInteractionMode: (mode: CanvasInteractionMode) => void;
  setSelection: (selection: InspectorSelection) => void;
  clearSelection: () => void;
  setDragState: (dragState: DragState) => void;
  resetDragState: () => void;
  setConnectLinkSourceId: (id: string | null) => void;
  toggleGravity: () => void;
};

function createClientId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `map-client-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createMapStore(
  initProps: { mapId: string; initialSnapshot: GraphSnapshot }
) {
  return createStore<MapState>((set) => ({
    mapId: initProps.mapId,
    clientId: createClientId(),
    snapshot: initProps.initialSnapshot,
    positions: {},
    ghosts: [],
    lastAppliedSeq: initProps.initialSnapshot.revision,
    pendingLocalOps: {},
    activeLocalEntityLocks: {},
    needsSnapshotFallback: false,
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

    setLastAppliedSeq: (lastAppliedSeq) => set({ lastAppliedSeq }),

    addPendingLocalOp: (operation) =>
      set((state) => ({
        pendingLocalOps: {
          ...state.pendingLocalOps,
          [`${operation.clientId}:${operation.clientMutationId}`]: operation,
        },
      })),

    clearPendingLocalOp: (key) =>
      set((state) => {
        if (!(key in state.pendingLocalOps)) {
          return state;
        }

        const pendingLocalOps = { ...state.pendingLocalOps };
        delete pendingLocalOps[key];
        return {
          pendingLocalOps,
        };
      }),

    lockLocalEntity: (entityId, lock) =>
      set((state) => ({
        activeLocalEntityLocks: {
          ...state.activeLocalEntityLocks,
          [entityId]: lock,
        },
      })),

    unlockLocalEntity: (entityId) =>
      set((state) => {
        if (!(entityId in state.activeLocalEntityLocks)) {
          return state;
        }

        const activeLocalEntityLocks = { ...state.activeLocalEntityLocks };
        delete activeLocalEntityLocks[entityId];
        return {
          activeLocalEntityLocks,
        };
      }),

    setNeedsSnapshotFallback: (needsSnapshotFallback) =>
      set({ needsSnapshotFallback }),

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
