"use client";

import dynamic from "next/dynamic";
import { MapStoreProvider } from "@/features/map-runtime/store/map-store-provider";

// Load the overlay and GraphCanvasRuntime entirely on the client
// to avoid Sigma.js WebGL2RenderingContext errors during Next.js chunk compilation
const TestOverlayNoSSR = dynamic(() => import("./test-overlay"), {
  ssr: false,
});

export default function MapSandboxPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapStoreProvider mapId="test-map">
        <TestOverlayNoSSR />
      </MapStoreProvider>
    </div>
  );
}
