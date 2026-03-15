import { describe, expect, it } from "vitest";

import { coreLoopTelemetryEventSchema } from "@/features/maps/core-loop-telemetry";

describe("core-loop telemetry schema", () => {
  it("accepts step viewed events", () => {
    const parsed = coreLoopTelemetryEventSchema.safeParse({
      action: "core_loop.step_viewed",
      step: "multiple_concepts_no_link",
      source: "step_change",
      conceptCount: 2,
      linkCount: 0,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts focus lost events", () => {
    const parsed = coreLoopTelemetryEventSchema.safeParse({
      action: "core_loop.focus_lost",
      step: "one_concept_no_link",
      reason: "document_hidden",
      conceptCount: 1,
      linkCount: 0,
      msSinceStepStart: 1200,
      msSinceSessionStart: 1500,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unsupported focus reasons", () => {
    const parsed = coreLoopTelemetryEventSchema.safeParse({
      action: "core_loop.focus_lost",
      step: "one_concept_no_link",
      reason: "window_blur",
      conceptCount: 1,
      linkCount: 0,
      msSinceStepStart: 1200,
      msSinceSessionStart: 1500,
    });

    expect(parsed.success).toBe(false);
  });
});
