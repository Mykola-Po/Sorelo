"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createMapStore, type MapStore, type MapState } from "./map-store";
import type { GraphSnapshot } from "@/features/map-runtime/types";

export const MapStoreContext = createContext<MapStore | null>(null);

export type MapStoreProviderProps = {
  children: ReactNode;
  mapId: string;
  initialSnapshot: GraphSnapshot;
};

export function MapStoreProvider({
  children,
  mapId,
  initialSnapshot,
}: MapStoreProviderProps) {
  const [store] = useState<MapStore>(() =>
    createMapStore({
      mapId,
      initialSnapshot,
    })
  );

  return (
    <MapStoreContext.Provider value={store}>
      {children}
    </MapStoreContext.Provider>
  );
}

export function useMapStore<T>(selector: (state: MapState) => T): T {
  const store = useContext(MapStoreContext);
  if (!store) {
    throw new Error("useMapStore must be used within a MapStoreProvider");
  }
  return useStore(store, selector);
}
