import { describe, expect, it } from "vitest";

import {
  deriveConceptLineageTransitions,
  deriveLinkLineageTransitions,
} from "@/features/learning/evolution";

describe("deriveConceptLineageTransitions", () => {
  it("returns rename and retype when title and type change", () => {
    const transitions = deriveConceptLineageTransitions({
      before: {
        title: "Old title",
        conceptType: "belief",
        archivedAt: null,
      },
      after: {
        title: "New title",
        conceptType: "state",
        archivedAt: null,
      },
    });

    expect(transitions).toEqual(["rename", "retype"]);
  });

  it("returns archive when archivedAt changes from null to date", () => {
    const transitions = deriveConceptLineageTransitions({
      before: {
        title: "Concept",
        conceptType: "belief",
        archivedAt: null,
      },
      after: {
        title: "Concept",
        conceptType: "belief",
        archivedAt: new Date("2026-03-14T10:00:00.000Z"),
      },
    });

    expect(transitions).toEqual(["archive"]);
  });

  it("returns restore when archivedAt changes from date to null", () => {
    const transitions = deriveConceptLineageTransitions({
      before: {
        title: "Concept",
        conceptType: "belief",
        archivedAt: new Date("2026-03-14T10:00:00.000Z"),
      },
      after: {
        title: "Concept",
        conceptType: "belief",
        archivedAt: null,
      },
    });

    expect(transitions).toEqual(["restore"]);
  });

  it("returns empty array when no lineage transition happened", () => {
    const transitions = deriveConceptLineageTransitions({
      before: {
        title: "Concept",
        conceptType: "belief",
        archivedAt: null,
      },
      after: {
        title: "Concept",
        conceptType: "belief",
        archivedAt: null,
      },
    });

    expect(transitions).toEqual([]);
  });
});

describe("deriveLinkLineageTransitions", () => {
  it("returns retype when relation type changes", () => {
    const transitions = deriveLinkLineageTransitions({
      beforeRelationType: "causes",
      afterRelationType: "explains",
    });

    expect(transitions).toEqual(["retype"]);
  });

  it("returns empty array when relation type did not change", () => {
    const transitions = deriveLinkLineageTransitions({
      beforeRelationType: "causes",
      afterRelationType: "causes",
    });

    expect(transitions).toEqual([]);
  });
});
