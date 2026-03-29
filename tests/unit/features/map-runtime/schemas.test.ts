import { describe, expect, it } from "vitest";

import {
  createConceptRouteSchema,
  createLinkRouteSchema,
  deleteLinkRouteSchema,
  mapGraphOpsQuerySchema,
  patchConceptPositionRouteSchema,
  patchConceptPositionsRouteSchema,
  updateConceptRouteSchema,
  updateLinkRouteSchema,
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

  it("accepts optional client mutation metadata on concept creation payloads", () => {
    const parsed = createConceptRouteSchema.safeParse({
      expectedRevision: 9,
      title: "Signal",
      conceptType: "custom",
      summary: null,
      description: null,
      x: 100,
      y: 120,
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(parsed.success).toBe(true);
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

  it("accepts optional client mutation metadata on single position saves", () => {
    const parsed = patchConceptPositionRouteSchema.safeParse({
      expectedRevision: 4,
      x: 120.4,
      y: 240.6,
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.x).toBe(120);
    expect(parsed.data.y).toBe(241);
    expect(parsed.data.clientMutationId).toBe(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    );
  });

  it("accepts optional client mutation metadata on link mutations", () => {
    const createParsed = createLinkRouteSchema.safeParse({
      expectedRevision: 4,
      sourceConceptId: "11111111-1111-4111-8111-111111111111",
      targetConceptId: "22222222-2222-4222-8222-222222222222",
      relationType: "causes",
      strength: 3,
      description: null,
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    const deleteParsed = deleteLinkRouteSchema.safeParse({
      expectedRevision: 4,
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientMutationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });

    expect(createParsed.success).toBe(true);
    expect(deleteParsed.success).toBe(true);
  });

  it("requires expectedContentRevision on semantic concept and link updates", () => {
    const conceptParsed = updateConceptRouteSchema.safeParse({
      expectedContentRevision: "3",
      title: "Signal",
      conceptType: "belief",
      summary: null,
      description: "Updated concept",
    });
    const linkParsed = updateLinkRouteSchema.safeParse({
      expectedContentRevision: "4",
      sourceConceptId: "11111111-1111-4111-8111-111111111111",
      targetConceptId: "22222222-2222-4222-8222-222222222222",
      relationType: "explains",
      strength: 5,
      description: "Updated link",
    });

    expect(conceptParsed.success).toBe(true);
    expect(linkParsed.success).toBe(true);

    if (conceptParsed.success) {
      expect(conceptParsed.data.expectedContentRevision).toBe(3);
    }

    if (linkParsed.success) {
      expect(linkParsed.data.expectedContentRevision).toBe(4);
    }
  });

  it("parses replay pagination inputs for op-log routes", () => {
    const parsed = mapGraphOpsQuerySchema.safeParse({
      afterSeq: "12",
      limit: "25",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data).toEqual({
      afterSeq: 12,
      limit: 25,
    });
  });
});
