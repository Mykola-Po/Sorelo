import {
  inboxRouteDecisionInputSchema,
  inboxRouteDecisionSchema,
  inboxScoreBreakdownSchema,
  type InboxItemStatusInput,
  type InboxRouteDecision,
  type InboxRouteDecisionInputDraft,
  type InboxScoreBreakdown,
} from "@/features/inbox/schemas";

const inboxStatusTransitions: Record<
  InboxItemStatusInput,
  readonly InboxItemStatusInput[]
> = {
  received: ["persisted", "failed_needs_review"],
  persisted: ["normalized", "failed_needs_review"],
  normalized: ["segmented", "failed_needs_review"],
  segmented: ["interpreted", "failed_needs_review"],
  interpreted: ["scored", "failed_needs_review"],
  scored: ["resolved", "failed_needs_review"],
  resolved: [
    "clarification_requested",
    "promoted",
    "parked",
    "discarded",
    "failed_needs_review",
  ],
  clarification_requested: ["interpreted", "failed_needs_review"],
  promoted: [],
  parked: [],
  discarded: [],
  failed_needs_review: [],
};

export const inboxTerminalStatuses: readonly InboxItemStatusInput[] = [
  "promoted",
  "parked",
  "discarded",
  "failed_needs_review",
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function canTransitionInboxStatus(
  current: InboxItemStatusInput,
  next: InboxItemStatusInput
) {
  return inboxStatusTransitions[current].includes(next);
}

export function assertInboxStatusTransition(
  current: InboxItemStatusInput,
  next: InboxItemStatusInput
) {
  if (!canTransitionInboxStatus(current, next)) {
    throw new Error(`Invalid Inbox status transition: ${current} -> ${next}`);
  }

  return next;
}

export function isTerminalInboxStatus(status: InboxItemStatusInput) {
  return inboxTerminalStatuses.includes(status);
}

export function computeInboxScore(breakdown: InboxScoreBreakdown) {
  const parsed = inboxScoreBreakdownSchema.parse(breakdown);

  const rawScore =
    Math.pow(parsed.signalQuality, 0.24) *
    Math.pow(parsed.interpretability, 0.22) *
    Math.pow(parsed.structure, 0.16) *
    Math.pow(parsed.grounding, 0.18) *
    Math.pow(parsed.actionability, 0.1) *
    Math.pow(parsed.utility, 0.1) *
    (1 - parsed.penalty);

  return clamp01(rawScore);
}

export function decideInboxRoute(
  input: InboxRouteDecisionInputDraft
): InboxRouteDecision {
  const parsed = inboxRouteDecisionInputSchema.parse(input);

  if (parsed.isEmptySignal || parsed.isDuplicate || parsed.risk >= 0.95) {
    return inboxRouteDecisionSchema.parse({
      route: "discard",
      nextStatus: "discarded",
      reason:
        "The signal is empty, duplicate, or too risky to preserve as a structured packet.",
    });
  }

  if (
    parsed.rInbox >= 0.72 &&
    parsed.ambiguity <= 0.25 &&
    parsed.confidence >= 0.7
  ) {
    return inboxRouteDecisionSchema.parse({
      route: "promote",
      nextStatus: "promoted",
      reason:
        "The signal is strong enough to emit a structured packet without forcing extra clarification.",
    });
  }

  if (
    parsed.rInbox >= 0.45 &&
    parsed.rInbox < 0.72 &&
    parsed.expectedValueGain > parsed.askCost
  ) {
    return inboxRouteDecisionSchema.parse({
      route: "clarify",
      nextStatus: "clarification_requested",
      reason:
        "A single clarification is likely to change the routing outcome more than it costs the user.",
    });
  }

  if (parsed.hasReusableSignal || parsed.rInbox >= 0.2) {
    return inboxRouteDecisionSchema.parse({
      route: "park",
      nextStatus: "parked",
      reason:
        "The signal should be preserved, but the current evidence is too weak for a hard structured promotion.",
    });
  }

  return inboxRouteDecisionSchema.parse({
    route: "discard",
    nextStatus: "discarded",
    reason:
      "The signal is too weak to keep, and clarification would not improve the expected outcome enough.",
  });
}
