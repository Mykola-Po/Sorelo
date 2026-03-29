"use client";

import {
  useLayoutEffect,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDrag } from "@use-gesture/react";
import { Badge, Text } from "@radix-ui/themes";
import type {
  InspectorMutationFeedback,
  InspectorSelection,
} from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphMetrics, MapDetail } from "@/features/maps/types";
import type {
  GraphConceptNode,
  GraphSnapshot,
} from "@/features/map-runtime/types";
import type {
  ConceptPositionMutationResponse,
  MapGraphOperation,
} from "@/features/map-runtime/realtime/contracts";
import {
  isConceptArchiveOperation,
  isConceptPositionSetOperation,
  isLinkArchiveOperation,
} from "@/features/map-runtime/realtime/contracts";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";

import { useMapStore } from "../store/map-store-provider";
import { buildGraphologyInstance } from "../renderers/graph-builder";
import {
  applySigmaZoomBounds,
  createSigmaInstance,
} from "../renderers/sigma-instance";
import {
  deriveLodThresholds,
  deriveZoomBounds,
  type CanvasZoomState,
} from "../renderers/zoom-policy";
import {
  EDGE_AUTO_PAN_HOT_ZONE_PX,
  INITIAL_POSITION_PERSISTENCE_STATE,
  POSITION_SAVE_RETRY_DELAY_MS,
  TOUCH_LONG_PRESS_MS,
  deriveGraphSigmaBBox,
  deriveEdgeAutoPanIntent,
  getPointerTravelDistance,
  reducePositionPersistenceState,
  resolveConceptSoftSnap,
  shouldCancelTouchLongPress,
  shouldStartPointerDrag,
  type DragPointerType,
  type DragViewportPoint,
  type StableSigmaBBox,
} from "../renderers/concept-drag";
import type { Sigma } from "sigma";
import { IDLE_DRAG_STATE } from "../store/map-store";
import { useGraphSnapshotBootstrap } from "../hooks/use-graph-snapshot-bootstrap";
import { useGraphMutationQueue } from "../hooks/use-graph-mutation-queue";
import { useMapRealtimeInvalidation } from "../hooks/use-map-realtime-invalidation";
import { applyGraphOperationToSnapshot } from "../realtime/apply-graph-operation";
const MUTATION_FEEDBACK_DURATION_MS = 2400;
const EDGE_AUTO_PAN_START_DELAY_MS = 220;

const EMPTY_GRAPH_SNAPSHOT: GraphSnapshot = {
  revision: 0,
  counts: {
    conceptCount: 0,
    linkCount: 0,
  },
  concepts: [],
  links: [],
};

type ViewportNodePosition = {
  x: number;
  y: number;
  isOutside: boolean;
};

type ConceptDragSession = {
  conceptId: string;
  positionRequestId: number;
  pointerType: DragPointerType;
  pressedAt: number;
  startPointerViewport: DragViewportPoint;
  currentPointerViewport: DragViewportPoint;
  startGraphPosition: DragViewportPoint;
  currentGraphPosition: DragViewportPoint;
  grabOffsetViewport: DragViewportPoint;
  autoPanIntentStartedAt: number | null;
  pendingLongPress: boolean;
  isDragging: boolean;
};

function deriveGesturePointerType(event: Event): DragPointerType {
  if ("pointerType" in event && typeof event.pointerType === "string") {
    const pointerType = event.pointerType;
    if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
      return pointerType;
    }
  }

  if ("touches" in event) {
    return "touch";
  }

  return "mouse";
}

declare global {
  interface Window {
    __SIGMA__?: Sigma;
  }
}

type GraphCanvasRuntimeProps = {
  locale: SupportedLocale;
  map: MapDetail;
  graphMetrics: GraphMetrics;
  canEditGraph: boolean;
  selection: InspectorSelection;
  interactionMode: CanvasInteractionMode;
  connectLinkSourceId: string | null;
  mutationFeedback: InspectorMutationFeedback | null;
  onClearSelection: () => void;
  onOpenCreateConcept: (x: number, y: number) => void;
  onOpenConceptInspector: (conceptId: string) => void;
  onOpenLinkInspector: (linkId: string) => void;
  onPickConnectSource: (conceptId: string) => void;
  onCompleteConnectLink: (sourceConceptId: string, targetConceptId: string) => void;
  onZoomStateChange?: (state: CanvasZoomState) => void;
};

export function GraphCanvasRuntime({
  locale,
  map,
  graphMetrics,
  canEditGraph,
  selection,
  interactionMode,
  connectLinkSourceId,
  mutationFeedback,
  onClearSelection,
  onOpenCreateConcept,
  onOpenConceptInspector,
  onOpenLinkInspector,
  onPickConnectSource,
  onCompleteConnectLink,
  onZoomStateChange,
}: GraphCanvasRuntimeProps) {
  const messages = getMapWorkspaceMessages(locale);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsLayerRef = useRef<HTMLDivElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dotRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const suppressClickForConceptIdRef = useRef<string | null>(null);
  const teardownTouchDragRef = useRef<(() => void) | null>(null);
  const dragSessionRef = useRef<ConceptDragSession | null>(null);
  const conceptViewportPositionsRef = useRef<Map<string, ViewportNodePosition>>(new Map());
  const zoomPolicyRef = useRef<Omit<CanvasZoomState, "ratio"> | null>(null);
  const stableSigmaBBoxRef = useRef<StableSigmaBBox | null>(null);
  const lastHydratedSnapshotRef = useRef<GraphSnapshot | null>(null);

  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const isZoomedOutRef = useRef(isZoomedOut);
  const [hoveredConceptId, setHoveredConceptId] = useState<string | null>(null);
  const hoveredConceptIdRef = useRef<string | null>(hoveredConceptId);

  // Zustand State
  const snapshot = useMapStore((s) => s.snapshot);
  const setSnapshot = useMapStore((s) => s.setSnapshot);
  const clientId = useMapStore((s) => s.clientId);
  const positions = useMapStore((s) => s.positions);
  const setPositions = useMapStore((s) => s.setPositions);
  const updateConceptPosition = useMapStore((s) => s.updateConceptPosition);
  const lastAppliedSeq = useMapStore((s) => s.lastAppliedSeq);
  const setLastAppliedSeq = useMapStore((s) => s.setLastAppliedSeq);
  const addPendingLocalOp = useMapStore((s) => s.addPendingLocalOp);
  const clearPendingLocalOp = useMapStore((s) => s.clearPendingLocalOp);
  const activeLocalEntityLocks = useMapStore((s) => s.activeLocalEntityLocks);
  const lockLocalEntity = useMapStore((s) => s.lockLocalEntity);
  const unlockLocalEntity = useMapStore((s) => s.unlockLocalEntity);
  const setNeedsSnapshotFallback = useMapStore((s) => s.setNeedsSnapshotFallback);
  const dragState = useMapStore((s) => s.dragState);
  const setDragState = useMapStore((s) => s.setDragState);
  const resetDragState = useMapStore((s) => s.resetDragState);
  const snapshotRef = useRef(snapshot);
  const positionsRef = useRef(positions);
  const lastAppliedSeqRef = useRef(lastAppliedSeq);
  const activeLocalEntityLocksRef = useRef(activeLocalEntityLocks);
  const dragStateRef = useRef(dragState);
  const feedbackConceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackEdgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPanDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPanFrameRef = useRef<number | null>(null);
  const scheduleAutoPanRef = useRef<() => void>(() => {});
  const restoreEdgeStyleRef = useRef<(() => void) | null>(null);
  const appliedFeedbackEventIdRef = useRef<string | null>(null);
  const [feedbackConceptId, setFeedbackConceptId] = useState<string | null>(null);
  const [mutationStatusMessage, setMutationStatusMessage] = useState<string | null>(null);

  // Store refs for stable Sigma closures
  const interactionModeRef = useRef(interactionMode);
  const connectLinkSourceIdRef = useRef(connectLinkSourceId);
  const onOpenCreateConceptRef = useRef(onOpenCreateConcept);
  const onOpenConceptInspectorRef = useRef(onOpenConceptInspector);
  const onOpenLinkInspectorRef = useRef(onOpenLinkInspector);
  const onClearSelectionRef = useRef(onClearSelection);
  const onPickConnectSourceRef = useRef(onPickConnectSource);
  const onCompleteConnectLinkRef = useRef(onCompleteConnectLink);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    connectLinkSourceIdRef.current = connectLinkSourceId;
  }, [connectLinkSourceId]);

  useEffect(() => {
    onOpenCreateConceptRef.current = onOpenCreateConcept;
  }, [onOpenCreateConcept]);

  useEffect(() => {
    onOpenConceptInspectorRef.current = onOpenConceptInspector;
  }, [onOpenConceptInspector]);

  useEffect(() => {
    onOpenLinkInspectorRef.current = onOpenLinkInspector;
  }, [onOpenLinkInspector]);

  useEffect(() => {
    onClearSelectionRef.current = onClearSelection;
  }, [onClearSelection]);

  useEffect(() => {
    onPickConnectSourceRef.current = onPickConnectSource;
  }, [onPickConnectSource]);

  useEffect(() => {
    onCompleteConnectLinkRef.current = onCompleteConnectLink;
  }, [onCompleteConnectLink]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    lastAppliedSeqRef.current = lastAppliedSeq;
  }, [lastAppliedSeq]);

  useEffect(() => {
    activeLocalEntityLocksRef.current = activeLocalEntityLocks;
  }, [activeLocalEntityLocks]);

  useEffect(() => {
    isZoomedOutRef.current = isZoomedOut;
  }, [isZoomedOut]);

  useEffect(() => {
    hoveredConceptIdRef.current = hoveredConceptId;
  }, [hoveredConceptId]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    return () => {
      if (feedbackConceptTimerRef.current !== null) {
        clearTimeout(feedbackConceptTimerRef.current);
      }
      if (feedbackEdgeTimerRef.current !== null) {
        clearTimeout(feedbackEdgeTimerRef.current);
      }
      if (mutationStatusTimerRef.current !== null) {
        clearTimeout(mutationStatusTimerRef.current);
      }
      if (autoPanDelayTimerRef.current !== null) {
        clearTimeout(autoPanDelayTimerRef.current);
      }
      if (autoPanFrameRef.current !== null) {
        window.cancelAnimationFrame(autoPanFrameRef.current);
      }
      teardownTouchDragRef.current?.();
      restoreEdgeStyleRef.current?.();
      feedbackConceptTimerRef.current = null;
      feedbackEdgeTimerRef.current = null;
      autoPanDelayTimerRef.current = null;
      autoPanFrameRef.current = null;
      restoreEdgeStyleRef.current = null;
      teardownTouchDragRef.current = null;
      dragSessionRef.current = null;
    };
  }, []);

  // Local fetch states
  const syncLocalConceptPosition = useCallback(
    (conceptId: string, position: DragViewportPoint) => {
      positionsRef.current = {
        ...positionsRef.current,
        [conceptId]: position,
      };
      updateConceptPosition(conceptId, position);
    },
    [updateConceptPosition]
  );

  const syncSnapshotConceptPositionRef = useCallback(
    (conceptId: string, position: DragViewportPoint, revision?: number) => {
      const activeSnapshot = snapshotRef.current;
      if (!activeSnapshot) {
        return;
      }

      const nextX = Math.round(position.x);
      const nextY = Math.round(position.y);
      const nextRevision =
        typeof revision === "number" ? revision : activeSnapshot.revision;
      const nextConcepts = activeSnapshot.concepts.map((candidate) =>
        candidate.id === conceptId
          ? {
              ...candidate,
              x: nextX,
              y: nextY,
            }
          : candidate
      );

      const nextSnapshot = {
        ...activeSnapshot,
        revision: nextRevision,
        concepts: nextConcepts,
      };

      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
    },
    [setSnapshot]
  );

  const ensureStableSigmaBBox = useCallback(
    (
      nextSigma: Sigma,
      nextSnapshot: GraphSnapshot,
      nextPositions?: Record<string, DragViewportPoint>
    ) => {
      const nextBBox = deriveGraphSigmaBBox(
        nextPositions
          ? {
              snapshot: nextSnapshot,
              positions: nextPositions,
            }
          : {
              snapshot: nextSnapshot,
            }
      );

      if (nextBBox !== null) {
        const currentBBox = stableSigmaBBoxRef.current;
        stableSigmaBBoxRef.current =
          currentBBox === null
            ? nextBBox
            : {
                x: [
                  Math.min(currentBBox.x[0], nextBBox.x[0]),
                  Math.max(currentBBox.x[1], nextBBox.x[1]),
                ],
                y: [
                  Math.min(currentBBox.y[0], nextBBox.y[0]),
                  Math.max(currentBBox.y[1], nextBBox.y[1]),
                ],
              };
      }

      if (stableSigmaBBoxRef.current !== null) {
        nextSigma.setCustomBBox(stableSigmaBBoxRef.current);
      }
    },
    []
  );

  const clearLocalPositions = useCallback(() => {
    positionsRef.current = {};
    setPositions({});
  }, [setPositions]);

  const { fetchLatestSnapshot, isSnapshotLoading, snapshotError } =
    useGraphSnapshotBootstrap({
      mapId: map.id,
      snapshot,
      setSnapshot,
      setLastAppliedSeq,
      setNeedsSnapshotFallback,
      clearPositions: clearLocalPositions,
    });
  const fetchLatestSnapshotRef = useRef(fetchLatestSnapshot);

  useEffect(() => {
    fetchLatestSnapshotRef.current = fetchLatestSnapshot;
  }, [fetchLatestSnapshot]);

  const stopAutoPan = useCallback(() => {
    if (autoPanFrameRef.current !== null) {
      window.cancelAnimationFrame(autoPanFrameRef.current);
      autoPanFrameRef.current = null;
    }
  }, []);

  const clearAutoPanDelayTimer = useCallback(() => {
    if (autoPanDelayTimerRef.current !== null) {
      clearTimeout(autoPanDelayTimerRef.current);
      autoPanDelayTimerRef.current = null;
    }
  }, []);

  const toViewportPoint = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const bounds = container.getBoundingClientRect();
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  }, []);

  const handleCommittedPositionMutation = useCallback(
    (result: ConceptPositionMutationResponse) => {
      syncSnapshotConceptPositionRef(
        result.concept.id,
        {
          x: result.concept.x,
          y: result.concept.y,
        },
        result.revision
      );
      setLastAppliedSeq(result.seq);
      lastAppliedSeqRef.current = result.seq;
    },
    [setLastAppliedSeq, syncSnapshotConceptPositionRef]
  );

  const {
    clearPositionRetryTimer,
    createPositionMutationRequestId,
    persistConceptPosition,
  } = useGraphMutationQueue({
    mapId: map.id,
    clientId,
    getExpectedRevision: () => lastAppliedSeqRef.current,
    dragStateRef,
    dragSessionRef: dragSessionRef as MutableRefObject<object | null>,
    positionSaveFailedMessage: messages.canvas.positionSaveFailed,
    setDragState,
    resetDragState,
    addPendingLocalOp,
    clearPendingLocalOp,
    onConflict: () => {
      void fetchLatestSnapshot();
    },
    onMutationCommitted: handleCommittedPositionMutation,
    reducePositionPersistenceState,
    initialPersistenceState: INITIAL_POSITION_PERSISTENCE_STATE,
    retryDelayMs: POSITION_SAVE_RETRY_DELAY_MS,
  });

  const updateZoomMode = useCallback(
    (ratio: number) => {
      if (!Number.isFinite(ratio)) {
        return;
      }

      const zoomPolicy = zoomPolicyRef.current;
      if (!zoomPolicy) {
        return;
      }

      const boundedRatio = Math.min(
        Math.max(ratio, zoomPolicy.minRatio),
        zoomPolicy.maxRatio
      );

      onZoomStateChange?.({
        ratio: boundedRatio,
        ...zoomPolicy,
      });

      const currentlyZoomedOut = isZoomedOutRef.current;
      const nextZoomedOut = currentlyZoomedOut
        ? boundedRatio > zoomPolicy.dotExitRatio
        : boundedRatio >= zoomPolicy.dotEnterRatio;

      if (nextZoomedOut !== currentlyZoomedOut) {
        isZoomedOutRef.current = nextZoomedOut;
        if (!nextZoomedOut) {
          hoveredConceptIdRef.current = null;
          setHoveredConceptId(null);
        }
        setIsZoomedOut(nextZoomedOut);
      }
    },
    [onZoomStateChange]
  );

  const syncConceptPresentation = useCallback(() => {
    const sigma = sigmaRef.current;
    const layer = cardsLayerRef.current;
    const activeSnapshot = snapshotRef.current;
    if (!sigma || !activeSnapshot || !layer) {
      return;
    }

    const graph = sigma.getGraph();
    const layerRect = layer.getBoundingClientRect();
    const zoomedOut = isZoomedOutRef.current;
    const nextViewportMap = new Map<string, ViewportNodePosition>();

    for (const concept of activeSnapshot.concepts) {
      const cardElement = cardRefs.current.get(concept.id);
      const dotElement = dotRefs.current.get(concept.id);

      if (!graph.hasNode(concept.id)) {
        if (cardElement) {
          cardElement.style.opacity = "0";
          cardElement.style.pointerEvents = "none";
        }
        if (dotElement) {
          dotElement.style.opacity = "0";
          dotElement.style.pointerEvents = "none";
        }
        continue;
      }

      const graphX = graph.getNodeAttribute(concept.id, "x");
      const graphY = graph.getNodeAttribute(concept.id, "y");
      const viewportPosition = sigma.graphToViewport({ x: graphX, y: graphY });
      const isFinitePosition =
        Number.isFinite(viewportPosition.x) && Number.isFinite(viewportPosition.y);

      if (!isFinitePosition) {
        if (cardElement) {
          cardElement.style.opacity = "0";
          cardElement.style.pointerEvents = "none";
        }
        if (dotElement) {
          dotElement.style.opacity = "0";
          dotElement.style.pointerEvents = "none";
        }
        continue;
      }

      const isOutsideViewport =
        viewportPosition.x < -320 ||
        viewportPosition.y < -240 ||
        viewportPosition.x > layerRect.width + 320 ||
        viewportPosition.y > layerRect.height + 240;

      nextViewportMap.set(concept.id, {
        x: viewportPosition.x,
        y: viewportPosition.y,
        isOutside: isOutsideViewport,
      });

      const accentColor =
        (graph.getNodeAttribute(concept.id, "accentColor") as string | undefined) ?? "#868e96";

      if (cardElement) {
        const isCardVisible = !zoomedOut && !isOutsideViewport;
        cardElement.style.left = `${viewportPosition.x}px`;
        cardElement.style.top = `${viewportPosition.y}px`;
        cardElement.style.opacity = isCardVisible ? "1" : "0";
        cardElement.style.pointerEvents = isCardVisible ? "auto" : "none";
        cardElement.style.setProperty("--sl-concept-card-accent", accentColor);
      }

      if (dotElement) {
        const isDotVisible = zoomedOut && !isOutsideViewport;
        dotElement.style.left = `${viewportPosition.x}px`;
        dotElement.style.top = `${viewportPosition.y}px`;
        dotElement.style.opacity = isDotVisible ? "1" : "0";
        dotElement.style.pointerEvents = isDotVisible ? "auto" : "none";
        dotElement.style.setProperty("--sl-concept-card-accent", accentColor);
      }
    }

    conceptViewportPositionsRef.current = nextViewportMap;

    const hoverCardElement = hoverCardRef.current;
    if (!hoverCardElement) {
      return;
    }

    const hoveredId = hoveredConceptIdRef.current;
    if (!zoomedOut || !hoveredId) {
      hoverCardElement.style.opacity = "0";
      hoverCardElement.style.pointerEvents = "none";
      return;
    }

    const hoveredPosition = nextViewportMap.get(hoveredId);
    if (!hoveredPosition || hoveredPosition.isOutside) {
      hoverCardElement.style.opacity = "0";
      hoverCardElement.style.pointerEvents = "none";
      return;
    }

    const accentColor =
      (graph.getNodeAttribute(hoveredId, "accentColor") as string | undefined) ?? "#868e96";
    hoverCardElement.style.left = `${hoveredPosition.x}px`;
    hoverCardElement.style.top = `${hoveredPosition.y}px`;
    hoverCardElement.style.opacity = "1";
    hoverCardElement.style.pointerEvents = "none";
    hoverCardElement.style.setProperty("--sl-concept-card-accent", accentColor);
  }, []);

  const refreshDraggedConceptScene = useCallback((conceptId: string) => {
    const sigma = sigmaRef.current;
    if (!sigma) {
      return;
    }

    const graph = sigma.getGraph();
    if (!graph.hasNode(conceptId)) {
      return;
    }

    sigma.refresh({
      partialGraph: {
        nodes: [conceptId],
        edges: graph.edges(conceptId),
      },
      skipIndexation: true,
    });
  }, []);

  const applyIncomingOperation = useCallback(
    (operation: MapGraphOperation) => {
      if (isConceptPositionSetOperation(operation)) {
        const nextPosition = {
          x: operation.payload.x,
          y: operation.payload.y,
        };

        syncSnapshotConceptPositionRef(
          operation.entityId,
          nextPosition,
          operation.seq
        );
        syncLocalConceptPosition(operation.entityId, nextPosition);

        const sigma = sigmaRef.current;
        if (!sigma) {
          return true;
        }

        const graph = sigma.getGraph();
        if (!graph.hasNode(operation.entityId)) {
          return false;
        }

        graph.setNodeAttribute(operation.entityId, "x", nextPosition.x);
        graph.setNodeAttribute(operation.entityId, "y", nextPosition.y);
        refreshDraggedConceptScene(operation.entityId);
        syncConceptPresentation();
        return true;
      }

      const activeSnapshot = snapshotRef.current ?? EMPTY_GRAPH_SNAPSHOT;
      const nextSnapshot = applyGraphOperationToSnapshot(activeSnapshot, operation);
      if (!nextSnapshot) {
        return false;
      }

      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);

      if (isConceptArchiveOperation(operation)) {
        if (hoveredConceptIdRef.current === operation.entityId) {
          hoveredConceptIdRef.current = null;
          setHoveredConceptId(null);
        }

        if (operation.entityId in positionsRef.current) {
          const nextPositions = { ...positionsRef.current };
          delete nextPositions[operation.entityId];
          positionsRef.current = nextPositions;
          setPositions(nextPositions);
        }

        const isArchivedConceptSelection =
          selection.kind === "concept" && selection.id === operation.entityId;
        const isArchivedDraftSelection =
          selection.kind === "create-link" &&
          (selection.sourceConceptId === operation.entityId ||
            selection.targetConceptId === operation.entityId);
        const isArchivedConnectSource =
          connectLinkSourceIdRef.current === operation.entityId;

        if (
          isArchivedConceptSelection ||
          isArchivedDraftSelection ||
          isArchivedConnectSource
        ) {
          onClearSelectionRef.current();
        }
      }

      if (isLinkArchiveOperation(operation)) {
        const isArchivedLinkSelection =
          selection.kind === "link" && selection.id === operation.entityId;

        if (isArchivedLinkSelection) {
          onClearSelectionRef.current();
        }
      }

      return true;
    },
    [
      connectLinkSourceIdRef,
      onClearSelectionRef,
      refreshDraggedConceptScene,
      selection,
      setPositions,
      setSnapshot,
      setHoveredConceptId,
      syncConceptPresentation,
      syncLocalConceptPosition,
      syncSnapshotConceptPositionRef,
    ]
  );

  useMapRealtimeInvalidation({
    mapId: map.id,
    clientId,
    dragPhase: dragState.phase,
    lastAppliedSeqRef,
    setLastAppliedSeq,
    setNeedsSnapshotFallback,
    hasActiveLocalEntityLock: (entityId) => entityId in activeLocalEntityLocksRef.current,
    clearPendingLocalOp,
    applyIncomingOperation,
    fetchLatestSnapshot,
  });

  const handleConceptActivation = useCallback(
    (conceptId: string) => {
      const mode = interactionModeRef.current;
      const sourceId = connectLinkSourceIdRef.current;

      if (mode === "connectLink") {
        if (!sourceId) {
          onPickConnectSourceRef.current(conceptId);
          return;
        }
        if (sourceId === conceptId) {
          return;
        }
        onCompleteConnectLinkRef.current(sourceId, conceptId);
        return;
      }

      onOpenConceptInspectorRef.current(conceptId);
    },
    []
  );

  const registerConceptCardRef = useCallback(
    (conceptId: string, element: HTMLButtonElement | null) => {
      if (element) {
        cardRefs.current.set(conceptId, element);
        return;
      }
      cardRefs.current.delete(conceptId);
    },
    []
  );

  const registerConceptDotRef = useCallback(
    (conceptId: string, element: HTMLButtonElement | null) => {
      if (element) {
        dotRefs.current.set(conceptId, element);
        return;
      }
      dotRefs.current.delete(conceptId);
    },
    []
  );

  const getShortSummary = useCallback(
    (concept: GraphConceptNode) =>
      concept.summary?.trim() ||
      concept.description?.trim() ||
      messages.canvas.conceptSummaryFallback,
    [messages.canvas.conceptSummaryFallback]
  );

  const applyMutationFeedback = useCallback(
    (feedback: InspectorMutationFeedback) => {
      const sigma = sigmaRef.current;
      if (!sigma) {
        return false;
      }

      const graph = sigma.getGraph();
      const camera = sigma.getCamera();

      if (feedback.kind === "concept") {
        if (!graph.hasNode(feedback.id)) {
          return false;
        }

        const focusX = Number(graph.getNodeAttribute(feedback.id, "x"));
        const focusY = Number(graph.getNodeAttribute(feedback.id, "y"));
        if (Number.isFinite(focusX) && Number.isFinite(focusY)) {
          camera.animate({ x: focusX, y: focusY }, { duration: 220 });
        }

        setFeedbackConceptId(feedback.id);
        if (feedbackConceptTimerRef.current !== null) {
          clearTimeout(feedbackConceptTimerRef.current);
        }
        feedbackConceptTimerRef.current = setTimeout(() => {
          setFeedbackConceptId((current) =>
            current === feedback.id ? null : current
          );
          feedbackConceptTimerRef.current = null;
        }, MUTATION_FEEDBACK_DURATION_MS);

        return true;
      }

      if (!graph.hasEdge(feedback.id)) {
        return false;
      }

      const linkSnapshot = snapshotRef.current?.links.find((link) => link.id === feedback.id);
      if (linkSnapshot) {
        const sourceExists = graph.hasNode(linkSnapshot.sourceConceptId);
        const targetExists = graph.hasNode(linkSnapshot.targetConceptId);

        if (sourceExists && targetExists) {
          const sourceX = Number(graph.getNodeAttribute(linkSnapshot.sourceConceptId, "x"));
          const sourceY = Number(graph.getNodeAttribute(linkSnapshot.sourceConceptId, "y"));
          const targetX = Number(graph.getNodeAttribute(linkSnapshot.targetConceptId, "x"));
          const targetY = Number(graph.getNodeAttribute(linkSnapshot.targetConceptId, "y"));

          if (
            Number.isFinite(sourceX) &&
            Number.isFinite(sourceY) &&
            Number.isFinite(targetX) &&
            Number.isFinite(targetY)
          ) {
            camera.animate(
              {
                x: (sourceX + targetX) / 2,
                y: (sourceY + targetY) / 2,
              },
              { duration: 220 }
            );
          }
        }
      }

      restoreEdgeStyleRef.current?.();
      if (feedbackEdgeTimerRef.current !== null) {
        clearTimeout(feedbackEdgeTimerRef.current);
      }

      const baseSize = Number(graph.getEdgeAttribute(feedback.id, "size")) || 2;
      const baseColor =
        (graph.getEdgeAttribute(feedback.id, "color") as string | undefined) ??
        "#868e96";

      graph.setEdgeAttribute(feedback.id, "size", Math.max(baseSize * 1.9, 3.75));
      graph.setEdgeAttribute(feedback.id, "color", "#111827");
      sigma.refresh();

      restoreEdgeStyleRef.current = () => {
        if (!graph.hasEdge(feedback.id)) {
          return;
        }

        graph.setEdgeAttribute(feedback.id, "size", baseSize);
        graph.setEdgeAttribute(feedback.id, "color", baseColor);
        sigma.refresh();
      };

      feedbackEdgeTimerRef.current = setTimeout(() => {
        restoreEdgeStyleRef.current?.();
        restoreEdgeStyleRef.current = null;
        feedbackEdgeTimerRef.current = null;
      }, MUTATION_FEEDBACK_DURATION_MS);

      return true;
    },
    []
  );

  useEffect(() => {
    if (!mutationFeedback) {
      return;
    }

    if (mutationStatusTimerRef.current !== null) {
      clearTimeout(mutationStatusTimerRef.current);
    }

    queueMicrotask(() => {
      setMutationStatusMessage(mutationFeedback.message);
    });

    mutationStatusTimerRef.current = setTimeout(() => {
      setMutationStatusMessage(null);
      mutationStatusTimerRef.current = null;
    }, MUTATION_FEEDBACK_DURATION_MS);
  }, [mutationFeedback]);

  useEffect(() => {
    if (!mutationFeedback) {
      return;
    }

    if (appliedFeedbackEventIdRef.current !== mutationFeedback.eventId) {
      queueMicrotask(() => {
        const applied = applyMutationFeedback(mutationFeedback);
        if (applied) {
          appliedFeedbackEventIdRef.current = mutationFeedback.eventId;
        }
      });
    }
  }, [applyMutationFeedback, mutationFeedback, snapshot]);

  const handleConceptCardClick = useCallback(
    (conceptId: string) => {
      if (suppressClickForConceptIdRef.current === conceptId) {
        suppressClickForConceptIdRef.current = null;
        return;
      }

      handleConceptActivation(conceptId);
    },
    [handleConceptActivation]
  );

  const handleDotHoverStart = useCallback((conceptId: string) => {
    hoveredConceptIdRef.current = conceptId;
    setHoveredConceptId(conceptId);
  }, []);

  const handleDotHoverEnd = useCallback((conceptId: string) => {
    setHoveredConceptId((current) => {
      const nextHoverId = current === conceptId ? null : current;
      hoveredConceptIdRef.current = nextHoverId;
      return nextHoverId;
    });
  }, []);

  const updateDraggedConceptPosition = useCallback(
    (session: ConceptDragSession, pointerViewport: DragViewportPoint) => {
      const sigma = sigmaRef.current;
      if (!sigma || !sigma.getGraph().hasNode(session.conceptId)) {
        return null;
      }

      const targetCenterViewport = {
        x: pointerViewport.x - session.grabOffsetViewport.x,
        y: pointerViewport.y - session.grabOffsetViewport.y,
      };
      const snapResult = resolveConceptSoftSnap({
        activeConceptId: session.conceptId,
        center: targetCenterViewport,
        candidates: Array.from(
          conceptViewportPositionsRef.current.entries(),
          ([conceptId, position]) => ({
            conceptId,
            x: position.x,
            y: position.y,
            isOutside: position.isOutside,
          })
        ),
      });
      const nextGraphPosition = sigma.viewportToGraph(snapResult.center);
      if (
        !Number.isFinite(nextGraphPosition.x) ||
        !Number.isFinite(nextGraphPosition.y)
      ) {
        return null;
      }

      sigma.getGraph().setNodeAttribute(session.conceptId, "x", nextGraphPosition.x);
      sigma.getGraph().setNodeAttribute(session.conceptId, "y", nextGraphPosition.y);
      syncLocalConceptPosition(session.conceptId, nextGraphPosition);
      refreshDraggedConceptScene(session.conceptId);
      syncConceptPresentation();

      session.currentPointerViewport = pointerViewport;
      session.currentGraphPosition = nextGraphPosition;
      setDragState({
        phase: "dragging",
        conceptId: session.conceptId,
        pointerType: session.pointerType,
        startGraphPosition: session.startGraphPosition,
        currentGraphPosition: nextGraphPosition,
        pointerViewportPosition: pointerViewport,
        snap: snapResult.snap,
        pendingLongPress: false,
        retryCount: 0,
        errorMessage: null,
      });

      return nextGraphPosition;
    },
    [
      refreshDraggedConceptScene,
      setDragState,
      syncLocalConceptPosition,
      syncConceptPresentation,
    ]
  );

  const scheduleAutoPan = useCallback(() => {
    if (autoPanFrameRef.current !== null) {
      return;
    }

    autoPanFrameRef.current = window.requestAnimationFrame(() => {
      autoPanFrameRef.current = null;

      const session = dragSessionRef.current;
      const sigma = sigmaRef.current;
      const container = containerRef.current;
      const interactionLayer = cardsLayerRef.current;
      if (!session || !session.isDragging || !sigma || !container || !interactionLayer) {
        return;
      }

      const bounds = interactionLayer.getBoundingClientRect();
      const intent = deriveEdgeAutoPanIntent({
        pointer: session.currentPointerViewport,
        width: bounds.width,
        height: bounds.height,
        hotZonePx: EDGE_AUTO_PAN_HOT_ZONE_PX,
      });

      if (!intent.isActive) {
        session.autoPanIntentStartedAt = null;
        clearAutoPanDelayTimer();
        return;
      }

      const camera = sigma.getCamera();
      const cameraState = camera.getState();
      const stepX = intent.x * (0.0025 + Math.abs(intent.x) * 0.005);
      const stepY = intent.y * (0.0025 + Math.abs(intent.y) * 0.005);

      camera.setState({
        ...cameraState,
        x: cameraState.x + stepX,
        y: cameraState.y + stepY,
      });

      updateDraggedConceptPosition(session, session.currentPointerViewport);
      scheduleAutoPanRef.current();
    });
  }, [clearAutoPanDelayTimer, updateDraggedConceptPosition]);

  useEffect(() => {
    scheduleAutoPanRef.current = scheduleAutoPan;
  }, [scheduleAutoPan]);

  const startConceptDrag = useCallback(
    (session: ConceptDragSession) => {
      const sigma = sigmaRef.current;
      if (!sigma || session.isDragging) {
        return;
      }

      session.isDragging = true;
      session.pendingLongPress = false;
      clearPositionRetryTimer();
      clearAutoPanDelayTimer();

      const inspectorIsAlreadyOpen = selection.kind !== "none";
      const isActiveConceptSelection =
        selection.kind === "concept" && selection.id === session.conceptId;

      if (inspectorIsAlreadyOpen && !isActiveConceptSelection) {
        onOpenConceptInspectorRef.current(session.conceptId);
      }

      sigma.getMouseCaptor().enabled = false;
      sigma.getTouchCaptor().enabled = false;

      const nextPersistenceState = reducePositionPersistenceState(
        INITIAL_POSITION_PERSISTENCE_STATE,
        { type: "dragging" }
      );

      setDragState({
        phase: nextPersistenceState.phase,
        conceptId: session.conceptId,
        pointerType: session.pointerType,
        startGraphPosition: session.startGraphPosition,
        currentGraphPosition: session.startGraphPosition,
        pointerViewportPosition: session.currentPointerViewport,
        snap: IDLE_DRAG_STATE.snap,
        pendingLongPress: false,
        retryCount: nextPersistenceState.retryCount,
        errorMessage: nextPersistenceState.errorMessage,
      });

      updateDraggedConceptPosition(session, session.currentPointerViewport);
    },
    [
      clearPositionRetryTimer,
      clearAutoPanDelayTimer,
      selection,
      setDragState,
      updateDraggedConceptPosition,
    ]
  );

  const completeConceptDrag = useCallback(
    (session: ConceptDragSession) => {
      const sigma = sigmaRef.current;
      clearAutoPanDelayTimer();
      stopAutoPan();
      session.autoPanIntentStartedAt = null;
      dragSessionRef.current = null;
      unlockLocalEntity(session.conceptId);

      if (sigma) {
        sigma.getMouseCaptor().enabled = true;
        sigma.getTouchCaptor().enabled = true;
      }

      if (session.isDragging && sigma) {
        const currentGraphPosition = {
          x: Number(sigma.getGraph().getNodeAttribute(session.conceptId, "x")),
          y: Number(sigma.getGraph().getNodeAttribute(session.conceptId, "y")),
        };
        const hasMoved =
          Math.hypot(
            currentGraphPosition.x - session.startGraphPosition.x,
            currentGraphPosition.y - session.startGraphPosition.y
          ) > 0.01;

        if (hasMoved) {
          const persistedGraphPosition = {
            x: Math.round(currentGraphPosition.x),
            y: Math.round(currentGraphPosition.y),
          };

          sigma
            .getGraph()
            .setNodeAttribute(session.conceptId, "x", persistedGraphPosition.x);
          sigma
            .getGraph()
            .setNodeAttribute(session.conceptId, "y", persistedGraphPosition.y);
          syncLocalConceptPosition(session.conceptId, persistedGraphPosition);
          refreshDraggedConceptScene(session.conceptId);
          syncConceptPresentation();

          suppressClickForConceptIdRef.current = session.conceptId;
          void persistConceptPosition(
            session.conceptId,
            persistedGraphPosition.x,
            persistedGraphPosition.y,
            {
              requestId: session.positionRequestId,
            }
          );
          return;
        }
      }

      resetDragState();
    },
    [
      clearAutoPanDelayTimer,
      persistConceptPosition,
      refreshDraggedConceptScene,
      resetDragState,
      syncLocalConceptPosition,
      syncConceptPresentation,
      stopAutoPan,
      unlockLocalEntity,
    ]
  );

  const prepareConceptDragSession = useCallback(
    (conceptId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canEditGraph) {
        return;
      }

      const pointerType = deriveGesturePointerType(event.nativeEvent);

      if (interactionModeRef.current !== "inspect" || isZoomedOutRef.current) {
        return;
      }

      if ((pointerType === "mouse" || pointerType === "pen") && event.button !== 0) {
        return;
      }

      if (pointerType !== "touch") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const sigma = sigmaRef.current;
      if (!sigma || !sigma.getGraph().hasNode(conceptId)) {
        return;
      }

      teardownTouchDragRef.current?.();
      clearPositionRetryTimer();
      clearAutoPanDelayTimer();
      stopAutoPan();
      const positionRequestId = createPositionMutationRequestId();

      const startPointerViewport = toViewportPoint(event.clientX, event.clientY);
      if (!startPointerViewport) {
        return;
      }

      const startGraphPosition = {
        x: Number(sigma.getGraph().getNodeAttribute(conceptId, "x")),
        y: Number(sigma.getGraph().getNodeAttribute(conceptId, "y")),
      };
      const startConceptViewport = sigma.graphToViewport(startGraphPosition);
      const session: ConceptDragSession = {
        conceptId,
        positionRequestId,
        pointerType,
        pressedAt: Date.now(),
        startPointerViewport,
        currentPointerViewport: startPointerViewport,
        startGraphPosition,
        currentGraphPosition: startGraphPosition,
        grabOffsetViewport: {
          x: startPointerViewport.x - startConceptViewport.x,
          y: startPointerViewport.y - startConceptViewport.y,
        },
        autoPanIntentStartedAt: null,
        pendingLongPress: pointerType === "touch",
        isDragging: false,
      };

      dragSessionRef.current = session;
      lockLocalEntity(conceptId, {
        entityType: "concept",
        reason: "dragging",
      });
      sigma.getMouseCaptor().enabled = false;
      sigma.getTouchCaptor().enabled = false;
      setDragState({
        phase: "press",
        conceptId,
        pointerType,
        startGraphPosition,
        currentGraphPosition: startGraphPosition,
        pointerViewportPosition: startPointerViewport,
        snap: IDLE_DRAG_STATE.snap,
        pendingLongPress: session.pendingLongPress,
        retryCount: 0,
        errorMessage: null,
      });

      if (pointerType !== "touch") {
        event.preventDefault();
        return;
      }

      const pointerId = event.pointerId;
      const handleTouchPointerMove = (moveEvent: PointerEvent) => {
        const activeSession = dragSessionRef.current;
        if (
          moveEvent.pointerId !== pointerId ||
          !activeSession ||
          activeSession !== session
        ) {
          return;
        }

        const nextPointerViewport = toViewportPoint(
          moveEvent.clientX,
          moveEvent.clientY
        );
        if (!nextPointerViewport) {
          return;
        }

        activeSession.currentPointerViewport = nextPointerViewport;
        const distance = getPointerTravelDistance(
          activeSession.startPointerViewport,
          nextPointerViewport
        );
        const heldForMs = Date.now() - activeSession.pressedAt;

        if (!activeSession.isDragging) {
          if (heldForMs < TOUCH_LONG_PRESS_MS) {
            if (shouldCancelTouchLongPress(distance)) {
              teardownTouchDragRef.current?.();
              dragSessionRef.current = null;
              unlockLocalEntity(session.conceptId);
              sigma.getMouseCaptor().enabled = true;
              sigma.getTouchCaptor().enabled = true;
              resetDragState();
              return;
            }

            setDragState({
              ...dragStateRef.current,
              pointerViewportPosition: nextPointerViewport,
            });
            return;
          }

          startConceptDrag(activeSession);
        }

        moveEvent.preventDefault();
        updateDraggedConceptPosition(activeSession, nextPointerViewport);
      };

      const handleTouchPointerEnd = (endEvent: PointerEvent) => {
        const activeSession = dragSessionRef.current;
        if (
          endEvent.pointerId !== pointerId ||
          !activeSession ||
          activeSession !== session
        ) {
          return;
        }

        teardownTouchDragRef.current?.();
        completeConceptDrag(activeSession);
      };

      const cleanupTouchDrag = () => {
        window.removeEventListener("pointermove", handleTouchPointerMove);
        window.removeEventListener("pointerup", handleTouchPointerEnd);
        window.removeEventListener("pointercancel", handleTouchPointerEnd);
        teardownTouchDragRef.current = null;
      };

      teardownTouchDragRef.current = cleanupTouchDrag;
      window.addEventListener("pointermove", handleTouchPointerMove);
      window.addEventListener("pointerup", handleTouchPointerEnd);
      window.addEventListener("pointercancel", handleTouchPointerEnd);
    },
    [
      clearPositionRetryTimer,
      clearAutoPanDelayTimer,
      canEditGraph,
      completeConceptDrag,
      createPositionMutationRequestId,
      lockLocalEntity,
      resetDragState,
      setDragState,
      startConceptDrag,
      stopAutoPan,
      toViewportPoint,
      unlockLocalEntity,
      updateDraggedConceptPosition,
    ]
  );

  const bindConceptDrag = useDrag(
    ({ args, last, xy }) => {
      const [conceptId] = args as [string];
      const session = dragSessionRef.current;
      if (!session || session.conceptId !== conceptId) {
        return;
      }

      if (session.pointerType === "touch") {
        return;
      }

      const pointerViewport = toViewportPoint(xy[0], xy[1]);
      if (!pointerViewport) {
        return;
      }

      session.currentPointerViewport = pointerViewport;

      if (!session.isDragging) {
        const distance = getPointerTravelDistance(
          session.startPointerViewport,
          pointerViewport
        );

        if (shouldStartPointerDrag(session.pointerType, distance)) {
          startConceptDrag(session);
        } else {
          if (last) {
            completeConceptDrag(session);
          }
          return;
        }
      }

      if (session.isDragging) {
        updateDraggedConceptPosition(session, pointerViewport);

        const bounds =
          cardsLayerRef.current?.getBoundingClientRect() ??
          containerRef.current?.getBoundingClientRect();

        if (bounds) {
          const intent = deriveEdgeAutoPanIntent({
            pointer: pointerViewport,
            width: bounds.width,
            height: bounds.height,
            hotZonePx: EDGE_AUTO_PAN_HOT_ZONE_PX,
          });

          if (intent.isActive) {
            const now = Date.now();
            if (session.autoPanIntentStartedAt === null) {
              session.autoPanIntentStartedAt = now;
              clearAutoPanDelayTimer();
              autoPanDelayTimerRef.current = setTimeout(() => {
                autoPanDelayTimerRef.current = null;

                const activeSession = dragSessionRef.current;
                if (!activeSession || activeSession !== session || !activeSession.isDragging) {
                  return;
                }

                const activeBounds =
                  cardsLayerRef.current?.getBoundingClientRect() ??
                  containerRef.current?.getBoundingClientRect();
                if (!activeBounds) {
                  activeSession.autoPanIntentStartedAt = null;
                  return;
                }

                const activeIntent = deriveEdgeAutoPanIntent({
                  pointer: activeSession.currentPointerViewport,
                  width: activeBounds.width,
                  height: activeBounds.height,
                  hotZonePx: EDGE_AUTO_PAN_HOT_ZONE_PX,
                });

                if (activeIntent.isActive) {
                  scheduleAutoPan();
                } else {
                  activeSession.autoPanIntentStartedAt = null;
                }
              }, EDGE_AUTO_PAN_START_DELAY_MS);
            }

            if (now - session.autoPanIntentStartedAt >= EDGE_AUTO_PAN_START_DELAY_MS) {
              scheduleAutoPan();
            }
          } else {
            session.autoPanIntentStartedAt = null;
            clearAutoPanDelayTimer();
            stopAutoPan();
          }
        }
      }

      if (last) {
        completeConceptDrag(session);
      }
    },
    {
      enabled: canEditGraph && interactionMode === "inspect" && !isZoomedOut,
      filterTaps: true,
      pointer: {
        buttons: 1,
        capture: false,
        keys: false,
      },
      threshold: 0,
      triggerAllEvents: true,
    }
  );

  const forwardWheelToSigma = useCallback(
    (event: ReactWheelEvent<HTMLElement>) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const mouseLayer = container.querySelector(".sigma-mouse");
      const targetElement =
        mouseLayer instanceof HTMLElement ? mouseLayer : container;

      const forwardedEvent = new WheelEvent("wheel", {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaZ: event.deltaZ,
        deltaMode: event.deltaMode,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        bubbles: true,
        cancelable: true,
      });

      targetElement.dispatchEvent(forwardedEvent);
    },
    []
  );

  // --- Sigma Foundation Initializer ---
  useEffect(() => {
    if (!containerRef.current) return;

    const initialSnapshot = snapshotRef.current ?? EMPTY_GRAPH_SNAPSHOT;
    const graph = buildGraphologyInstance(initialSnapshot);

    const sigma = createSigmaInstance({
      container: containerRef.current,
      graph,
    });
    sigmaRef.current = sigma;
    ensureStableSigmaBBox(sigma, initialSnapshot);
    lastHydratedSnapshotRef.current = initialSnapshot;

    const camera = sigma.getCamera();
    const baseRatio = camera.getState().ratio;
    const { minRatio, maxRatio } = deriveZoomBounds(baseRatio);
    applySigmaZoomBounds(sigma, { minRatio, maxRatio });
    const { dotEnterRatio, dotExitRatio } = deriveLodThresholds(minRatio, maxRatio);
    zoomPolicyRef.current = {
      minRatio,
      maxRatio,
      dotEnterRatio,
      dotExitRatio,
    };

    const boundedBaseRatio = camera.getBoundedRatio(baseRatio);
    if (Math.abs(baseRatio - boundedBaseRatio) > 0.0001) {
      camera.setState({ ratio: boundedBaseRatio });
    }

    if (typeof window !== "undefined") {
      window.__SIGMA__ = sigma;
    }

    sigma.on("clickNode", (e) => {
      handleConceptActivation(e.node);
    });

    sigma.on("clickEdge", (e) => {
      onOpenLinkInspectorRef.current(e.edge);
    });

    sigma.on("clickStage", (e) => {
      const mode = interactionModeRef.current;
      if (mode === "placeConcept" && canEditGraph) {
        const graphCoords = sigma.viewportToGraph({ x: e.event.x, y: e.event.y });
        onOpenCreateConceptRef.current(
          Math.round(graphCoords.x),
          Math.round(graphCoords.y)
        );
        return;
      }
      onClearSelectionRef.current();
    });

    const handleCameraUpdated = () => {
      const ratio = sigma.getCamera().getState().ratio;
      updateZoomMode(ratio);
      syncConceptPresentation();
    };

    const observedContainer = containerRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && observedContainer
        ? new ResizeObserver(() => {
            syncConceptPresentation();
          })
        : null;

    if (resizeObserver && observedContainer) {
      resizeObserver.observe(observedContainer);
    }

    sigma.on("afterRender", syncConceptPresentation);
    sigma.getCamera().on("updated", handleCameraUpdated);
    handleCameraUpdated();

    return () => {
      zoomPolicyRef.current = null;
      resizeObserver?.disconnect();
      if (typeof window !== "undefined" && window.__SIGMA__ === sigma) {
        delete window.__SIGMA__;
      }
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [
    ensureStableSigmaBBox,
    handleConceptActivation,
    canEditGraph,
    syncConceptPresentation,
    updateZoomMode,
  ]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const snapshotChanged = lastHydratedSnapshotRef.current !== snapshot;
    if (!snapshotChanged) {
      return;
    }

    if (
      dragState.phase === "press" ||
      dragState.phase === "dragging" ||
      dragState.phase === "saving"
    ) {
      return;
    }

    const sigma = sigmaRef.current;
    if (!sigma) {
      return;
    }

    const camera = sigma.getCamera();
    const previousCameraState = camera.getState();
    const nextGraph = buildGraphologyInstance(snapshot, positionsRef.current);
    sigma.setGraph(nextGraph);
    ensureStableSigmaBBox(sigma, snapshot, positionsRef.current);
    lastHydratedSnapshotRef.current = snapshot;

    const boundedRatio = camera.getBoundedRatio(previousCameraState.ratio);
    camera.setState({
      x: previousCameraState.x,
      y: previousCameraState.y,
      angle: previousCameraState.angle,
      ratio: boundedRatio,
    });

    updateZoomMode(boundedRatio);
    syncConceptPresentation();
  }, [
    dragState.phase,
    ensureStableSigmaBBox,
    snapshot,
    syncConceptPresentation,
    updateZoomMode,
  ]);

  useEffect(() => {
    if (!snapshot || !cardsLayerRef.current) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      syncConceptPresentation();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [snapshot, syncConceptPresentation]);

  useLayoutEffect(() => {
    if (!snapshot) {
      return;
    }
    syncConceptPresentation();
  }, [
    snapshot,
    selection,
    interactionMode,
    connectLinkSourceId,
    isZoomedOut,
    hoveredConceptId,
    syncConceptPresentation,
  ]);

  const runtimeStatusMessage =
    mutationStatusMessage
      ? mutationStatusMessage
      : snapshotError
      ? snapshotError
      : isSnapshotLoading && !snapshot
      ? messages.canvas.loadingSnapshot
      : dragState.phase === "saving"
        ? messages.canvas.updatingPosition
        : dragState.phase === "error"
          ? dragState.errorMessage ?? messages.canvas.positionSaveFailed
          : isZoomedOut && interactionMode === "inspect"
            ? messages.canvas.zoomInToMoveConcepts
        : null;

  const hoveredConcept =
    isZoomedOut && hoveredConceptId
      ? snapshot?.concepts.find((concept) => concept.id === hoveredConceptId) ?? null
      : null;

  return (
    <div
      className="canvas-card"
      data-readability-mode={isZoomedOut ? "dots" : "cards"}
      data-selection-kind={selection.kind}
      data-drag-phase={dragState.phase}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {graphMetrics.conceptCount === 0 && interactionMode === "inspect" ? (
        <div className="canvas-empty-overlay" style={{ zIndex: 10 }}>
          <Text size="2" color="gray">
            {messages.canvas.emptyOverlay}
          </Text>
        </div>
      ) : null}

      {snapshotError && !snapshot ? (
        <div className="canvas-empty-overlay is-error" style={{ zIndex: 10 }}>
          <Text size="2" color="red">
            {snapshotError}
          </Text>
        </div>
      ) : null}

      {runtimeStatusMessage && (
        <div
          className={
            mutationStatusMessage
              ? "canvas-runtime-status is-success"
              : snapshotError || dragState.phase === "error"
                ? "canvas-runtime-status is-error"
                : "canvas-runtime-status"
          }
          role="status"
          aria-live="polite"
        >
          <Text
            size="1"
            color={
              mutationStatusMessage
                ? "green"
                : snapshotError || dragState.phase === "error"
                  ? "red"
                  : "gray"
            }
          >
            {runtimeStatusMessage}
          </Text>
        </div>
      )}

      <div
        ref={containerRef}
        className="sigma-canvas map-canvas"
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
      />

      <div
        ref={cardsLayerRef}
        className="sl-concept-card-layer"
        aria-hidden={!snapshot}
        data-visibility-mode={isZoomedOut ? "hidden" : "visible"}
        onWheelCapture={forwardWheelToSigma}
      >
        {dragState.phase === "dragging" &&
        (dragState.snap.x || dragState.snap.y) ? (
          <div className="sl-concept-drag-guides" aria-hidden="true">
            {dragState.snap.x ? (
              <div
                className="sl-concept-drag-guide is-vertical"
                style={{ left: `${dragState.snap.x.guideViewport}px` }}
              />
            ) : null}
            {dragState.snap.y ? (
              <div
                className="sl-concept-drag-guide is-horizontal"
                style={{ top: `${dragState.snap.y.guideViewport}px` }}
              />
            ) : null}
          </div>
        ) : null}
        {snapshot?.concepts.map((concept) => {
          const conceptTypeLabel = messages.labels.conceptTypes[concept.conceptType];
          const isSelectedConcept = selection.kind === "concept" && selection.id === concept.id;
          const isConnectionSource =
            interactionMode === "connectLink" && connectLinkSourceId === concept.id;
          const isMutationFeedbackTarget = feedbackConceptId === concept.id;
          const isDraggingConcept =
            dragState.phase === "dragging" && dragState.conceptId === concept.id;

          const cardClassName = [
            "sl-concept-card",
            isSelectedConcept ? "is-selected" : "",
            isConnectionSource ? "is-connection-source" : "",
            isMutationFeedbackTarget ? "is-feedback-highlight" : "",
            isDraggingConcept ? "is-dragging" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const dragBindProps = bindConceptDrag(concept.id);
          const dragPointerDown =
            "onPointerDown" in dragBindProps &&
            typeof dragBindProps.onPointerDown === "function"
              ? dragBindProps.onPointerDown
              : null;

          return (
            <button
              key={concept.id}
              type="button"
              ref={(element) => registerConceptCardRef(concept.id, element)}
              className={cardClassName}
              {...dragBindProps}
              onClick={() => handleConceptCardClick(concept.id)}
              onPointerDown={(event) => {
                prepareConceptDragSession(concept.id, event);
                dragPointerDown?.(event);
              }}
              aria-label={`${concept.title}, ${conceptTypeLabel}`}
              aria-grabbed={isDraggingConcept}
              data-selected={isSelectedConcept ? "true" : "false"}
              data-connection-source={isConnectionSource ? "true" : "false"}
              data-dragging={isDraggingConcept ? "true" : "false"}
            >
              <Text as="span" size="2" weight="medium" className="sl-concept-card-title">
                {concept.title}
              </Text>
              <Text as="span" size="1" color="gray" className="sl-concept-card-summary">
                {getShortSummary(concept)}
              </Text>
              <Badge
                color="gray"
                variant="soft"
                radius="full"
                className="sl-concept-card-type"
              >
                {conceptTypeLabel}
              </Badge>
            </button>
          );
        })}
      </div>

      <div
        className="sl-concept-dot-layer"
        aria-hidden={!snapshot || !isZoomedOut}
        data-visibility-mode={isZoomedOut ? "visible" : "hidden"}
        onWheelCapture={forwardWheelToSigma}
      >
        {snapshot?.concepts.map((concept) => {
          const isSelectedConcept = selection.kind === "concept" && selection.id === concept.id;
          const isConnectionSource =
            interactionMode === "connectLink" && connectLinkSourceId === concept.id;
          const isMutationFeedbackTarget = feedbackConceptId === concept.id;
          const dotClassName = [
            "sl-concept-dot",
            isSelectedConcept ? "is-selected" : "",
            isConnectionSource ? "is-connection-source" : "",
            isMutationFeedbackTarget ? "is-feedback-highlight" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={concept.id}
              type="button"
              ref={(element) => registerConceptDotRef(concept.id, element)}
              className={dotClassName}
              aria-label={concept.title}
              onClick={() => handleConceptCardClick(concept.id)}
              onPointerEnter={() => handleDotHoverStart(concept.id)}
              onPointerLeave={() => handleDotHoverEnd(concept.id)}
              onFocus={() => handleDotHoverStart(concept.id)}
              onBlur={() => handleDotHoverEnd(concept.id)}
              data-selected={isSelectedConcept ? "true" : "false"}
              data-connection-source={isConnectionSource ? "true" : "false"}
            />
          );
        })}
      </div>

      <div className="sl-concept-hover-card-layer" aria-hidden={!hoveredConcept}>
        {hoveredConcept ? (
          <div ref={hoverCardRef} className="sl-concept-card is-hover-preview">
            <Text as="span" size="2" weight="medium" className="sl-concept-card-title">
              {hoveredConcept.title}
            </Text>
            <Text as="span" size="1" color="gray" className="sl-concept-card-summary">
              {getShortSummary(hoveredConcept)}
            </Text>
            <Badge color="gray" variant="soft" radius="full" className="sl-concept-card-type">
              {messages.labels.conceptTypes[hoveredConcept.conceptType]}
            </Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
