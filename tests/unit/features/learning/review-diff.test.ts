import { describe, expect, it } from "vitest";

import {
  deriveLearningReviewDiff,
  formatLearningDiffValue,
  humanizeLearningFieldPath,
} from "@/features/learning/review-diff";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";

describe("deriveLearningReviewDiff", () => {
  it("derives updates from before/after snapshots", () => {
    const entries = deriveLearningReviewDiff({
      before: {
        title: "Old title",
        conceptType: "belief",
      },
      after: {
        title: "New title",
        conceptType: "belief",
        summary: "Concise summary",
      },
    });

    expect(entries).toEqual([
      {
        fieldPath: "summary",
        beforeValue: undefined,
        afterValue: "Concise summary",
        changeKind: "add",
      },
      {
        fieldPath: "title",
        beforeValue: "Old title",
        afterValue: "New title",
        changeKind: "update",
      },
    ]);
  });

  it("derives updates from changes map with from/to pairs", () => {
    const entries = deriveLearningReviewDiff({
      changes: {
        strength: {
          from: 0.2,
          to: 0.8,
        },
        relationType: {
          from: "weakens",
          to: "causes",
        },
      },
    });

    expect(entries).toEqual([
      {
        fieldPath: "relationType",
        beforeValue: "weakens",
        afterValue: "causes",
        changeKind: "update",
      },
      {
        fieldPath: "strength",
        beforeValue: 0.2,
        afterValue: 0.8,
        changeKind: "update",
      },
    ]);
  });

  it("falls back to flattening a plain payload", () => {
    const entries = deriveLearningReviewDiff({
      title: "Avoidance loop",
      metadata: {
        confidence: 0.72,
        tags: ["trigger", "belief"],
      },
    });

    expect(entries).toEqual([
      {
        fieldPath: "metadata.confidence",
        beforeValue: undefined,
        afterValue: 0.72,
        changeKind: "add",
      },
      {
        fieldPath: "metadata.tags",
        beforeValue: undefined,
        afterValue: ["trigger", "belief"],
        changeKind: "add",
      },
      {
        fieldPath: "title",
        beforeValue: undefined,
        afterValue: "Avoidance loop",
        changeKind: "add",
      },
    ]);
  });
});

describe("humanizeLearningFieldPath", () => {
  const englishMessages = getMapWorkspaceMessages("en").learning;

  it("uses an exact field label mapping", () => {
    expect(
      humanizeLearningFieldPath(
        "sourceConceptId",
        englishMessages.fieldLabels,
        englishMessages.genericFieldLabel
      )
    ).toBe("Source Concept");
  });

  it("falls back to the last segment label for nested paths", () => {
    expect(
      humanizeLearningFieldPath(
        "metadata.targetConceptId",
        englishMessages.fieldLabels,
        englishMessages.genericFieldLabel
      )
    ).toBe("Target Concept");
  });

  it("humanizes unknown field paths", () => {
    expect(
      humanizeLearningFieldPath(
        "metadata.reason_text",
        englishMessages.fieldLabels,
        englishMessages.genericFieldLabel
      )
    ).toBe("Metadata / Reason text");
  });

  it("uses the generic fallback label when the path is empty", () => {
    expect(
      humanizeLearningFieldPath(
        "",
        englishMessages.fieldLabels,
        englishMessages.genericFieldLabel
      )
    ).toBe("Field");
  });
});

describe("learning localization messages", () => {
  it("keeps context_limited human-readable in supported locales", () => {
    expect(getMapWorkspaceMessages("en").learning.resolutionType("context_limited")).toBe(
      "needs context"
    );
    expect(getMapWorkspaceMessages("ru").learning.resolutionType("context_limited")).toBe(
      "не хватает контекста"
    );
  });
});

describe("formatLearningDiffValue", () => {
  it("formats primitive and empty values consistently", () => {
    expect(formatLearningDiffValue(undefined)).toBe("-");
    expect(formatLearningDiffValue("")).toBe("\"\"");
    expect(formatLearningDiffValue(null)).toBe("null");
  });

  it("formats arrays and objects", () => {
    expect(formatLearningDiffValue(["a", "b"])).toBe("a, b");
    expect(formatLearningDiffValue({ strength: 0.7 })).toBe(
      "{\"strength\":0.7}"
    );
  });
});
