"use client";

import { createBrowserSupabaseClient } from "@/shared/auth/supabase/browser";

export type MapRevisionInvalidationEvent = {
  revision: number | null;
};

export function subscribeToMapRevisionInvalidation(
  mapId: string,
  input: {
    onEvent: (event: MapRevisionInvalidationEvent) => void;
    onSubscribed?: (isResubscribe: boolean) => void;
  }
) {
  const supabase = createBrowserSupabaseClient();
  let hasSubscribedOnce = false;

  const channel = supabase
    .channel(`map-runtime-${mapId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "maps",
        filter: `id=eq.${mapId}`,
      },
      (payload) => {
        const revision =
          typeof payload.new === "object" &&
          payload.new !== null &&
          "graphRevision" in payload.new &&
          typeof (payload.new as { graphRevision?: unknown }).graphRevision ===
            "number"
            ? (payload.new as { graphRevision: number }).graphRevision
            : null;

        input.onEvent({ revision });
      }
    )
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      input.onSubscribed?.(hasSubscribedOnce);
      hasSubscribedOnce = true;
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
