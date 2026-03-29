import type { RouteOutput } from "@/features/inbox/contracts";
import {
  inboxRouteDecisionInputSchema,
  inboxRoutingDecisionNoteSchema,
  inboxRoutingDecisionSchema,
  inboxRoutingPolicyTraceSchema,
  inboxScoreBreakdownSchema,
  type InboxItemStatusInput,
  type InboxRouteDecision,
  type InboxRouteDecisionInputDraft,
  type InboxRouteInput,
  type InboxRoutingDecision,
  type InboxRoutingDecisionNote,
  type InboxRoutingDecisionNoteId,
  type InboxRoutingPolicyTrace,
  type InboxRoutingRuleId,
  type InboxScoreBreakdown,
} from "@/features/inbox/schemas";

type InboxRoutingOverrideRuleId = Extract<InboxRoutingRuleId, `override.${string}`>;

type RoutingRuleDefinition = {
  route: InboxRouteInput;
  nextStatus: InboxItemStatusInput;
  reason: string;
  noteId: InboxRoutingDecisionNoteId;
  noteText: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export const inboxRoutingPolicyVersion = "inbox-routing.v1" as const;

export const inboxRoutingScoreWeights = {
  signalQuality: 0.24,
  interpretability: 0.22,
  structure: 0.16,
  grounding: 0.18,
  actionability: 0.1,
  utility: 0.1,
} as const;

export const inboxRoutingThresholds = {
  riskDiscardCeiling: 0.95,
  promoteMinScore: 0.72,
  promoteMaxAmbiguity: 0.25,
  promoteMinConfidence: 0.7,
  clarifyMinScore: 0.45,
  clarifyMaxScoreExclusive: 0.72,
  parkMinScore: 0.2,
  askCost: 0.32,
} as const;

const inboxRoutingRuleDefinitions = {
  "discard.empty_duplicate_or_risk_ceiling": {
    route: "discard",
    nextStatus: "discarded",
    reason:
      "The signal is empty, duplicate, or too risky to preserve as a structured packet.",
    noteId: "route.discard.empty_duplicate_or_risk_ceiling",
    noteText:
      "The signal is empty, duplicate, or too risky to preserve as a structured packet.",
  },
  "promote.strong_signal_low_ambiguity": {
    route: "promote",
    nextStatus: "ready_for_review",
    reason:
      "The signal is strong enough to emit a structured packet without forcing extra clarification.",
    noteId: "route.promote.strong_signal_low_ambiguity",
    noteText:
      "The signal is strong enough to emit a structured packet without forcing extra clarification.",
  },
  "clarify.value_of_asking_exceeds_cost": {
    route: "clarify",
    nextStatus: "clarification_requested",
    reason:
      "A single clarification is likely to change the routing outcome more than it costs the user.",
    noteId: "route.clarify.value_of_asking_exceeds_cost",
    noteText:
      "A single clarification is likely to change the routing outcome more than it costs the user.",
  },
  "park.reusable_signal_needs_review": {
    route: "park",
    nextStatus: "parked",
    reason:
      "The signal should be preserved, but the current evidence is too weak for a hard structured promotion.",
    noteId: "route.park.reusable_signal_needs_review",
    noteText:
      "The signal should be preserved, but the current evidence is too weak for a hard structured promotion.",
  },
  "discard.weak_signal_low_value": {
    route: "discard",
    nextStatus: "discarded",
    reason:
      "The signal is too weak to keep, and clarification would not improve the expected outcome enough.",
    noteId: "route.discard.weak_signal_low_value",
    noteText:
      "The signal is too weak to keep, and clarification would not improve the expected outcome enough.",
  },
  "override.clarification_cap_reached": {
    route: "park",
    nextStatus: "parked",
    reason:
      "Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.",
    noteId: "route.override.clarification_cap_reached",
    noteText:
      "Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.",
  },
  "override.promotion_scope_requires_target_map": {
    route: "park",
    nextStatus: "parked",
    reason:
      "The signal is preserved for review because a target map is required before promote materialization.",
    noteId: "route.override.promotion_scope_requires_target_map",
    noteText:
      "The signal is preserved for review because a target map is required before promote materialization.",
  },
  "override.promote_requires_deterministic_mutation": {
    route: "park",
    nextStatus: "parked",
    reason:
      "The packet is preserved for review because it does not compile into deterministic canonical mutations yet.",
    noteId: "route.override.promote_requires_deterministic_mutation",
    noteText:
      "The packet is preserved for review because it does not compile into deterministic canonical mutations yet.",
  },
} as const satisfies Record<InboxRoutingRuleId, RoutingRuleDefinition>;

function getInboxRoutingRuleDefinition(ruleId: InboxRoutingRuleId) {
  return inboxRoutingRuleDefinitions[ruleId];
}

function buildInboxRoutingDecisionNote(
  ruleId: InboxRoutingRuleId
): InboxRoutingDecisionNote {
  const definition = getInboxRoutingRuleDefinition(ruleId);

  return inboxRoutingDecisionNoteSchema.parse({
    id: definition.noteId,
    text: definition.noteText,
  });
}

function buildInboxRoutingDecision(ruleId: InboxRoutingRuleId): InboxRoutingDecision {
  const definition = getInboxRoutingRuleDefinition(ruleId);

  return inboxRoutingDecisionSchema.parse({
    ruleId,
    route: definition.route,
    nextStatus: definition.nextStatus,
    reason: definition.reason,
  });
}

function dedupeDecisionNotes(notes: InboxRoutingDecisionNote[]) {
  const noteMap = new Map(notes.map((note) => [note.id, note]));
  return [...noteMap.values()];
}

function normalizeStructuredPacketForRoute(
  packet: RouteOutput["structuredPacket"],
  route: InboxRouteInput
) {
  if (!packet) {
    return null;
  }

  switch (route) {
    case "promote":
      return {
        ...packet,
        route: "promote" as const,
        status: "ready" as const,
      };
    case "clarify":
      return {
        ...packet,
        packetType: "clarification_packet" as const,
        route: "clarify" as const,
        status: "draft" as const,
      };
    case "park":
      return {
        ...packet,
        packetType: "parked_packet" as const,
        route: "park" as const,
        status: "draft" as const,
      };
    case "discard":
      return null;
  }
}

export function computeInboxRoutingScore(breakdown: InboxScoreBreakdown) {
  const parsed = inboxScoreBreakdownSchema.parse(breakdown);

  const rawScore =
    Math.pow(parsed.signalQuality, inboxRoutingScoreWeights.signalQuality) *
    Math.pow(parsed.interpretability, inboxRoutingScoreWeights.interpretability) *
    Math.pow(parsed.structure, inboxRoutingScoreWeights.structure) *
    Math.pow(parsed.grounding, inboxRoutingScoreWeights.grounding) *
    Math.pow(parsed.actionability, inboxRoutingScoreWeights.actionability) *
    Math.pow(parsed.utility, inboxRoutingScoreWeights.utility) *
    (1 - parsed.penalty);

  return clamp01(rawScore);
}

export function evaluateInboxRoutingPolicy(input: InboxRouteDecisionInputDraft) {
  const parsed = inboxRouteDecisionInputSchema.parse(input);
  const gates = {
    discard:
      parsed.isEmptySignal ||
      parsed.isDuplicate ||
      parsed.risk >= inboxRoutingThresholds.riskDiscardCeiling,
    promote:
      parsed.rInbox >= inboxRoutingThresholds.promoteMinScore &&
      parsed.ambiguity <= inboxRoutingThresholds.promoteMaxAmbiguity &&
      parsed.confidence >= inboxRoutingThresholds.promoteMinConfidence,
    clarify:
      parsed.rInbox >= inboxRoutingThresholds.clarifyMinScore &&
      parsed.rInbox < inboxRoutingThresholds.clarifyMaxScoreExclusive &&
      parsed.expectedValueGain > parsed.askCost,
    park:
      parsed.hasReusableSignal || parsed.rInbox >= inboxRoutingThresholds.parkMinScore,
  } as const;

  const requestedRuleId: InboxRoutingRuleId = gates.discard
    ? "discard.empty_duplicate_or_risk_ceiling"
    : gates.promote
      ? "promote.strong_signal_low_ambiguity"
      : gates.clarify
        ? "clarify.value_of_asking_exceeds_cost"
        : gates.park
          ? "park.reusable_signal_needs_review"
          : "discard.weak_signal_low_value";

  const requestedDecision = buildInboxRoutingDecision(requestedRuleId);
  const decisionNotes = [buildInboxRoutingDecisionNote(requestedRuleId)];
  const trace = inboxRoutingPolicyTraceSchema.parse({
    policyVersion: inboxRoutingPolicyVersion,
    input: {
      ...parsed,
      gates,
    },
    requestedDecision,
    finalDecision: requestedDecision,
    overrides: [],
    decisionNotes,
  });

  return {
    requestedDecision,
    finalDecision: requestedDecision,
    trace,
  };
}

export function applyInboxRoutingOverride(
  trace: InboxRoutingPolicyTrace,
  ruleId: InboxRoutingOverrideRuleId
) {
  const parsedTrace = inboxRoutingPolicyTraceSchema.parse(trace);
  const nextDecision = buildInboxRoutingDecision(ruleId);
  const nextNote = buildInboxRoutingDecisionNote(ruleId);

  return inboxRoutingPolicyTraceSchema.parse({
    ...parsedTrace,
    finalDecision: nextDecision,
    overrides: [
      ...parsedTrace.overrides,
      {
        ruleId,
        fromRoute: parsedTrace.finalDecision.route,
        toRoute: nextDecision.route,
        note: nextNote,
      },
    ],
    decisionNotes: dedupeDecisionNotes([...parsedTrace.decisionNotes, nextNote]),
  });
}

export function toInboxRouteDecision(
  decision: InboxRoutingDecision
): InboxRouteDecision {
  return {
    route: decision.route,
    nextStatus: decision.nextStatus,
    reason: decision.reason,
  };
}

export function applyInboxRoutingPolicyTraceToRouteOutput(
  route: RouteOutput,
  routingPolicy: InboxRoutingPolicyTrace
): RouteOutput {
  const parsedTrace = inboxRoutingPolicyTraceSchema.parse(routingPolicy);
  const finalRoute = parsedTrace.finalDecision.route;

  return {
    ...route,
    route: finalRoute,
    nextStatus: parsedTrace.finalDecision.nextStatus,
    reason: parsedTrace.finalDecision.reason,
    structuredPacket: normalizeStructuredPacketForRoute(
      route.structuredPacket,
      finalRoute
    ),
    clarificationDraft:
      finalRoute === "clarify" ? route.clarificationDraft ?? null : null,
    routingPolicy: parsedTrace,
  };
}

export function deriveInboxRoutingCompatibility(
  routingPolicy: InboxRoutingPolicyTrace
) {
  const parsedTrace = inboxRoutingPolicyTraceSchema.parse(routingPolicy);
  const latestOverride = parsedTrace.overrides.at(-1) ?? null;

  return {
    requestedRoute: parsedTrace.requestedDecision.route,
    effectiveRoute: parsedTrace.finalDecision.route,
    route: parsedTrace.finalDecision.route,
    reason: parsedTrace.finalDecision.reason,
    overrideReason: latestOverride?.note.text ?? null,
  };
}
