"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Flex, Text } from "@radix-ui/themes";

import type { InspectorSelection } from "@/features/inspector/types";
import type {
  CanvasInteractionMode,
  GuidedOnboardingStep,
} from "@/features/maps/workspace-state";
import type {
  GraphMetrics,
  MapDetail,
} from "@/features/maps/types";
import type { GraphSnapshot, GraphViewport } from "@/features/map-runtime/types";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 124;
const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1500;
const VIEWPORT_OVERSCAN = 320;

type DragState = {
  id: string;
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
};

type GraphCanvasRuntimeProps = {
  locale: SupportedLocale;
  map: MapDetail;
  graphMetrics: GraphMetrics;
  selection: InspectorSelection;
  guidedStep: GuidedOnboardingStep;
  interactionMode: CanvasInteractionMode;
  connectLinkSourceId: string | null;
  connectLinkSourceTitle: string | null;
  onClearSelection: () => void;
  onOpenCreateConcept: (x: number, y: number) => void;
  onOpenConceptInspector: (conceptId: string) => void;
  onOpenLinkInspector: (linkId: string) => void;
  onPickConnectSource: (conceptId: string) => void;
  onCompleteConnectLink: (sourceConceptId: string, targetConceptId: string) => void;
};

export function GraphCanvasRuntime({
  locale,
  map,
  graphMetrics,
  selection,
  guidedStep,
  interactionMode,
  connectLinkSourceId,
  connectLinkSourceTitle,
  onClearSelection,
  onOpenCreateConcept,
  onOpenConceptInspector,
  onOpenLinkInspector,
  onPickConnectSource,
  onCompleteConnectLink,
}: GraphCanvasRuntimeProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [runtimeRevision, setRuntimeRevision] = useState(graphMetrics.revision);
  const [viewport, setViewport] = useState<GraphViewport>({
    x: 0,
    y: 0,
    width: 1280,
    height: 860,
    overscan: VIEWPORT_OVERSCAN,
  });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(positions);
  const dragStateRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    setRuntimeRevision(graphMetrics.revision);
  }, [graphMetrics.revision]);

  const syncViewport = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    setViewport((current) => {
      const next = {
        x: element.scrollLeft,
        y: element.scrollTop,
        width: element.clientWidth,
        height: element.clientHeight,
        overscan: VIEWPORT_OVERSCAN,
      };

      if (
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height &&
        current.overscan === next.overscan
      ) {
        return current;
      }

      return next;
    });
  }, []);

  useEffect(() => {
    syncViewport();

    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        syncViewport();
        rafRef.current = null;
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      syncViewport();
    });

    element.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(element);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      element.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [syncViewport]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSnapshot() {
      setIsSnapshotLoading(true);
      setSnapshotError(null);

      try {
        const searchParams = new URLSearchParams({
          x: String(Math.round(viewport.x)),
          y: String(Math.round(viewport.y)),
          width: String(Math.round(viewport.width)),
          height: String(Math.round(viewport.height)),
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
        setRuntimeRevision(nextSnapshot.revision);
        setPositions((current) => {
          const next = { ...current };

          for (const concept of nextSnapshot.concepts) {
            if (dragStateRef.current?.id === concept.id) {
              continue;
            }

            next[concept.id] = {
              x: concept.x,
              y: concept.y,
            };
          }

          positionsRef.current = next;
          return next;
        });
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setSnapshotError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load graph snapshot."
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
  }, [map.id, runtimeRevision, viewport]);

  const renderedConcepts = useMemo(() => snapshot?.concepts ?? [], [snapshot]);
  const renderedLinks = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const visibleConceptIds = new Set(renderedConcepts.map((concept) => concept.id));

    return snapshot.links
      .filter(
        (link) =>
          visibleConceptIds.has(link.sourceConceptId) &&
          visibleConceptIds.has(link.targetConceptId)
      )
      .map((link) => {
        const sourcePosition = positions[link.sourceConceptId] ?? {
          x: 0,
          y: 0,
        };
        const targetPosition = positions[link.targetConceptId] ?? {
          x: 0,
          y: 0,
        };

        return {
          ...link,
          x1: sourcePosition.x + NODE_WIDTH / 2,
          y1: sourcePosition.y + NODE_HEIGHT / 2,
          x2: targetPosition.x + NODE_WIDTH / 2,
          y2: targetPosition.y + NODE_HEIGHT / 2,
        };
      });
  }, [positions, renderedConcepts, snapshot]);

  const canvasHint =
    interactionMode === "placeConcept"
      ? {
          badge: messages.canvas.placeConceptBadge,
          title: messages.canvas.placeConceptTitle,
          description: messages.canvas.placeConceptDescription,
        }
      : interactionMode === "connectLink"
        ? {
            badge: messages.canvas.createLinkBadge,
            title: connectLinkSourceId
              ? messages.canvas.createLinkTargetTitle(
                  connectLinkSourceTitle ?? ""
                )
              : messages.canvas.createLinkSourceTitle,
            description: connectLinkSourceId
              ? messages.canvas.createLinkTargetDescription
              : messages.canvas.createLinkSourceDescription,
          }
        : {
            badge:
              guidedStep === "done"
                ? messages.mapReadyBadge
                : messages.stepLabel(
                    messages.guided[guidedStep].stepNumber,
                    messages.guided[guidedStep].totalSteps
                  ),
            title: messages.guided[guidedStep].title,
            description: messages.guided[guidedStep].description,
          };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (interactionMode === "placeConcept") {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clampCoordinate(
        event.clientX - rect.left - NODE_WIDTH / 2,
        CANVAS_WIDTH - NODE_WIDTH
      );
      const y = clampCoordinate(
        event.clientY - rect.top - NODE_HEIGHT / 2,
        CANVAS_HEIGHT - NODE_HEIGHT
      );
      onOpenCreateConcept(Math.round(x), Math.round(y));
      return;
    }

    onClearSelection();
  };

  const flushDragPreview = useCallback(() => {
    const active = dragStateRef.current;
    const pointer = latestPointerRef.current;

    if (!active || !pointer) {
      return;
    }

    const nextX = clampCoordinate(
      active.startX + (pointer.x - active.pointerX),
      CANVAS_WIDTH - NODE_WIDTH
    );
    const nextY = clampCoordinate(
      active.startY + (pointer.y - active.pointerY),
      CANVAS_HEIGHT - NODE_HEIGHT
    );

    setPositions((current) => {
      const previous = current[active.id] ?? { x: active.startX, y: active.startY };
      if (previous.x === nextX && previous.y === nextY) {
        return current;
      }

      const next = {
        ...current,
        [active.id]: {
          x: nextX,
          y: nextY,
        },
      };
      positionsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      latestPointerRef.current = { x: event.clientX, y: event.clientY };

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        flushDragPreview();
        rafRef.current = null;
      });
    };

    const handlePointerUp = async () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      flushDragPreview();

      const nextPosition = positionsRef.current[dragState.id] ?? {
        x: dragState.startX,
        y: dragState.startY,
      };
      const previousPosition = { x: dragState.startX, y: dragState.startY };

      setDragState(null);
      dragStateRef.current = null;
      latestPointerRef.current = null;

      if (
        nextPosition.x === previousPosition.x &&
        nextPosition.y === previousPosition.y
      ) {
        return;
      }

      setIsSavingPosition(true);

      try {
        const response = await fetch(
          `/api/maps/${map.id}/concepts/${dragState.id}/position`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              x: Math.round(nextPosition.x),
              y: Math.round(nextPosition.y),
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Unable to update concept position.");
        }

        const payload = (await response.json()) as {
          revision: number;
          concept: { x: number; y: number };
        };

        setRuntimeRevision(payload.revision);
        setPositions((current) => {
          const next = {
            ...current,
            [dragState.id]: {
              x: payload.concept.x,
              y: payload.concept.y,
            },
          };
          positionsRef.current = next;
          return next;
        });
      } catch {
        setPositions((current) => {
          const next = {
            ...current,
            [dragState.id]: previousPosition,
          };
          positionsRef.current = next;
          return next;
        });
      } finally {
        setIsSavingPosition(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, flushDragPreview, map.id]);

  return (
    <div className="canvas-card">
      <div className="canvas-guidance-banner">
        <Badge color="blue" radius="full" variant="soft">
          {canvasHint.badge}
        </Badge>
        <Text size="2" weight="medium">
          {canvasHint.title}
        </Text>
        {interactionMode !== "inspect" ? (
          <Text size="2" color="gray">
            {canvasHint.description}
          </Text>
        ) : null}
      </div>

      {graphMetrics.conceptCount === 0 && interactionMode === "inspect" ? (
        <div className="canvas-empty-overlay">
          <Text size="2" color="gray">
            {messages.canvas.emptyOverlay}
          </Text>
        </div>
      ) : null}

      {snapshotError ? (
        <div className="canvas-empty-overlay is-error">
          <Text size="2" color="red">
            {snapshotError}
          </Text>
        </div>
      ) : null}

      <div ref={scrollRef} className="canvas-scroll-native">
        <div className="map-canvas" onClick={handleCanvasClick}>
          <svg
            className="link-layer"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="concept-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="rgba(24, 24, 27, 0.55)" />
              </marker>
            </defs>
            {renderedLinks.map((link) => (
              <g key={link.id}>
                <line
                  x1={link.x1}
                  y1={link.y1}
                  x2={link.x2}
                  y2={link.y2}
                  className={
                    selection.kind === "link" && selection.id === link.id
                      ? "map-link is-selected"
                      : "map-link"
                  }
                  markerEnd="url(#concept-arrow)"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenLinkInspector(link.id);
                  }}
                />
                <text
                  x={(link.x1 + link.x2) / 2}
                  y={(link.y1 + link.y2) / 2}
                  className="map-link-label"
                >
                  {messages.labels.relationTypes[link.relationType]}
                </text>
              </g>
            ))}
          </svg>

          {renderedConcepts.map((concept) => {
            const position = positions[concept.id] ?? {
              x: concept.x,
              y: concept.y,
            };
            const selected =
              selection.kind === "concept" && selection.id === concept.id;
            const isSource = connectLinkSourceId === concept.id;

            return (
              <button
                key={concept.id}
                type="button"
                className={
                  selected
                    ? "concept-node is-selected"
                    : isSource
                      ? "concept-node is-connection-source"
                      : "concept-node"
                }
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                }}
                onPointerDown={(event) => {
                  if (interactionMode !== "inspect") {
                    return;
                  }

                  event.stopPropagation();
                  setDragState({
                    id: concept.id,
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    startX: position.x,
                    startY: position.y,
                  });
                  latestPointerRef.current = { x: event.clientX, y: event.clientY };
                }}
                onClick={(event) => {
                  event.stopPropagation();

                  if (interactionMode === "connectLink") {
                    if (!connectLinkSourceId) {
                      onPickConnectSource(concept.id);
                      return;
                    }

                    if (connectLinkSourceId === concept.id) {
                      return;
                    }

                    onCompleteConnectLink(connectLinkSourceId, concept.id);
                    return;
                  }

                  onOpenConceptInspector(concept.id);
                }}
              >
                <Flex direction="column" gap="2" align="start">
                  <Flex align="center" justify="between" gap="2" width="100%">
                    <Badge color="gray" radius="full" variant="soft">
                      {messages.labels.conceptTypes[concept.conceptType]}
                    </Badge>
                    <Text size="1" color="gray">
                      {Math.round(position.x)} | {Math.round(position.y)}
                    </Text>
                  </Flex>
                  <Text size="4" weight="bold" className="concept-node-title">
                    {concept.title}
                  </Text>
                  <Text size="2" color="gray" className="concept-node-summary">
                    {concept.summary ?? messages.canvas.conceptSummaryFallback}
                  </Text>
                </Flex>
              </button>
            );
          })}
        </div>
      </div>

      {isSnapshotLoading && !snapshot ? (
        <div className="canvas-runtime-status">
          <Text size="2" color="gray">
            Loading graph snapshot...
          </Text>
        </div>
      ) : null}

      {isSavingPosition ? (
        <div className="canvas-runtime-status">
          <Text size="2" color="gray">
            {messages.canvas.updatingPosition}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

function clampCoordinate(value: number, max: number) {
  if (value < 24) {
    return 24;
  }

  if (value > max - 24) {
    return max - 24;
  }

  return value;
}

