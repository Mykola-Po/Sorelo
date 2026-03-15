"use client";

import { useCallback, useEffect, useRef } from "react";

import type {
  CoreLoopFocusLostReason,
  CoreLoopTelemetryEvent,
} from "@/features/maps/core-loop-telemetry";
import {
  isPreFirstLinkGuidedStep,
  type GuidedOnboardingStep,
} from "@/features/maps/workspace-state";

type UseCoreLoopTelemetryInput = {
  mapId: string;
  guidedStep: GuidedOnboardingStep;
  conceptCount: number;
  linkCount: number;
};

export function useCoreLoopTelemetry(input: UseCoreLoopTelemetryInput) {
  const sessionStartedAtRef = useRef<number | null>(null);
  const stepStartedAtRef = useRef<number | null>(null);
  const lastStepEventKeyRef = useRef<string | null>(null);
  const focusLostSentStepsRef = useRef<Set<GuidedOnboardingStep>>(new Set());

  useEffect(() => {
    sessionStartedAtRef.current = null;
    stepStartedAtRef.current = null;
    lastStepEventKeyRef.current = null;
    focusLostSentStepsRef.current = new Set();
  }, [input.mapId]);

  const sendTelemetry = useCallback(
    (event: CoreLoopTelemetryEvent, preferBeacon = false) => {
      const endpoint = `/api/maps/${input.mapId}/telemetry/core-loop`;
      const payload = JSON.stringify(event);

      if (
        preferBeacon &&
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const beaconPayload = new Blob([payload], { type: "application/json" });
        const accepted = navigator.sendBeacon(endpoint, beaconPayload);

        if (accepted) {
          return;
        }
      }

      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        cache: "no-store",
        keepalive: preferBeacon,
      }).catch(() => {
        // Telemetry must never block UX.
      });
    },
    [input.mapId]
  );

  useEffect(() => {
    const now = Date.now();
    const previousStepEventKey = lastStepEventKeyRef.current;
    const nextStepEventKey = `${input.guidedStep}:${input.conceptCount}:${input.linkCount}`;

    if (previousStepEventKey === nextStepEventKey) {
      return;
    }

    if (sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = now;
    }

    stepStartedAtRef.current = now;
    lastStepEventKeyRef.current = nextStepEventKey;

    sendTelemetry({
      action: "core_loop.step_viewed",
      step: input.guidedStep,
      source: previousStepEventKey === null ? "workspace_load" : "step_change",
      conceptCount: input.conceptCount,
      linkCount: input.linkCount,
    });
  }, [input.conceptCount, input.guidedStep, input.linkCount, sendTelemetry]);

  useEffect(() => {
    if (!isPreFirstLinkGuidedStep(input.guidedStep)) {
      return;
    }

    const trackFocusLost = (reason: CoreLoopFocusLostReason) => {
      if (focusLostSentStepsRef.current.has(input.guidedStep)) {
        return;
      }

      const now = Date.now();
      const stepStartedAt = stepStartedAtRef.current ?? now;
      const sessionStartedAt = sessionStartedAtRef.current ?? stepStartedAt;

      sendTelemetry(
        {
          action: "core_loop.focus_lost",
          step: input.guidedStep,
          reason,
          conceptCount: input.conceptCount,
          linkCount: input.linkCount,
          msSinceStepStart: Math.max(0, Math.round(now - stepStartedAt)),
          msSinceSessionStart: Math.max(0, Math.round(now - sessionStartedAt)),
        },
        true
      );

      focusLostSentStepsRef.current.add(input.guidedStep);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        trackFocusLost("document_hidden");
      }
    };

    const handlePageHide = () => {
      trackFocusLost("page_hide");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [
    input.conceptCount,
    input.guidedStep,
    input.linkCount,
    sendTelemetry,
  ]);
}
