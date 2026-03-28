import { describe, expect, it } from "vitest";

import { mapTransportClientTelemetryEventSchema } from "@/features/map-runtime/realtime/transport-telemetry";

describe("map transport telemetry schema", () => {
  it("accepts replay telemetry events", () => {
    const parsed = mapTransportClientTelemetryEventSchema.safeParse({
      action: "map_transport.ops_replayed",
      trigger: "window_focus",
      opCount: 3,
      fromSeq: 4,
      toSeq: 7,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts snapshot fallback telemetry events", () => {
    const parsed = mapTransportClientTelemetryEventSchema.safeParse({
      action: "map_transport.snapshot_fallback",
      reason: "missing_sequence",
      afterSeq: 9,
      opKind: "concept.create",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects gap recovery events from revision_event triggers", () => {
    const parsed = mapTransportClientTelemetryEventSchema.safeParse({
      action: "map_transport.gap_recovery",
      trigger: "revision_event",
      opCount: 2,
      fromSeq: 5,
      toSeq: 7,
    });

    expect(parsed.success).toBe(false);
  });
});
