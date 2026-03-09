"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, Card, Flex, Heading, ScrollArea, Text } from "@radix-ui/themes";
import Link from "next/link";

import { repositionConceptAction } from "@/features/concepts/actions";
import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import type { InspectorSelection } from "@/features/inspector/types";
import { ScenarioPanel } from "@/features/scenarios/components/scenario-panel";
import type { ConceptSummary, MapWorkspaceProps } from "@/features/maps/types";
import { workspaceMapPath } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui/components/empty-state";
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
  const [panelTab, setPanelTab] = useState<PanelTab>("inspector");
  const [selection, setSelection] = useState<InspectorSelection>({ kind: "none" });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    () =>
      Object.fromEntries(
        concepts.map((concept) => [concept.id, { x: concept.x, y: concept.y }])
      )
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(positions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

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
          y: clampCoordinate(dragState.startY + dy, CANVAS_HEIGHT - NODE_HEIGHT),
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

  const handleConceptPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    concept: ConceptSummary
  ) => {
    if ((event.target as HTMLElement).closest("[data-no-drag='true']")) {
      return;
    }

    event.preventDefault();
    const position = resolvedPositions[concept.id] ?? {
      x: concept.x,
      y: concept.y,
    };

    setPanelTab("inspector");
    setSelection({ kind: "concept", id: concept.id });
    setDragState({
      id: concept.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    });
  };

  return (
    <div className="map-screen">
      <div className="page-stack">
        <Flex align="start" justify="between" gap="4" wrap="wrap">
          <Flex direction="column" gap="1">
            <Heading size="7">{map.title}</Heading>
            <Text color="gray" size="3">
              {map.subjectLabel} · Build the person model through Concepts,
              Links, Inspector work, and deterministic Scenarios.
            </Text>
          </Flex>
          <Flex gap="2" wrap="wrap">
            <Button
              type="button"
              onClick={() => {
                setPanelTab("inspector");
                setSelection({ kind: "create-concept" });
              }}
            >
              New Concept
            </Button>
            <Button
              type="button"
              variant="soft"
              onClick={() => {
                setPanelTab("inspector");
                setSelection({ kind: "create-link" });
              }}
            >
              Create Link
            </Button>
            <Button
              type="button"
              variant="soft"
              onClick={() => setPanelTab("scenario")}
            >
              Run Scenario
            </Button>
            <Button
              type="button"
              variant="surface"
              onClick={() => {
                setPanelTab("inspector");
                setSelection({ kind: "map-settings" });
              }}
            >
              Map settings
            </Button>
          </Flex>
        </Flex>

        <Card className="map-switcher-card">
          <Flex direction="column" gap="3">
            <Flex align="center" justify="between" gap="3" wrap="wrap">
              <Text size="2" weight="medium">
                Maps in this workspace
              </Text>
              <StatusBadge status={workspaceRole} />
            </Flex>
            <ScrollArea type="auto" scrollbars="horizontal" className="inline-scroll">
              <Flex gap="2" wrap="nowrap">
                {availableMaps.map((candidate) => (
                  <Button
                    key={candidate.id}
                    asChild
                    variant={candidate.id === map.id ? "solid" : "surface"}
                    color={candidate.id === map.id ? "blue" : "gray"}
                  >
                    <Link href={workspaceMapPath(workspaceSlug, candidate.id)}>
                      {candidate.title}
                    </Link>
                  </Button>
                ))}
              </Flex>
            </ScrollArea>
          </Flex>
        </Card>

        <div className="map-workspace-grid">
          <div className="map-panel">
            <Flex direction="column" gap="3" height="100%">
              <Flex gap="2" wrap="wrap">
                <Button
                  type="button"
                  variant={panelTab === "inspector" ? "solid" : "surface"}
                  onClick={() => setPanelTab("inspector")}
                >
                  Inspector
                </Button>
                <Button
                  type="button"
                  variant={panelTab === "scenario" ? "solid" : "surface"}
                  onClick={() => setPanelTab("scenario")}
                >
                  Scenario
                </Button>
              </Flex>
              <ScrollArea type="auto" scrollbars="vertical" className="panel-scroll">
                <div className="panel-content">
                  {panelTab === "inspector" ? (
                    <InspectorPanel
                      workspaceSlug={workspaceSlug}
                      workspaceRole={workspaceRole}
                      map={map}
                      concepts={concepts}
                      links={links}
                      scenarios={scenarios}
                      selection={selection}
                      onSelect={setSelection}
                    />
                  ) : (
                    <ScenarioPanel
                      workspaceSlug={workspaceSlug}
                      map={map}
                      concepts={concepts}
                      links={links}
                      scenarios={scenarios}
                      runs={runs}
                    />
                  )}
                </div>
              </ScrollArea>
            </Flex>
          </div>

          <div className="canvas-card">
            {concepts.length === 0 ? (
              <EmptyState
                title="This map has no Concepts yet"
                description="Start with one Concept that captures a meaningful internal factor. The canvas becomes useful as soon as Concepts and Links make structure visible."
                action={
                  <Button
                    type="button"
                    onClick={() => {
                      setPanelTab("inspector");
                      setSelection({ kind: "create-concept" });
                    }}
                  >
                    Create first Concept
                  </Button>
                }
              />
            ) : (
              <ScrollArea
                type="auto"
                scrollbars="both"
                className="canvas-scroll"
              >
                <div ref={canvasRef} className="map-canvas">
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
                          onClick={() => {
                            setPanelTab("inspector");
                            setSelection({ kind: "link", id: link.id });
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
                      selection.kind === "concept" && selection.id === concept.id;

                    return (
                      <button
                        key={concept.id}
                        type="button"
                        className={
                          selected ? "concept-node is-selected" : "concept-node"
                        }
                        style={{
                          left: `${position.x}px`,
                          top: `${position.y}px`,
                        }}
                        onPointerDown={(event) =>
                          handleConceptPointerDown(event, concept)
                        }
                        onClick={() => {
                          setPanelTab("inspector");
                          setSelection({ kind: "concept", id: concept.id });
                        }}
                      >
                        <Flex direction="column" gap="2" align="start">
                          <Flex align="center" justify="between" gap="2" width="100%">
                            <StatusBadge status={concept.conceptType} />
                            <Text size="1" color="gray">
                              {Math.round(position.x)} · {Math.round(position.y)}
                            </Text>
                          </Flex>
                          <Heading size="4" className="concept-node-title">
                            {concept.title}
                          </Heading>
                          <Text size="2" color="gray" className="concept-node-summary">
                            {concept.summary ??
                              "Open Inspector to define the meaning of this Concept."}
                          </Text>
                        </Flex>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {isPending ? (
          <Text size="2" color="gray">
            Updating canvas position…
          </Text>
        ) : null}
      </div>
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
