"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MapStoreProvider } from "@/features/map-runtime/store/map-store-provider";
import { useMapStore } from "@/features/map-runtime/store/map-store-provider";
import type { GraphSnapshot } from "@/features/map-runtime/types";

// Load the overlay and GraphCanvasRuntime entirely on the client
// to avoid Sigma.js WebGL2RenderingContext errors during Next.js chunk compilation
const TestOverlayNoSSR = dynamic(() => import("./test-overlay"), {
  ssr: false,
});

const E2E_SNAPSHOT_STORAGE_KEY = "sorelo:e2e:map-runtime:snapshot";

const INITIAL_SNAPSHOT: GraphSnapshot = {
  revision: 1,
  counts: {
    conceptCount: 2,
    linkCount: 1,
  },
  concepts: [
    {
      id: "node-a",
      title: "Node A",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 100,
      y: 100,
      updatedAt: "2026-03-24T00:00:00.000Z",
    },
    {
      id: "node-b",
      title: "Node B",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 300,
      y: 300,
      updatedAt: "2026-03-24T00:00:00.000Z",
    },
  ],
  links: [
    {
      id: "link-a-b",
      sourceConceptId: "node-a",
      targetConceptId: "node-b",
      relationType: "causes",
      strength: 3,
      description: null,
      updatedAt: "2026-03-24T00:00:00.000Z",
    },
  ],
};

export default function MapSandboxPage() {
  const [initialSnapshot] = useState<GraphSnapshot>(() => {
    if (typeof window === "undefined") {
      return INITIAL_SNAPSHOT;
    }

    try {
      const persistedSnapshot = window.sessionStorage.getItem(E2E_SNAPSHOT_STORAGE_KEY);
      if (!persistedSnapshot) {
        return INITIAL_SNAPSHOT;
      }

      const nextSnapshot = JSON.parse(persistedSnapshot) as GraphSnapshot;
      if (Array.isArray(nextSnapshot.concepts) && Array.isArray(nextSnapshot.links)) {
        return nextSnapshot;
      }
    } catch {
      window.sessionStorage.removeItem(E2E_SNAPSHOT_STORAGE_KEY);
    }

    return INITIAL_SNAPSHOT;
  });

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapStoreProvider mapId="test-map" initialSnapshot={initialSnapshot}>
        <PersistSnapshotToSessionStorage />
        <TestOverlayNoSSR />
      </MapStoreProvider>
    </div>
  );
}

function PersistSnapshotToSessionStorage() {
  const snapshot = useMapStore((state) => state.snapshot);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    window.sessionStorage.setItem(
      E2E_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  }, [snapshot]);

  return null;
}
