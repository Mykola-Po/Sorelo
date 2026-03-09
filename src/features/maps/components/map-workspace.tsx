"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GearIcon,
  ReaderIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Dialog,
  Flex,
  Heading,
  ScrollArea,
  Select,
  Text,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";

import { repositionConceptAction } from "@/features/concepts/actions";
import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import type { InspectorSelection } from "@/features/inspector/types";
import {
  buildLinkDraftDefaults,
  deriveGuidedOnboardingStep,
  getNextPanelVisibilityState,
  getGuidedOnboardingCopy,
  MAP_PANEL_VISIBILITY_STORAGE_KEY,
  parseStoredPanelVisibilityState,
  type CanvasInteractionMode,
  type PanelVisibilityState,
} from "@/features/maps/workspace-state";
import type { ConceptSummary, MapWorkspaceProps } from "@/features/maps/types";
import { ScenarioPanel } from "@/features/scenarios/components/scenario-panel";
import { workspaceMapPath } from "@/shared/config/routes";
import { StatusBadge } from "@/shared/ui/components/status-badge";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 124;
const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1500;

type PanelTab = "inspector" | "scenario";

type DragState = {
  id: string;
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
};

export function MapWorkspace({
  workspaceSlug,
  workspaceRole,
  map,
  availableMaps,
  concepts,
  links,
  scenarios,
  runs,
}: MapWorkspaceProps) {
  const router = useRouter();
  const isMobileViewport = useIsMobileViewport();
  const [panelTab, setPanelTab] = useState<PanelTab>("inspector");
  const [selection, setSelection] = useState<InspectorSelection>({
    kind: "none",
  });
  const [interactionMode, setInteractionMode] =
    useState<CanvasInteractionMode>("inspect");
  const [connectLinkSourceId, setConnectLinkSourceId] = useState<string | null>(
    null
  );
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibilityState>(
    () => {
      if (typeof window === "undefined") {
        return "expanded";
      }

      return parseStoredPanelVisibilityState(
        window.localStorage.getItem(MAP_PANEL_VISIBILITY_STORAGE_KEY)
      );
    }
  );
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPending, startTransition] = useTransition();
  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    if (typeof window === "undefined" || isMobileViewport) {
      return;
    }

    window.localStorage.setItem(
      MAP_PANEL_VISIBILITY_STORAGE_KEY,
      panelVisibility
    );
  }, [isMobileViewport, panelVisibility]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - dragState.pointerX;
      const dy = event.clientY - dragState.pointerY;
      setPositions((current) => ({
        ...current,
        [dragState.id]: {
          x: clampCoordinate(dragState.startX + dx, CANVAS_WIDTH - NODE_WIDTH),
          y: clampCoordinate(
            dragState.startY + dy,
            CANVAS_HEIGHT - NODE_HEIGHT
          ),
        },
      }));
    };

    const handlePointerUp = () => {
      const nextPosition = positionsRef.current[dragState.id];
      const previousPosition = { x: dragState.startX, y: dragState.startY };
      setDragState(null);

      if (
        !nextPosition ||
        (nextPosition.x === previousPosition.x &&
          nextPosition.y === previousPosition.y)
      ) {
        return;
      }

      startTransition(async () => {
        await repositionConceptAction({
          workspaceSlug,
          mapId: map.id,
          conceptId: dragState.id,
          x: Math.round(nextPosition.x),
          y: Math.round(nextPosition.y),
        });
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, map.id, startTransition, workspaceSlug]);

  const guidedStep = deriveGuidedOnboardingStep({
    conceptCount: concepts.length,
    linkCount: links.length,
    scenarioRunCount: runs.length,
  });
  const guidedCopy = getGuidedOnboardingCopy(guidedStep);

  const resolvedPositions = useMemo(
    () =>
      Object.fromEntries(
        concepts.map((concept) => [
          concept.id,
          positions[concept.id] ?? { x: concept.x, y: concept.y },
        ])
      ),
    [concepts, positions]
  );

  const conceptLookup = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts]
  );

  const renderedLinks = useMemo(
    () =>
      links
        .map((link) => {
          const source = conceptLookup.get(link.sourceConceptId);
          const target = conceptLookup.get(link.targetConceptId);
          const sourcePosition = resolvedPositions[link.sourceConceptId];
          const targetPosition = resolvedPositions[link.targetConceptId];

          if (!source || !target || !sourcePosition || !targetPosition) {
            return null;
          }

          return {
            ...link,
            source,
            target,
            x1: sourcePosition.x + NODE_WIDTH / 2,
            y1: sourcePosition.y + NODE_HEIGHT / 2,
            x2: targetPosition.x + NODE_WIDTH / 2,
            y2: targetPosition.y + NODE_HEIGHT / 2,
          };
        })
        .filter((link): link is NonNullable<typeof link> => link !== null),
    [conceptLookup, links, resolvedPositions]
  );

  const linkingSourceConcept = connectLinkSourceId
    ? (conceptLookup.get(connectLinkSourceId) ?? null)
    : null;

  const canvasHint =
    interactionMode === "placeConcept"
      ? {
          badge: "Place Concept",
          title: "Click anywhere on the canvas to place the next Concept.",
          description:
            "The Inspector will open with the position already filled in.",
        }
      : interactionMode === "connectLink"
        ? {
            badge: "Create Link",
            title: linkingSourceConcept
              ? `Select the target Concept for "${linkingSourceConcept.title}".`
              : "Select the source Concept for the new Link.",
            description: linkingSourceConcept
              ? "The second click opens the Link form with source and target already filled in."
              : "The first click chooses where the influence starts.",
          }
        : {
            badge:
              guidedStep === "done"
                ? "Map ready"
                : `Step ${guidedCopy.stepNumber} of ${guidedCopy.totalSteps}`,
            title: guidedCopy.title,
            description: guidedCopy.description,
          };

  const openPanel = (tab: PanelTab) => {
    setPanelTab(tab);
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-panel")
    );
  };

  const toggleDesktopPanel = () => {
    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "toggle")
    );
  };

  const openMapSettings = () => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "map-settings" });
    setPanelTab("inspector");

    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-settings")
    );
  };

  const beginPlaceConcept = () => {
    setInteractionMode("placeConcept");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setMobilePanelOpen(false);
  };

  const beginConnectLink = () => {
    if (concepts.length < 2) {
      setInteractionMode("inspect");
      setConnectLinkSourceId(null);
      setSelection({ kind: "create-link" });
      openPanel("inspector");
      return;
    }

    setInteractionMode("connectLink");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setMobilePanelOpen(false);
  };

  const openConceptInspector = (conceptId: string) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "concept", id: conceptId });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const openLinkInspector = (linkId: string) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "link", id: linkId });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const openCreateConceptAt = (x: number, y: number) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({
      kind: "create-concept",
      x,
      y,
    });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const openCreateLinkDraft = (
    sourceConceptId: string,
    targetConceptId: string
  ) => {
    const defaults = buildLinkDraftDefaults();
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({
      kind: "create-link",
      sourceConceptId,
      targetConceptId,
      relationType: defaults.relationType,
      strength: defaults.strength,
    });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const clearCanvasSelection = () => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    if (isMobileViewport) {
      setMobilePanelOpen(false);
    }
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
      openCreateConceptAt(Math.round(x), Math.round(y));
      return;
    }

    clearCanvasSelection();
  };

  const handleConceptPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    concept: ConceptSummary
  ) => {
    if (interactionMode !== "inspect") {
      return;
    }

    event.stopPropagation();
    const position = resolvedPositions[concept.id] ?? {
      x: concept.x,
      y: concept.y,
    };

    setSelection({ kind: "concept", id: concept.id });
    setDragState({
      id: concept.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    });
  };

  const handleConceptClick = (concept: ConceptSummary) => {
    if (interactionMode === "connectLink") {
      if (!connectLinkSourceId) {
        setConnectLinkSourceId(concept.id);
        setSelection({ kind: "none" });
        setPanelTab("inspector");
        return;
      }

      if (connectLinkSourceId === concept.id) {
        return;
      }

      openCreateLinkDraft(connectLinkSourceId, concept.id);
      return;
    }

    openConceptInspector(concept.id);
  };

  const renderPanelContent = () => {
    if (panelTab === "inspector") {
      return (
        <InspectorPanel
          workspaceSlug={workspaceSlug}
          workspaceRole={workspaceRole}
          map={map}
          concepts={concepts}
          links={links}
          selection={selection}
          guidedStep={guidedStep}
          interactionMode={interactionMode}
          linkingSourceConcept={linkingSourceConcept}
          onSelect={setSelection}
          onStartCreateConcept={beginPlaceConcept}
          onStartCreateLink={beginConnectLink}
          onOpenScenario={() => openPanel("scenario")}
          onCancelInteraction={clearCanvasSelection}
        />
      );
    }

    return (
      <ScenarioPanel
        workspaceSlug={workspaceSlug}
        map={map}
        concepts={concepts}
        links={links}
        scenarios={scenarios}
        runs={runs}
      />
    );
  };

  return (
    <div className="map-screen">
      <Dialog.Root open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <div className="page-stack map-screen-stack">
          <Flex
            align="start"
            justify="between"
            gap="3"
            wrap="wrap"
            className="map-header-bar"
          >
            <Flex direction="column" gap="1" className="map-title-block">
              <Flex gap="2" wrap="wrap" align="center">
                <Heading size="6">{map.title}</Heading>
                <Badge color="gray" radius="full" variant="surface">
                  {map.subjectLabel}
                </Badge>
                <Badge color="blue" radius="full" variant="soft">
                  {canvasHint.badge}
                </Badge>
              </Flex>
              <Text color="gray" size="2" className="map-header-supporting">
                {canvasHint.title}
              </Text>
            </Flex>

            <Flex
              gap="2"
              wrap="wrap"
              align="center"
              className="map-header-actions"
            >
              <div className="map-inline-select">
                <Select.Root
                  size="2"
                  value={map.id}
                  onValueChange={(value) =>
                    router.push(workspaceMapPath(workspaceSlug, value))
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    {availableMaps.map((candidate) => (
                      <Select.Item key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <StatusBadge status={workspaceRole} />

              <Button
                type="button"
                size="2"
                variant={
                  interactionMode === "placeConcept" ? "solid" : "surface"
                }
                onClick={beginPlaceConcept}
              >
                New Concept
              </Button>
              <Button
                type="button"
                size="2"
                variant={
                  interactionMode === "connectLink" ? "solid" : "surface"
                }
                onClick={beginConnectLink}
              >
                Create Link
              </Button>
              <Button
                type="button"
                size="2"
                variant={panelTab === "scenario" ? "solid" : "surface"}
                onClick={() => openPanel("scenario")}
              >
                Run Scenario
              </Button>
            </Flex>
          </Flex>

          <div
            className={
              !isMobileViewport && panelVisibility === "collapsed"
                ? "map-workspace-grid is-panel-collapsed"
                : "map-workspace-grid"
            }
          >
            {!isMobileViewport ? (
              <div
                className={
                  panelVisibility === "collapsed"
                    ? "map-panel is-collapsed"
                    : "map-panel"
                }
              >
                {panelVisibility === "collapsed" ? (
                  <Flex
                    direction="column"
                    gap="2"
                    align="center"
                    className="map-panel-rail"
                  >
                    <Button
                      type="button"
                      size="1"
                      variant="soft"
                      color="gray"
                      title="Expand panel"
                      onClick={toggleDesktopPanel}
                    >
                      <ChevronRightIcon />
                    </Button>
                    <Button
                      type="button"
                      size="1"
                      variant={panelTab === "inspector" ? "solid" : "surface"}
                      title="Open Inspector"
                      onClick={() => openPanel("inspector")}
                    >
                      <ReaderIcon />
                    </Button>
                    <Button
                      type="button"
                      size="1"
                      variant={panelTab === "scenario" ? "solid" : "surface"}
                      title="Open Scenario"
                      onClick={() => openPanel("scenario")}
                    >
                      <RocketIcon />
                    </Button>
                    <Button
                      type="button"
                      size="1"
                      variant="surface"
                      color="gray"
                      title="Map settings"
                      onClick={openMapSettings}
                    >
                      <GearIcon />
                    </Button>
                  </Flex>
                ) : (
                  <Flex
                    direction="column"
                    gap="3"
                    height="100%"
                    className="map-panel-stack"
                  >
                    <Flex align="center" justify="between" gap="2">
                      <Flex gap="2" wrap="wrap">
                        <Button
                          type="button"
                          size="2"
                          variant={
                            panelTab === "inspector" ? "solid" : "surface"
                          }
                          onClick={() => setPanelTab("inspector")}
                        >
                          Inspector
                        </Button>
                        <Button
                          type="button"
                          size="2"
                          variant={
                            panelTab === "scenario" ? "solid" : "surface"
                          }
                          onClick={() => setPanelTab("scenario")}
                        >
                          Scenario
                        </Button>
                      </Flex>
                      <Flex gap="1" wrap="nowrap">
                        <Button
                          type="button"
                          size="1"
                          variant="ghost"
                          color="gray"
                          title="Map settings"
                          onClick={openMapSettings}
                        >
                          <GearIcon />
                        </Button>
                        <Button
                          type="button"
                          size="1"
                          variant="ghost"
                          color="gray"
                          title="Collapse panel"
                          onClick={toggleDesktopPanel}
                        >
                          <ChevronLeftIcon />
                        </Button>
                      </Flex>
                    </Flex>
                    <div className="panel-scroll-fill panel-native-scroll">
                      <div className="panel-content">
                        {renderPanelContent()}
                      </div>
                    </div>
                  </Flex>
                )}
              </div>
            ) : null}

            <div className="map-canvas-area">
              {isMobileViewport ? (
                <Flex gap="2" className="map-mobile-panel-bar">
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    onClick={() => {
                      setPanelTab("inspector");
                      setMobilePanelOpen(true);
                    }}
                  >
                    Inspector
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    onClick={() => {
                      setPanelTab("scenario");
                      setMobilePanelOpen(true);
                    }}
                  >
                    Scenario
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    color="gray"
                    onClick={openMapSettings}
                  >
                    <GearIcon />
                  </Button>
                </Flex>
              ) : null}

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

                {concepts.length === 0 && interactionMode === "inspect" ? (
                  <div className="canvas-empty-overlay">
                    <Text size="2" color="gray">
                      The first Concept starts the map. Click New Concept, then
                      place it directly on the canvas.
                    </Text>
                  </div>
                ) : null}

                <ScrollArea
                  type="auto"
                  scrollbars="both"
                  className="canvas-scroll"
                >
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
                          <path
                            d="M0,0 L0,6 L9,3 z"
                            fill="rgba(24, 24, 27, 0.55)"
                          />
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
                              selection.kind === "link" &&
                              selection.id === link.id
                                ? "map-link is-selected"
                                : "map-link"
                            }
                            markerEnd="url(#concept-arrow)"
                            onClick={(event) => {
                              event.stopPropagation();
                              openLinkInspector(link.id);
                            }}
                          />
                          <text
                            x={(link.x1 + link.x2) / 2}
                            y={(link.y1 + link.y2) / 2}
                            className="map-link-label"
                          >
                            {link.relationType}
                          </text>
                        </g>
                      ))}
                    </svg>

                    {concepts.map((concept) => {
                      const position = resolvedPositions[concept.id] ?? {
                        x: concept.x,
                        y: concept.y,
                      };
                      const selected =
                        selection.kind === "concept" &&
                        selection.id === concept.id;
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
                          onPointerDown={(event) =>
                            handleConceptPointerDown(event, concept)
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleConceptClick(concept);
                          }}
                        >
                          <Flex direction="column" gap="2" align="start">
                            <Flex
                              align="center"
                              justify="between"
                              gap="2"
                              width="100%"
                            >
                              <StatusBadge status={concept.conceptType} />
                              <Text size="1" color="gray">
                                {Math.round(position.x)} |{" "}
                                {Math.round(position.y)}
                              </Text>
                            </Flex>
                            <Heading size="4" className="concept-node-title">
                              {concept.title}
                            </Heading>
                            <Text
                              size="2"
                              color="gray"
                              className="concept-node-summary"
                            >
                              {concept.summary ??
                                "Open Inspector to define the meaning of this Concept."}
                            </Text>
                          </Flex>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          {isPending ? (
            <Text size="2" color="gray">
              Updating canvas position...
            </Text>
          ) : null}
        </div>

        {isMobileViewport ? (
          <Dialog.Content className="map-mobile-dialog">
            <Dialog.Title>
              {panelTab === "inspector" ? "Inspector" : "Scenario"}
            </Dialog.Title>
            <Dialog.Description className="map-mobile-dialog-description">
              {panelTab === "inspector"
                ? "Inspect Concepts, Links, and the current next step."
                : "Run Scenarios, save them, and inspect recent runs."}
            </Dialog.Description>
            <Flex gap="2" mb="3">
              <Button
                type="button"
                size="2"
                variant={panelTab === "inspector" ? "solid" : "surface"}
                onClick={() => setPanelTab("inspector")}
              >
                Inspector
              </Button>
              <Button
                type="button"
                size="2"
                variant={panelTab === "scenario" ? "solid" : "surface"}
                onClick={() => setPanelTab("scenario")}
              >
                Scenario
              </Button>
            </Flex>
            <div className="map-mobile-dialog-body">
              <div className="panel-content">{renderPanelContent()}</div>
            </div>
          </Dialog.Content>
        ) : null}
      </Dialog.Root>
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

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  return isMobile;
}
