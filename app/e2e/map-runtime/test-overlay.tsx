"use client";

import { useState } from "react";
import { GraphCanvasRuntime } from "@/features/map-runtime/components/graph-canvas-runtime";
import { useMapStore } from "@/features/map-runtime/store/map-store-provider";
import type { MapDetail, GraphMetrics } from "@/features/maps/types";

const dummyMap: MapDetail = {
  id: "test-map",
  slug: "test-map",
  title: "E2E Test Map",
  subjectLabel: "Test Subject",
  description: "A map for e2e testing",
  graphRevision: 1,
  updatedAt: new Date(),
  workspace: {
    id: "test-workspace",
    slug: "test",
    name: "Test Workspace"
  }
};

const dummyMetrics: GraphMetrics = {
  conceptCount: 2,
  linkCount: 1,
  revision: 1,
};

export default function TestOverlay() {
  const [lastAction, setLastAction] = useState<string>("None");
  const mode = useMapStore(s => s.interactionMode);
  const selection = useMapStore(s => s.selection);
  
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setSelection = useMapStore(s => s.setSelection);
  const setConnectLinkSourceId = useMapStore(s => s.setConnectLinkSourceId);

  return (
    <>
      <div 
        id="e2e-overlay-state" 
        style={{ position: "absolute", top: 10, left: 10, zIndex: 100, background: "white", padding: "10px", border: "1px solid black" }}
      >
        <div data-testid="current-mode">Mode: {mode}</div>
        <div data-testid="last-action">Action: {lastAction}</div>
        <div data-testid="selection">Selection: {selection.kind}</div>
      </div>
      <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 100, display: "flex", gap: "10px" }}>
         <button data-testid="set-mode-concept" onClick={() => setInteractionMode("placeConcept")}>+ Concept</button>
         <button data-testid="set-mode-link" onClick={() => setInteractionMode("connectLink")}>+ Link</button>
      </div>
      <GraphCanvasRuntime 
        locale="en"
        map={dummyMap}
        graphMetrics={dummyMetrics}
        selection={{ kind: "none" }}
        interactionMode="inspect"
        connectLinkSourceId={null}
        onClearSelection={() => {
           setLastAction("Cleared Selection");
           setSelection({ kind: "none" });
        }}
        onOpenCreateConcept={(x, y) => {
           setLastAction(`Create Concept at ${x},${y}`);
           setSelection({ kind: "create-concept", x, y });
        }}
        onOpenConceptInspector={(conceptId) => {
           setLastAction(`Inspect Concept ${conceptId}`);
           setSelection({ kind: "concept", id: conceptId });
        }}
        onOpenLinkInspector={(linkId) => {
           setLastAction(`Inspect Link ${linkId}`);
           setSelection({ kind: "link", id: linkId });
        }}
        onPickConnectSource={(conceptId) => {
           setLastAction(`Picked Connect Source ${conceptId}`);
           setConnectLinkSourceId(conceptId);
        }}
        onCompleteConnectLink={(source, target) => {
           setLastAction(`Completed Link ${source} -> ${target}`);
           setSelection({ kind: "create-link", sourceConceptId: source, targetConceptId: target, relationType: "causes", strength: 1 });
        }}
      />
    </>
  );
}
