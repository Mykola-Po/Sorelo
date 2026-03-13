"use client";

import {
  useLayoutEffect,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Badge, Text } from "@radix-ui/themes";
import type { InspectorSelection } from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphMetrics, MapDetail } from "@/features/maps/types";
import type { GraphConceptNode, GraphSnapshot } from "@/features/map-runtime/types";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";

import { useMapStore } from "../store/map-store-provider";
import { buildGraphologyInstance } from "../renderers/graph-builder";
import { createSigmaInstance } from "../renderers/sigma-instance";
import type { Sigma } from "sigma";

const POSITION_FLUSH_DEBOUNCE_MS = 750;
const DOT_MODE_ENTER_RATIO = 1.25;
const DOT_MODE_EXIT_RATIO = 1.14;

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
  onClearSelection: () => void;
  onOpenCreateConcept: (x: number, y: number) => void;
  onOpenConceptInspector: (conceptId: string) => void;
  onOpenLinkInspector: (linkId: string) => void;
  onPickConnectSource: (conceptId: string) => void;
  onCompleteConnectLink: (sourceConceptId: string, targetConceptId: string) => void;
  onZoomRatioChange?: (ratio: number) => void;
};

export function GraphCanvasRuntime({
  locale,
  map,
  graphMetrics,
  selection,
  interactionMode,
  connectLinkSourceId,
  onClearSelection,
  onOpenCreateConcept,
  onOpenConceptInspector,
  onOpenLinkInspector,
  onPickConnectSource,
  onCompleteConnectLink,
  onZoomRatioChange,
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

  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const isZoomedOutRef = useRef(isZoomedOut);
  const [hoveredConceptId, setHoveredConceptId] = useState<string | null>(null);
  const hoveredConceptIdRef = useRef<string | null>(hoveredConceptId);

  // Zustand State
  const snapshot = useMapStore((s) => s.snapshot);
  const setSnapshot = useMapStore((s) => s.setSnapshot);
  const viewport = useMapStore((s) => s.viewport);
  const updateConceptPosition = useMapStore((s) => s.updateConceptPosition);

  // Store refs for stable Sigma closures
  const interactionModeRef = useRef(interactionMode);
  const connectLinkSourceIdRef = useRef(connectLinkSourceId);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    connectLinkSourceIdRef.current = connectLinkSourceId;
  }, [connectLinkSourceId]);

  useEffect(() => {
    hoveredConceptIdRef.current = hoveredConceptId;
  }, [hoveredConceptId]);

  useEffect(() => {
    isZoomedOutRef.current = isZoomedOut;
  }, [isZoomedOut]);

  useEffect(() => {
    if (!isZoomedOut) {
      setHoveredConceptId(null);
    }
  }, [isZoomedOut]);

  // Local fetch states
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isSavingPosition, setIsSavingPosition] = useState(false);

  // --- Network Fetching ---
  useEffect(() => {
    const controller = new AbortController();

    async function loadSnapshot() {
      setIsSnapshotLoading(true);
      setSnapshotError(null);

      try {
        const searchParams = new URLSearchParams({
          x: String(viewport.x),
          y: String(viewport.y),
          width: String(viewport.width),
          height: String(viewport.height),
          overscan: String(viewport.overscan),
        });

        const response = await fetch(`/api/maps/${map.id}/graph?${searchParams.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load graph snapshot.");
        }

        const nextSnapshot = (await response.json()) as GraphSnapshot;
        if (controller.signal.aborted) {
          return;
        }

        setSnapshot(nextSnapshot);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setSnapshotError(
          fetchError instanceof Error ? fetchError.message : "Unable to load graph snapshot."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSnapshotLoading(false);
        }
      }
    }

    void loadSnapshot();

    return () => {
      controller.abort();
    };
  }, [map.id, setSnapshot, viewport]);

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

      onZoomRatioChange?.(ratio);

      const currentlyZoomedOut = isZoomedOutRef.current;
      const nextZoomedOut = currentlyZoomedOut
        ? ratio > DOT_MODE_EXIT_RATIO
        : ratio >= DOT_MODE_ENTER_RATIO;

      if (nextZoomedOut !== currentlyZoomedOut) {
        isZoomedOutRef.current = nextZoomedOut;
        setIsZoomedOut(nextZoomedOut);
      }
    },
    [onZoomRatioChange]
  );

  const syncConceptPresentation = useCallback(() => {
    const sigma = sigmaRef.current;
    const layer = cardsLayerRef.current;
    if (!sigma || !snapshot || !layer) {
      return;
    }

    const graph = sigma.getGraph();
    const layerRect = layer.getBoundingClientRect();
    const zoomedOut = isZoomedOutRef.current;
    const nextViewportMap = new Map<string, ViewportNodePosition>();

    for (const concept of snapshot.concepts) {
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
  }, [snapshot]);

  const handleConceptActivation = useCallback(
    (conceptId: string) => {
      const mode = interactionModeRef.current;
      const sourceId = connectLinkSourceIdRef.current;

      if (mode === "connectLink") {
        if (!sourceId) {
          onPickConnectSource(conceptId);
          return;
        }
        if (sourceId === conceptId) {
          return;
        }
        onCompleteConnectLink(sourceId, conceptId);
        return;
      }

      onOpenConceptInspector(conceptId);
    },
    [onCompleteConnectLink, onOpenConceptInspector, onPickConnectSource]
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
    setHoveredConceptId(conceptId);
  }, []);

  const handleDotHoverEnd = useCallback((conceptId: string) => {
    setHoveredConceptId((current) => (current === conceptId ? null : current));
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

  useEffect(() => {
    return () => {
      teardownCardDragRef.current?.();
    };
  }, []);

  // --- Sigma Foundation Initializer ---
  useEffect(() => {
    if (!containerRef.current || !snapshot) return;

    const graph = buildGraphologyInstance(snapshot);

    const sigma = createSigmaInstance({
      container: containerRef.current,
      graph,
    });
    sigmaRef.current = sigma;

    if (typeof window !== "undefined") {
      window.__SIGMA__ = sigma;
    }

    sigma.on("clickNode", (e) => {
      handleConceptActivation(e.node);
    });

    sigma.on("clickEdge", (e) => {
      onOpenLinkInspector(e.edge);
    });

    sigma.on("clickStage", (e) => {
      const mode = interactionModeRef.current;
      if (mode === "placeConcept") {
        const graphCoords = sigma.viewportToGraph({ x: e.event.x, y: e.event.y });
        onOpenCreateConcept(Math.round(graphCoords.x), Math.round(graphCoords.y));
        return;
      }
      onClearSelection();
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
      const ratio = sigma.getCamera().getState().ratio;
      updateZoomMode(ratio);
      syncConceptPresentation();
    };

    sigma.on("afterRender", syncConceptPresentation);
    sigma.getCamera().on("updated", handleCameraUpdated);
    handleCameraUpdated();

    return () => {
      sigma.kill();
    };
  }, [
    snapshot,
    onOpenLinkInspector,
    onOpenCreateConcept,
    onClearSelection,
    handleConceptActivation,
    saveNodePosition,
    syncConceptPresentation,
    updateConceptPosition,
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
    isSnapshotLoading && !snapshot
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
        <div className="canvas-runtime-status">
          <Text size="1" color="gray">
            {runtimeStatusMessage}
          </Text>
        </div>
      )}

      <div
        ref={containerRef}
        className="sigma-canvas map-canvas"
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
      />

      <div ref={cardsLayerRef} className="sl-concept-card-layer" aria-hidden={!snapshot}>
        {snapshot?.concepts.map((concept) => {
          const conceptTypeLabel = messages.labels.conceptTypes[concept.conceptType];
          const isSelectedConcept = selection.kind === "concept" && selection.id === concept.id;
          const isConnectionSource =
            interactionMode === "connectLink" && connectLinkSourceId === concept.id;

          const cardClassName = [
            "sl-concept-card",
            isSelectedConcept ? "is-selected" : "",
            isConnectionSource ? "is-connection-source" : "",
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

      <div className="sl-concept-dot-layer" aria-hidden={!snapshot || !isZoomedOut}>
        {snapshot?.concepts.map((concept) => {
          const isSelectedConcept = selection.kind === "concept" && selection.id === concept.id;
          const isConnectionSource =
            interactionMode === "connectLink" && connectLinkSourceId === concept.id;
          const dotClassName = [
            "sl-concept-dot",
            isSelectedConcept ? "is-selected" : "",
            isConnectionSource ? "is-connection-source" : "",
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
