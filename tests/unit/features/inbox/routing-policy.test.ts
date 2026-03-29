import { describe, expect, it } from "vitest";

import {
  applyInboxRoutingOverride,
  deriveInboxRoutingCompatibility,
  evaluateInboxRoutingPolicy,
  inboxRoutingPolicyVersion,
} from "@/features/inbox/routing-policy";

describe("inbox routing policy", () => {
  it("records the promote rule with a stable version and note id", () => {
    const trace = evaluateInboxRoutingPolicy({
      rInbox: 0.81,
      confidence: 0.78,
      ambiguity: 0.18,
      risk: 0.12,
      hasReusableSignal: true,
    }).trace;

    expect(trace.policyVersion).toBe(inboxRoutingPolicyVersion);
    expect(trace.requestedDecision.ruleId).toBe(
      "promote.strong_signal_low_ambiguity"
    );
    expect(trace.finalDecision.route).toBe("promote");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.promote.strong_signal_low_ambiguity",
    ]);
  });

  it("records the clarify rule when value of asking beats ask cost", () => {
    const trace = evaluateInboxRoutingPolicy({
      rInbox: 0.58,
      confidence: 0.62,
      ambiguity: 0.49,
      risk: 0.2,
      expectedValueGain: 0.8,
      askCost: 0.25,
    }).trace;

    expect(trace.requestedDecision.ruleId).toBe(
      "clarify.value_of_asking_exceeds_cost"
    );
    expect(trace.finalDecision.route).toBe("clarify");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.clarify.value_of_asking_exceeds_cost",
    ]);
  });

  it("records the park rule for reusable but weak signals", () => {
    const trace = evaluateInboxRoutingPolicy({
      rInbox: 0.24,
      confidence: 0.31,
      ambiguity: 0.6,
      risk: 0.22,
      hasReusableSignal: true,
    }).trace;

    expect(trace.requestedDecision.ruleId).toBe(
      "park.reusable_signal_needs_review"
    );
    expect(trace.finalDecision.route).toBe("park");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.park.reusable_signal_needs_review",
    ]);
  });

  it("records the risk ceiling discard rule for duplicates and empty signals", () => {
    const trace = evaluateInboxRoutingPolicy({
      rInbox: 0.76,
      confidence: 0.77,
      ambiguity: 0.14,
      risk: 0.1,
      isDuplicate: true,
    }).trace;

    expect(trace.requestedDecision.ruleId).toBe(
      "discard.empty_duplicate_or_risk_ceiling"
    );
    expect(trace.finalDecision.route).toBe("discard");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.discard.empty_duplicate_or_risk_ceiling",
    ]);
  });

  it("records the weak-signal discard fallback when nothing is worth keeping", () => {
    const trace = evaluateInboxRoutingPolicy({
      rInbox: 0.08,
      confidence: 0.21,
      ambiguity: 0.52,
      risk: 0.18,
      expectedValueGain: 0.1,
      askCost: 0.32,
    }).trace;

    expect(trace.requestedDecision.ruleId).toBe(
      "discard.weak_signal_low_value"
    );
    expect(trace.finalDecision.route).toBe("discard");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.discard.weak_signal_low_value",
    ]);
  });

  it("records the clarification cap override as a second decision note", () => {
    const baseTrace = evaluateInboxRoutingPolicy({
      rInbox: 0.58,
      confidence: 0.62,
      ambiguity: 0.49,
      risk: 0.2,
      expectedValueGain: 0.8,
      askCost: 0.25,
    }).trace;
    const trace = applyInboxRoutingOverride(
      baseTrace,
      "override.clarification_cap_reached"
    );

    expect(trace.finalDecision.ruleId).toBe("override.clarification_cap_reached");
    expect(trace.finalDecision.route).toBe("park");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.clarify.value_of_asking_exceeds_cost",
      "route.override.clarification_cap_reached",
    ]);
    expect(deriveInboxRoutingCompatibility(trace).overrideReason).toContain(
      "Clarification cap reached"
    );
  });

  it("records the missing target map override as versioned policy state", () => {
    const baseTrace = evaluateInboxRoutingPolicy({
      rInbox: 0.81,
      confidence: 0.78,
      ambiguity: 0.18,
      risk: 0.12,
      hasReusableSignal: true,
    }).trace;
    const trace = applyInboxRoutingOverride(
      baseTrace,
      "override.promotion_scope_requires_target_map"
    );

    expect(trace.finalDecision.ruleId).toBe(
      "override.promotion_scope_requires_target_map"
    );
    expect(trace.finalDecision.route).toBe("park");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.promote.strong_signal_low_ambiguity",
      "route.override.promotion_scope_requires_target_map",
    ]);
  });

  it("records the deterministic mutation override when promote cannot be materialized safely", () => {
    const baseTrace = evaluateInboxRoutingPolicy({
      rInbox: 0.81,
      confidence: 0.78,
      ambiguity: 0.18,
      risk: 0.12,
      hasReusableSignal: true,
    }).trace;
    const trace = applyInboxRoutingOverride(
      baseTrace,
      "override.promote_requires_deterministic_mutation"
    );

    expect(trace.finalDecision.ruleId).toBe(
      "override.promote_requires_deterministic_mutation"
    );
    expect(trace.finalDecision.route).toBe("park");
    expect(trace.decisionNotes.map((note) => note.id)).toEqual([
      "route.promote.strong_signal_low_ambiguity",
      "route.override.promote_requires_deterministic_mutation",
    ]);
  });
});
