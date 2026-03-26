import {
  type InboxItemStatusInput,
  type InboxRouteDecision,
  type InboxRouteDecisionInputDraft,
  type InboxScoreBreakdown,
} from "@/features/inbox/schemas";
import {
  computeInboxRoutingScore,
  evaluateInboxRoutingPolicy,
  toInboxRouteDecision,
} from "@/features/inbox/routing-policy";

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
    "ready_for_review",
    "parked",
    "discarded",
    "failed_needs_review",
  ],
  clarification_requested: ["interpreted", "failed_needs_review"],
  promoted: [],
  ready_for_review: ["applied", "parked", "failed_needs_review"],
  parked: [],
  discarded: [],
  applied: [],
  failed_needs_review: [],
};

export const inboxTerminalStatuses: readonly InboxItemStatusInput[] = [
  "promoted",
  "ready_for_review",
  "parked",
  "discarded",
  "applied",
  "failed_needs_review",
];

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
  return computeInboxRoutingScore(breakdown);
}

export function decideInboxRoute(
  input: InboxRouteDecisionInputDraft
): InboxRouteDecision {
  return toInboxRouteDecision(
    evaluateInboxRoutingPolicy(input).requestedDecision
  );
}
