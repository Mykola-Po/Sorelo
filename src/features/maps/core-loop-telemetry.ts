import { z } from "zod";

import { guidedOnboardingSteps } from "@/features/maps/workspace-state";

export const coreLoopFocusLostReasons = ["document_hidden", "page_hide"] as const;

const guidedStepSchema = z.enum(guidedOnboardingSteps);

const stepViewedEventSchema = z.object({
  action: z.literal("core_loop.step_viewed"),
  step: guidedStepSchema,
  source: z.enum(["workspace_load", "step_change"]),
  conceptCount: z.number().int().min(0).max(100000),
  linkCount: z.number().int().min(0).max(100000),
});

const focusLostEventSchema = z.object({
  action: z.literal("core_loop.focus_lost"),
  step: guidedStepSchema,
  reason: z.enum(coreLoopFocusLostReasons),
  conceptCount: z.number().int().min(0).max(100000),
  linkCount: z.number().int().min(0).max(100000),
  msSinceStepStart: z.number().int().min(0).max(86_400_000),
  msSinceSessionStart: z.number().int().min(0).max(86_400_000),
});

export const coreLoopTelemetryEventSchema = z.discriminatedUnion("action", [
  stepViewedEventSchema,
  focusLostEventSchema,
]);

export type CoreLoopTelemetryEvent = z.infer<typeof coreLoopTelemetryEventSchema>;
export type CoreLoopFocusLostReason = (typeof coreLoopFocusLostReasons)[number];
