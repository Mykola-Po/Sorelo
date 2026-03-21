import { describe, expect, it } from "vitest";

import {
  assertInboxStatusTransition,
  canTransitionInboxStatus,
  computeInboxScore,
  decideInboxRoute,
  isTerminalInboxStatus,
} from "@/features/inbox/state-machine";

describe("inbox state machine", () => {
  it("computes the weighted inbox score from the blueprint formula", () => {
    const score = computeInboxScore({
      signalQuality: 0.9,
      interpretability: 0.85,
      structure: 0.8,
      grounding: 0.88,
      actionability: 0.75,
      utility: 0.82,
      penalty: 0.1,
    });

    expect(score).toBeGreaterThan(0.72);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("promotes strong low-ambiguity signals", () => {
    const decision = decideInboxRoute({
      rInbox: 0.81,
      confidence: 0.78,
      ambiguity: 0.18,
      risk: 0.12,
      hasReusableSignal: true,
    });

    expect(decision.route).toBe("promote");
    expect(decision.nextStatus).toBe("promoted");
  });

  it("requests clarification when the expected value gain exceeds ask cost", () => {
    const decision = decideInboxRoute({
      rInbox: 0.58,
      confidence: 0.62,
      ambiguity: 0.49,
      risk: 0.2,
      expectedValueGain: 0.8,
      askCost: 0.25,
    });

    expect(decision.route).toBe("clarify");
    expect(decision.nextStatus).toBe("clarification_requested");
  });

  it("parks reusable but weak signals and discards duplicates", () => {
    expect(
      decideInboxRoute({
        rInbox: 0.24,
        confidence: 0.31,
        ambiguity: 0.6,
        risk: 0.22,
        hasReusableSignal: true,
      }).route
    ).toBe("park");

    expect(
      decideInboxRoute({
        rInbox: 0.76,
        confidence: 0.77,
        ambiguity: 0.14,
        risk: 0.1,
        isDuplicate: true,
      }).route
    ).toBe("discard");
  });

  it("guards status transitions and terminal states", () => {
    expect(canTransitionInboxStatus("resolved", "promoted")).toBe(true);
    expect(canTransitionInboxStatus("clarification_requested", "interpreted")).toBe(
      true
    );
    expect(() => assertInboxStatusTransition("received", "promoted")).toThrow(
      "Invalid Inbox status transition"
    );
    expect(isTerminalInboxStatus("parked")).toBe(true);
    expect(isTerminalInboxStatus("normalized")).toBe(false);
  });
});
