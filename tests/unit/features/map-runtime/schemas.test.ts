import { describe, expect, it } from "vitest";

import {
  createConceptRouteSchema,
  patchConceptPositionsRouteSchema,
} from "@/features/map-runtime/schemas";

describe("map runtime mutation schemas", () => {
  it("requires expectedRevision on concept creation payloads", () => {
    const parsed = createConceptRouteSchema.safeParse({
      expectedRevision: "9",
      title: "Signal",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 100,
      y: 120,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.expectedRevision).toBe(9);
  });

  it("requires expectedRevision on batched position saves", () => {
    expect(
      patchConceptPositionsRouteSchema.safeParse({
        positions: [
          {
            conceptId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            x: 100,
            y: 120,
          },
        ],
      }).success
    ).toBe(false);
  });
});
