import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Theme } from "@radix-ui/themes";
import { describe, expect, it } from "vitest";

import { InspectorProvenanceSection } from "@/features/inspector/components/inspector-provenance";
import type { InspectorProvenancePayload } from "@/features/inspector/types";

function renderMarkup(provenance: InspectorProvenancePayload | null) {
  return renderToStaticMarkup(
    createElement(
      Theme,
      null,
      createElement(InspectorProvenanceSection, {
        locale: "en",
        workspaceSlug: "demo-workspace",
        provenance,
      })
    )
  );
}

describe("InspectorProvenanceSection", () => {
  it("renders inbox provenance evidence and navigation when provenance exists", () => {
    const markup = renderMarkup({
      id: "prov-1",
      mapVersionId: "map-version-1",
      mutationType: "create_concept",
      createdAt: "2026-03-22T10:00:00.000Z",
      suggestion: {
        id: "suggestion-1",
        suggestionType: "create_concept",
        rationale: "The clarification confirms a reusable trigger.",
        confidence: 0.93,
        artifactOrder: 0,
      },
      resolution: {
        id: "resolution-1",
        resolutionType: "accepted",
        applyStatus: "applied",
        reasonText: "Canonical trigger accepted after review.",
        resolvedAt: "2026-03-22T10:01:00.000Z",
        appliedAt: "2026-03-22T10:02:00.000Z",
      },
      inboxItem: {
        id: "item-1",
        rawText: "Public criticism causes withdrawal.",
        status: "applied",
        createdAt: "2026-03-22T09:59:00.000Z",
      },
      evidence: [
        {
          id: "evidence-1",
          inboxFragmentId: "fragment-1",
          clarificationAnswerId: "answer-1",
          evidenceOrder: 0,
          fragmentOrdinal: 1,
          fragmentText: "Public criticism from close people.",
          sourceKind: "clarification_answer",
          clarificationAnswerText:
            "The reaction starts when the criticism comes from a close partner in front of other people.",
        },
      ],
    });

    expect(markup).toContain("Provenance");
    expect(markup).toContain("Open in Inbox");
    expect(markup).toContain(
      "Clarification answer: The reaction starts when the criticism comes from a close partner in front of other people."
    );
    expect(markup).toContain("/app/demo-workspace/inbox?item=item-1");
  });

  it("renders an explicit empty state when canonical provenance is missing", () => {
    const markup = renderMarkup(null);

    expect(markup).toContain("Provenance");
    expect(markup).toContain(
      "No canonical apply provenance has been recorded yet."
    );
  });
});
