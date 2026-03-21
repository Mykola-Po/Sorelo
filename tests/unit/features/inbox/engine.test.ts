import { describe, expect, it } from "vitest";

import {
  finalizeInboxRouteAfterClarification,
  normalizeInboxText,
  runInboxPipelineDraft,
  segmentInboxText,
} from "@/features/inbox/engine";

describe("inbox engine", () => {
  it("normalizes text and detects the primary language", () => {
    const result = normalizeInboxText(
      "  Коли тема переходить до критики, людина замикається.  "
    );

    expect(result.normalizedText).toBe(
      "Коли тема переходить до критики, людина замикається."
    );
    expect(result.language).toBe("uk");
    expect(result.normalizationNotes.length).toBeGreaterThan(0);
  });

  it("segments input into typed fragments", () => {
    const result = segmentInboxText(
      "The person shuts down after criticism. What exactly triggers that?"
    );

    expect(result.fragments).toHaveLength(2);
    expect(result.fragments[0]?.fragmentType).toBe("statement");
    expect(result.fragments[1]?.fragmentType).toBe("question");
  });

  it("produces a clarification route when ambiguity is still high", () => {
    const result = runInboxPipelineDraft({
      itemId: "11111111-1111-4111-8111-111111111111",
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction. What exactly triggers the reaction first? We need to know who is involved before promotion.",
    });

    expect(result.scorer.rInbox).toBeGreaterThanOrEqual(0.45);
    expect(result.route.route).toBe("clarify");
    expect(result.route.clarificationDraft?.question).toContain("What exactly");
    expect(result.route.structuredPacket).not.toBeNull();
  });

  it("discards exact duplicates against existing normalized texts", () => {
    const result = runInboxPipelineDraft({
      itemId: "11111111-1111-4111-8111-111111111111",
      sourceType: "manual_note",
      rawText: "Fear of criticism causes withdrawal.",
      resolveContext: {
        otherNormalizedTexts: ["Fear of criticism causes withdrawal."],
      },
    });

    expect(result.resolver.dedupeSignals).toContain("exact_normalized_text_match");
    expect(result.route.route).toBe("discard");
  });

  it("appends answer-derived fragments and reroutes with clarification context", () => {
    const initial = runInboxPipelineDraft({
      itemId: "11111111-1111-4111-8111-111111111111",
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction. What exactly triggers the reaction first? We need to know who is involved before promotion.",
    });

    const clarified = runInboxPipelineDraft({
      itemId: "11111111-1111-4111-8111-111111111111",
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction. What exactly triggers the reaction first? We need to know who is involved before promotion.",
      baseNormalizedText: initial.normalizer.normalizedText,
      baseFragments: initial.segmenter.fragments,
      clarificationContext: [
        {
          requestId: "22222222-2222-4222-8222-222222222222",
          question:
            initial.route.clarificationDraft?.question ??
            "What exactly triggers the reaction first?",
          answerId: "33333333-3333-4333-8333-333333333333",
          answerText:
            "The reaction starts when the criticism comes from a close partner in front of other people.",
        },
      ],
    });

    expect(clarified.clarificationFragments.length).toBeGreaterThan(0);
    expect(
      clarified.analysisFragments.some(
        (fragment) => fragment.sourceKind === "clarification_answer"
      )
    ).toBe(true);
    expect(["promote", "park"]).toContain(clarified.route.route);
    expect(
      (
        clarified.route.structuredPacket?.payload as {
          clarificationContext?: Array<{ answerId: string }>;
        }
      ).clarificationContext?.[0]?.answerId
    ).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("forces a second clarify route into park after one answered clarification", () => {
    const initial = runInboxPipelineDraft({
      itemId: "11111111-1111-4111-8111-111111111111",
      sourceType: "manual_note",
      rawText:
        "Public criticism from close people causes withdrawal and a defensive reaction. What exactly triggers the reaction first? We need to know who is involved before promotion.",
    });

    const forced = finalizeInboxRouteAfterClarification(initial.route);

    expect(initial.route.route).toBe("clarify");
    expect(forced.route).toBe("park");
    expect(forced.nextStatus).toBe("parked");
    expect(forced.clarificationDraft).toBeNull();
    expect(forced.structuredPacket?.packetType).toBe("parked_packet");
  });
});
