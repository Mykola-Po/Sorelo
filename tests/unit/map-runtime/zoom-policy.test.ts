import { describe, expect, it } from "vitest";
import {
  deriveLodThresholds,
  deriveZoomBounds,
} from "@/features/map-runtime/renderers/zoom-policy";

describe("zoom policy", () => {
  it("derives bounded zoom range for baseline ratio", () => {
    const { minRatio, maxRatio } = deriveZoomBounds(1);

    expect(minRatio).toBeGreaterThanOrEqual(0.5);
    expect(maxRatio).toBeLessThanOrEqual(2.4);
    expect(minRatio).toBeLessThan(maxRatio);
  });

  it("keeps valid range for very small or very large base ratio", () => {
    const tiny = deriveZoomBounds(0.01);
    const huge = deriveZoomBounds(100);

    expect(tiny.minRatio).toBeGreaterThanOrEqual(0.5);
    expect(tiny.maxRatio).toBeLessThanOrEqual(2.4);
    expect(tiny.minRatio).toBeLessThan(tiny.maxRatio);

    expect(huge.minRatio).toBeGreaterThanOrEqual(0.5);
    expect(huge.maxRatio).toBeLessThanOrEqual(2.4);
    expect(huge.minRatio).toBeLessThan(huge.maxRatio);
  });

  it("derives hysteresis thresholds inside range", () => {
    const { dotEnterRatio, dotExitRatio } = deriveLodThresholds(0.6, 1.9);

    expect(dotExitRatio).toBeLessThan(dotEnterRatio);
    expect(dotExitRatio).toBeGreaterThanOrEqual(0.6);
    expect(dotEnterRatio).toBeLessThanOrEqual(1.9);
  });
});
