"use client";

import {
  useLayoutEffect,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  GraphViewport,
} from "@/features/map-runtime/types";
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
  deriveGraphViewportFromSigma,
  type GraphViewportBounds,
} from "../renderers/viewport-sync";
import type { Sigma } from "sigma";

const POSITION_FLUSH_DEBOUNCE_MS = 750;
const MUTATION_FEEDBACK_DURATION_MS = 2400;
const VIEWPORT_SYNC_INTERVAL_MS = 240;
const VIEWPORT_FETCH_IDLE_MS = 180;

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

declare global {
  interface Window {
    __SIGMA__?: Sigma;
  }
}

type GraphCanvasRuntimeProps = {
  locale: SupportedLocale;
  map: MapDetail;
  graphMetrics: GraphMetrics;
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
  const teardownCardDragRef = useRef<(() => void) | null>(null);
  const conceptViewportPositionsRef = useRef<Map<string, ViewportNodePosition>>(new Map());
  const zoomPolicyRef = useRef<Omit<CanvasZoomState, "ratio"> | null>(null);

  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const isZoomedOutRef = useRef(isZoomedOut);
  const [hoveredConceptId, setHoveredConceptId] = useState<string | null>(null);
  const hoveredConceptIdRef = useRef<string | null>(hoveredConceptId);

  // Zustand State
  const snapshot = useMapStore((s) => s.snapshot);
  const setSnapshot = useMapStore((s) => s.setSnapshot);
  const viewport = useMapStore((s) => s.viewport);
  const updateViewport = useMapStore((s) => s.updateViewport);
  const updateConceptPosition = useMapStore((s) => s.updateConceptPosition);
  const snapshotRef = useRef(snapshot);
  const viewportRef = useRef(viewport);
  const pendingViewportSyncRef = useRef<GraphViewportBounds | null>(null);
  const viewportSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRequestControllerRef = useRef<AbortController | null>(null);
  const snapshotRequestIdRef = useRef(0);
  const lastViewportSyncAtRef = useRef(0);
  const feedbackMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackConceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackEdgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreEdgeStyleRef = useRef<(() => void) | null>(null);
  const appliedFeedbackEventIdRef = useRef<string | null>(null);
  const [activeMutationFeedback, setActiveMutationFeedback] =
    useState<InspectorMutationFeedback | null>(null);
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
    hoveredConceptIdRef.current = hoveredConceptId;
  }, [hoveredConceptId]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    isZoomedOutRef.current = isZoomedOut;
  }, [isZoomedOut]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (!isZoomedOut) {
      hoveredConceptIdRef.current = null;
      setHoveredConceptId(null);
    }
  }, [isZoomedOut]);

  useEffect(() => {
    return () => {
      if (viewportSyncTimerRef.current !== null) {
        clearTimeout(viewportSyncTimerRef.current);
      }
      if (viewportFetchTimerRef.current !== null) {
        clearTimeout(viewportFetchTimerRef.current);
      }
      snapshotRequestControllerRef.current?.abort();
      if (feedbackMessageTimerRef.current !== null) {
        clearTimeout(feedbackMessageTimerRef.current);
      }
      if (feedbackConceptTimerRef.current !== null) {
        clearTimeout(feedbackConceptTimerRef.current);
      }
      if (feedbackEdgeTimerRef.current !== null) {
        clearTimeout(feedbackEdgeTimerRef.current);
      }
      restoreEdgeStyleRef.current?.();
      viewportSyncTimerRef.current = null;
      feedbackMessageTimerRef.current = null;
      feedbackConceptTimerRef.current = null;
      feedbackEdgeTimerRef.current = null;
      restoreEdgeStyleRef.current = null;
      pendingViewportSyncRef.current = null;
      viewportFetchTimerRef.current = null;
      snapshotRequestControllerRef.current = null;
    };
  }, []);

  // Local fetch states
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isSavingPosition, setIsSavingPosition] = useState(false);

  const fetchSnapshotForViewport = useCallback(
    async (targetViewport: GraphViewport) => {
      const requestId = snapshotRequestIdRef.current + 1;
      snapshotRequestIdRef.current = requestId;

      snapshotRequestControllerRef.current?.abort();
      const controller = new AbortController();
      snapshotRequestControllerRef.current = controller;

      setIsSnapshotLoading(true);
      setSnapshotError(null);

      try {
        const searchParams = new URLSearchParams({
          x: String(targetViewport.x),
          y: String(targetViewport.y),
          width: String(targetViewport.width),
          height: String(targetViewport.height),
          overscan: String(targetViewport.overscan),
        });

        const response = await fetch(
          `/api/maps/${map.id}/graph?${searchParams.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load graph snapshot.");
        }

        const nextSnapshot = (await response.json()) as GraphSnapshot;
        if (controller.signal.aborted || requestId !== snapshotRequestIdRef.current) {
          return;
        }

        setSnapshot(nextSnapshot);
      } catch (fetchError) {
        if (controller.signal.aborted || requestId !== snapshotRequestIdRef.current) {
          return;
        }

        setSnapshotError(
          fetchError instanceof Error ? fetchError.message : "Unable to load graph snapshot."
        );
      } finally {
        if (requestId === snapshotRequestIdRef.current) {
          setIsSnapshotLoading(false);
        }
      }
    },
    [map.id, setSnapshot]
  );

  const scheduleViewportSnapshotFetch = useCallback(
    (targetViewport: GraphViewport, options?: { immediate?: boolean }) => {
      if (viewportFetchTimerRef.current !== null) {
        clearTimeout(viewportFetchTimerRef.current);
        viewportFetchTimerRef.current = null;
      }

      if (options?.immediate) {
        void fetchSnapshotForViewport(targetViewport);
        return;
      }

      viewportFetchTimerRef.current = setTimeout(() => {
        viewportFetchTimerRef.current = null;
        void fetchSnapshotForViewport(targetViewport);
      }, VIEWPORT_FETCH_IDLE_MS);
    },
    [fetchSnapshotForViewport]
  );

  // --- Network Fetching ---
  useEffect(() => {
    const shouldLoadImmediately = snapshotRef.current === null;
    scheduleViewportSnapshotFetch(viewport, { immediate: shouldLoadImmediately });
  }, [scheduleViewportSnapshotFetch, viewport]);

  // --- Map Coordinates Save Logic ---
  const sendPositionsBatch = useCallback(
    async (updates: { conceptId: string; x: number; y: number }[]) => {
      const payload = JSON.stringify({ positions: updates });
      await fetch(`/api/maps/${map.id}/concepts/positions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    },
    [map.id]
  );

  const saveNodePosition = useCallback(
    (conceptId: string, x: number, y: number) => {
      setIsSavingPosition(true);

      updateConceptPosition(conceptId, { x, y });

      setTimeout(() => {
        sendPositionsBatch([{ conceptId, x, y }])
          .catch((err) => console.error("Failed to save position", err))
          .finally(() => setIsSavingPosition(false));
      }, POSITION_FLUSH_DEBOUNCE_MS);
    },
    [sendPositionsBatch, updateConceptPosition]
  );

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
        setIsZoomedOut(nextZoomedOut);
      }
    },
    [onZoomStateChange]
  );

  const syncViewportWithCamera = useCallback(
    (options?: { immediate?: boolean }) => {
      const sigma = sigmaRef.current;
      const container = containerRef.current;
      if (!sigma || !container) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const projectedViewport = deriveGraphViewportFromSigma(sigma, {
        width: containerRect.width,
        height: containerRect.height,
      });

      if (!projectedViewport) {
        return;
      }

      const commitViewport = (nextViewport: GraphViewportBounds) => {
        const currentViewport = viewportRef.current;
        const isUnchanged =
          currentViewport.x === nextViewport.x &&
          currentViewport.y === nextViewport.y &&
          currentViewport.width === nextViewport.width &&
          currentViewport.height === nextViewport.height;

        if (isUnchanged) {
          return;
        }

        viewportRef.current = { ...currentViewport, ...nextViewport };
        updateViewport(nextViewport);
      };

      if (options?.immediate) {
        pendingViewportSyncRef.current = null;
        if (viewportSyncTimerRef.current !== null) {
          clearTimeout(viewportSyncTimerRef.current);
          viewportSyncTimerRef.current = null;
        }

        lastViewportSyncAtRef.current = Date.now();
        commitViewport(projectedViewport);
        return;
      }

      pendingViewportSyncRef.current = projectedViewport;
      const now = Date.now();
      const elapsed = now - lastViewportSyncAtRef.current;

      if (elapsed >= VIEWPORT_SYNC_INTERVAL_MS) {
        pendingViewportSyncRef.current = null;
        lastViewportSyncAtRef.current = now;
        commitViewport(projectedViewport);
        return;
      }

      if (viewportSyncTimerRef.current !== null) {
        return;
      }

      viewportSyncTimerRef.current = setTimeout(() => {
        viewportSyncTimerRef.current = null;
        const pendingViewport = pendingViewportSyncRef.current;
        pendingViewportSyncRef.current = null;

        if (!pendingViewport) {
          return;
        }

        lastViewportSyncAtRef.current = Date.now();
        commitViewport(pendingViewport);
      }, VIEWPORT_SYNC_INTERVAL_MS - elapsed);
    },
    [updateViewport]
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

    setActiveMutationFeedback(mutationFeedback);
    setMutationStatusMessage(mutationFeedback.message);

    if (feedbackMessageTimerRef.current !== null) {
      clearTimeout(feedbackMessageTimerRef.current);
    }

    feedbackMessageTimerRef.current = setTimeout(() => {
      setMutationStatusMessage(null);
      feedbackMessageTimerRef.current = null;
    }, MUTATION_FEEDBACK_DURATION_MS);

    void fetchSnapshotForViewport(viewportRef.current);
  }, [fetchSnapshotForViewport, mutationFeedback]);

  useEffect(() => {
    if (!activeMutationFeedback) {
      return;
    }

    if (appliedFeedbackEventIdRef.current === activeMutationFeedback.eventId) {
      return;
    }

    const applied = applyMutationFeedback(activeMutationFeedback);
    if (!applied) {
      return;
    }

    appliedFeedbackEventIdRef.current = activeMutationFeedback.eventId;
    setActiveMutationFeedback(null);
  }, [activeMutationFeedback, applyMutationFeedback]);

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

  const handleConceptCardPointerDown = useCallback(
    (conceptId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        event.button !== 0 ||
        interactionModeRef.current !== "inspect" ||
        isZoomedOutRef.current
      ) {
        return;
      }

      const sigma = sigmaRef.current;
      const container = containerRef.current;
      if (!sigma || !container) {
        return;
      }

      teardownCardDragRef.current?.();
      event.preventDefault();
      event.stopPropagation();

      const pointerId = event.pointerId;
      const cardElement = event.currentTarget;
      cardElement.setPointerCapture(pointerId);
      sigma.getCamera().disable();

      let moved = false;
      const minimumDragDistance = 4;
      const startClientX = event.clientX;
      const startClientY = event.clientY;

      const toViewportPoint = (clientX: number, clientY: number) => {
        const bounds = container.getBoundingClientRect();
        return { x: clientX - bounds.left, y: clientY - bounds.top };
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }

        const deltaX = moveEvent.clientX - startClientX;
        const deltaY = moveEvent.clientY - startClientY;
        if (!moved && Math.hypot(deltaX, deltaY) > minimumDragDistance) {
          moved = true;
        }

        const graphPosition = sigma.viewportToGraph(
          toViewportPoint(moveEvent.clientX, moveEvent.clientY)
        );

        sigma.getGraph().setNodeAttribute(conceptId, "x", graphPosition.x);
        sigma.getGraph().setNodeAttribute(conceptId, "y", graphPosition.y);
        updateConceptPosition(conceptId, { x: graphPosition.x, y: graphPosition.y });
        sigma.refresh();
        syncConceptPresentation();
      };

      const onPointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) {
          return;
        }

        const x = sigma.getGraph().getNodeAttribute(conceptId, "x");
        const y = sigma.getGraph().getNodeAttribute(conceptId, "y");

        if (moved) {
          suppressClickForConceptIdRef.current = conceptId;
          saveNodePosition(conceptId, x, y);
        }

        sigma.getCamera().enable();
        if (cardElement.hasPointerCapture(pointerId)) {
          cardElement.releasePointerCapture(pointerId);
        }

        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerEnd);
        window.removeEventListener("pointercancel", onPointerEnd);
        teardownCardDragRef.current = null;
      };

      teardownCardDragRef.current = cleanup;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);
    },
    [saveNodePosition, syncConceptPresentation, updateConceptPosition]
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

  useEffect(() => {
    return () => {
      teardownCardDragRef.current?.();
    };
  }, []);

  // --- Sigma Foundation Initializer ---
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = buildGraphologyInstance(EMPTY_GRAPH_SNAPSHOT);

    const sigma = createSigmaInstance({
      container: containerRef.current,
      graph,
    });
    sigmaRef.current = sigma;

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
      if (mode === "placeConcept") {
        const graphCoords = sigma.viewportToGraph({ x: e.event.x, y: e.event.y });
        onOpenCreateConceptRef.current(
          Math.round(graphCoords.x),
          Math.round(graphCoords.y)
        );
        return;
      }
      onClearSelectionRef.current();
    });

    let isDragging = false;
    let dragNode: string | null = null;

    sigma.on("downNode", (e) => {
      isDragging = true;
      dragNode = e.node;
      sigma.getCamera().disable();
    });

    sigma.getMouseCaptor().on("mousemovebody", (e) => {
      if (!isDragging || !dragNode) return;

      const pos = sigma.viewportToGraph(e);
      sigma.getGraph().setNodeAttribute(dragNode, "x", pos.x);
      sigma.getGraph().setNodeAttribute(dragNode, "y", pos.y);
      updateConceptPosition(dragNode, { x: pos.x, y: pos.y });
      syncConceptPresentation();
    });

    sigma.getMouseCaptor().on("mouseup", () => {
      if (isDragging && dragNode) {
        const x = sigma.getGraph().getNodeAttribute(dragNode, "x");
        const y = sigma.getGraph().getNodeAttribute(dragNode, "y");
        saveNodePosition(dragNode, x, y);
      }
      isDragging = false;
      dragNode = null;
      sigma.getCamera().enable();
      syncConceptPresentation();
    });

    const handleCameraUpdated = () => {
      syncViewportWithCamera();
      const ratio = sigma.getCamera().getState().ratio;
      updateZoomMode(ratio);
      syncConceptPresentation();
    };

    const observedContainer = containerRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && observedContainer
        ? new ResizeObserver(() => {
            syncViewportWithCamera({ immediate: true });
            syncConceptPresentation();
          })
        : null;

    if (resizeObserver && observedContainer) {
      resizeObserver.observe(observedContainer);
    }

    sigma.on("afterRender", syncConceptPresentation);
    sigma.getCamera().on("updated", handleCameraUpdated);
    syncViewportWithCamera({ immediate: true });
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
    handleConceptActivation,
    saveNodePosition,
    syncConceptPresentation,
    syncViewportWithCamera,
    updateConceptPosition,
    updateZoomMode,
  ]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const sigma = sigmaRef.current;
    if (!sigma) {
      return;
    }

    const camera = sigma.getCamera();
    const previousCameraState = camera.getState();
    const nextGraph = buildGraphologyInstance(snapshot);
    sigma.setGraph(nextGraph);

    const boundedRatio = camera.getBoundedRatio(previousCameraState.ratio);
    camera.setState({
      x: previousCameraState.x,
      y: previousCameraState.y,
      angle: previousCameraState.angle,
      ratio: boundedRatio,
    });

    updateZoomMode(boundedRatio);
    syncConceptPresentation();
  }, [snapshot, syncConceptPresentation, updateZoomMode]);

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
      : isSnapshotLoading && !snapshot
      ? messages.canvas.loadingSnapshot
      : isSavingPosition
        ? messages.canvas.updatingPosition
        : null;

  const hoveredConcept =
    isZoomedOut && hoveredConceptId
      ? snapshot?.concepts.find((concept) => concept.id === hoveredConceptId) ?? null
      : null;

  return (
    <div className="canvas-card" style={{ position: "relative", width: "100%", height: "100%" }}>
      {graphMetrics.conceptCount === 0 && interactionMode === "inspect" ? (
        <div className="canvas-empty-overlay" style={{ zIndex: 10 }}>
          <Text size="2" color="gray">
            {messages.canvas.emptyOverlay}
          </Text>
        </div>
      ) : null}

      {snapshotError ? (
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
              : "canvas-runtime-status"
          }
        >
          <Text size="1" color={mutationStatusMessage ? "green" : "gray"}>
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
        onWheelCapture={forwardWheelToSigma}
      >
        {snapshot?.concepts.map((concept) => {
          const conceptTypeLabel = messages.labels.conceptTypes[concept.conceptType];
          const isSelectedConcept = selection.kind === "concept" && selection.id === concept.id;
          const isConnectionSource =
            interactionMode === "connectLink" && connectLinkSourceId === concept.id;
          const isMutationFeedbackTarget = feedbackConceptId === concept.id;

          const cardClassName = [
            "sl-concept-card",
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
              ref={(element) => registerConceptCardRef(concept.id, element)}
              className={cardClassName}
              onClick={() => handleConceptCardClick(concept.id)}
              onPointerDown={(event) => handleConceptCardPointerDown(concept.id, event)}
              aria-label={`${concept.title}, ${conceptTypeLabel}`}
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
