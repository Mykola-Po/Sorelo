"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Text } from "@radix-ui/themes";
import type { InspectorSelection } from "@/features/inspector/types";
import type { CanvasInteractionMode } from "@/features/maps/workspace-state";
import type { GraphMetrics, MapDetail } from "@/features/maps/types";
import type { GraphSnapshot } from "@/features/map-runtime/types";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";

import { useMapStore } from "../store/map-store-provider";
import { buildGraphologyInstance } from "../renderers/graph-builder";
import { createSigmaInstance } from "../renderers/sigma-instance";
import type { Sigma } from "sigma";

const POSITION_FLUSH_DEBOUNCE_MS = 750;

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
};

export function GraphCanvasRuntime({
  locale,
  map,
  graphMetrics,
  onClearSelection,
  onOpenCreateConcept,
  onOpenConceptInspector,
  onOpenLinkInspector,
  onPickConnectSource,
  onCompleteConnectLink,
}: GraphCanvasRuntimeProps) {
  const messages = getMapWorkspaceMessages(locale);
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);

  // Zustand State
  const snapshot = useMapStore((s) => s.snapshot);
  const setSnapshot = useMapStore((s) => s.setSnapshot);
  const viewport = useMapStore((s) => s.viewport);
  const interactionMode = useMapStore((s) => s.interactionMode);
  const connectLinkSourceId = useMapStore((s) => s.connectLinkSourceId);
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
  }, [map.id, setSnapshot, viewport]); // Note: In a real robust app, debounce viewport changes to avoid spamming the API

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

      // Update in Zustand for UI
      updateConceptPosition(conceptId, { x, y });

      // Debounce and send to backend
      setTimeout(() => {
        sendPositionsBatch([{ conceptId, x, y }])
          .catch((err) => console.error("Failed to save position", err))
          .finally(() => setIsSavingPosition(false));
      }, POSITION_FLUSH_DEBOUNCE_MS);
    },
    [sendPositionsBatch, updateConceptPosition]
  );

  // --- Sigma Foundation Initializer ---
  useEffect(() => {
    if (!containerRef.current || !snapshot) return;

    // 1. Convert snapshot to graphology instance
    const graph = buildGraphologyInstance(snapshot);

    // 2. Instantiate Sigma Engine
    const sigma = createSigmaInstance({
      container: containerRef.current,
      graph,
    });
    sigmaRef.current = sigma;

    // 3. Sigma interaction events forwarding to store and callbacks
    sigma.on("clickNode", (e) => {
      const mode = interactionModeRef.current;
      const sourceId = connectLinkSourceIdRef.current;

      if (mode === "connectLink") {
        if (!sourceId) {
          onPickConnectSource(e.node);
          return;
        }
        if (sourceId === e.node) return;
        onCompleteConnectLink(sourceId, e.node);
        return;
      }

      onOpenConceptInspector(e.node);
    });

    sigma.on("clickEdge", (e) => {
      onOpenLinkInspector(e.edge);
    });

    sigma.on("clickStage", (e) => {
      const mode = interactionModeRef.current;
      if (mode === "placeConcept") {
        // Transform screen coords to graph coordinates
        const graphCoords = sigma.viewportToGraph({ x: e.event.x, y: e.event.y });
        onOpenCreateConcept(Math.round(graphCoords.x), Math.round(graphCoords.y));
        return;
      }
      onClearSelection();
    });

    // 4. Custom Drag-and-Drop Implementation over Sigma primitives
    let isDragging = false;
    let dragNode: string | null = null;

    sigma.on("downNode", (e) => {
      isDragging = true;
      dragNode = e.node;
      sigma.getCamera().disable(); // Prevent map panning while dragging a node
    });

    sigma.getMouseCaptor().on("mousemovebody", (e) => {
      if (!isDragging || !dragNode) return;

      const pos = sigma.viewportToGraph(e);
      sigma.getGraph().setNodeAttribute(dragNode, "x", pos.x);
      sigma.getGraph().setNodeAttribute(dragNode, "y", pos.y);
      updateConceptPosition(dragNode, { x: pos.x, y: pos.y });
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
    });

    // Clean up WebGL context on unmount or snapshot change
    return () => {
      sigma.kill();
    };
  }, [
    snapshot,
    onOpenConceptInspector,
    onOpenLinkInspector,
    onOpenCreateConcept,
    onClearSelection,
    onCompleteConnectLink,
    onPickConnectSource,
    saveNodePosition,
    updateConceptPosition,
  ]);

  const runtimeStatusMessage =
    isSnapshotLoading && !snapshot ? messages.canvas.loadingSnapshot : isSavingPosition ? messages.canvas.updatingPosition : null;

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
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, background: "var(--color-surface)", padding: 8, borderRadius: 6, boxShadow: "var(--shadow-2)" }}>
           <Text size="1" color="gray">{runtimeStatusMessage}</Text>
        </div>
      )}

      {/* SIGMA.JS WEBGL RENDER MOUNT TARGET */}
      <div 
         ref={containerRef} 
         className="sigma-canvas map-canvas" 
         style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} 
      />
    </div>
  );
}
