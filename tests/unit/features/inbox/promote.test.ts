import { describe, expect, it } from "vitest";

import { compileInboxApplyContract } from "@/features/inbox/promote";

describe("inbox promote compiler", () => {
  it("compiles deterministic create_concept and create_link operations", () => {
    const contract = compileInboxApplyContract({
      entities: [
        {
          label: "Public criticism",
          entityType: "trigger",
          fragmentOrdinals: [0],
          confidence: 0.82,
          payload: {},
        },
        {
          label: "Withdrawal",
          entityType: "state",
          fragmentOrdinals: [0],
          confidence: 0.78,
          payload: {},
        },
      ],
      relations: [
        {
          sourceLabel: "Public criticism",
          targetLabel: "Withdrawal",
          relationType: "causes",
          fragmentOrdinals: [0],
          confidence: 0.84,
          payload: {},
        },
      ],
      constraints: [],
      fragments: [
        {
          ordinal: 0,
          fragmentText: "Public criticism causes withdrawal.",
          fragmentType: "statement",
          sourceKind: "item_raw",
          clarificationAnswerId: null,
          typeCandidates: ["statement"],
          span: {
            start: 0,
            end: 35,
          },
          metadata: {},
        },
      ],
      clarificationContext: [],
      existingConcepts: [],
    });

    expect(
      contract.operations.some(
        (operation) => operation.operationType === "create_concept"
      )
    ).toBe(true);
    expect(
      contract.operations.some(
        (operation) => operation.operationType === "create_link"
      )
    ).toBe(true);
  });

  it("degrades fuzzy concept overlap into merge review", () => {
    const contract = compileInboxApplyContract({
      entities: [
        {
          label: "Fear of criticism",
          entityType: "belief",
          fragmentOrdinals: [0],
          confidence: 0.76,
          payload: {},
        },
      ],
      relations: [],
      constraints: [],
      fragments: [
        {
          ordinal: 0,
          fragmentText: "Fear of criticism drives the reaction.",
          fragmentType: "statement",
          sourceKind: "item_raw",
          clarificationAnswerId: null,
          typeCandidates: ["statement"],
          span: {
            start: 0,
            end: 38,
          },
          metadata: {},
        },
      ],
      clarificationContext: [],
      existingConcepts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Fear",
          conceptType: "state",
          summary: null,
          description: null,
        },
      ],
    });

    expect(contract.operations[0]?.operationType).toBe("merge_candidate");
  });

  it("parks links that depend on blocked concepts", () => {
    const contract = compileInboxApplyContract({
      entities: [
        {
          label: "Fear of criticism",
          entityType: "belief",
          fragmentOrdinals: [0],
          confidence: 0.76,
          payload: {},
        },
        {
          label: "Withdrawal",
          entityType: "state",
          fragmentOrdinals: [0],
          confidence: 0.73,
          payload: {},
        },
      ],
      relations: [
        {
          sourceLabel: "Fear of criticism",
          targetLabel: "Withdrawal",
          relationType: "causes",
          fragmentOrdinals: [0],
          confidence: 0.81,
          payload: {},
        },
      ],
      constraints: [],
      fragments: [
        {
          ordinal: 0,
          fragmentText: "Fear of criticism causes withdrawal.",
          fragmentType: "statement",
          sourceKind: "item_raw",
          clarificationAnswerId: null,
          typeCandidates: ["statement"],
          span: {
            start: 0,
            end: 36,
          },
          metadata: {},
        },
      ],
      clarificationContext: [],
      existingConcepts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Fear",
          conceptType: "state",
          summary: null,
          description: null,
        },
      ],
    });

    expect(
      contract.operations.some(
        (operation) => operation.operationType === "park_for_review"
      )
    ).toBe(true);
  });
});
