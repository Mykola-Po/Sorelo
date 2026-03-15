import { describe, expect, it } from "vitest";

import { deriveGraphViewportBounds } from "@/features/map-runtime/renderers/viewport-sync";

describe("viewport sync", () => {
  it("projects viewport dimensions into normalized graph bounds", () => {
    const viewport = deriveGraphViewportBounds({ width: 500, height: 400 }, ({ x, y }) => ({
      x: x === 0 ? 100.2 : 340.7,
      y: y === 0 ? 50.8 : 249.1,
    }));

    expect(viewport).toEqual({
      x: 100,
      y: 50,
      width: 241,
      height: 200,
    });
  });

  it("handles camera projections where coordinates are inverted", () => {
    const viewport = deriveGraphViewportBounds({ width: 900, height: 600 }, ({ x, y }) => ({
      x: x === 0 ? 520.4 : 120.1,
      y: y === 0 ? 470.2 : 80.5,
    }));

    expect(viewport).toEqual({
      x: 120,
      y: 80,
      width: 401,
      height: 391,
    });
  });

  it("clamps negative coordinates to zero and keeps minimum dimensions", () => {
    const viewport = deriveGraphViewportBounds({ width: 640, height: 480 }, ({ x, y }) => ({
      x: x === 0 ? -5.9 : -2.1,
      y: y === 0 ? -9.4 : -1.2,
    }));

    expect(viewport).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("returns null for invalid viewport dimensions or non-finite projection output", () => {
    expect(deriveGraphViewportBounds({ width: 0, height: 800 }, () => ({ x: 1, y: 1 }))).toBeNull();
    expect(
      deriveGraphViewportBounds({ width: 800, height: 600 }, () => ({
        x: Number.NaN,
        y: 1,
      }))
    ).toBeNull();
  });
});
