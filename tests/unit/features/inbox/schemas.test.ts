import { describe, expect, it } from "vitest";

import {
  clarificationAnswerInputSchema,
  clarificationRequestDraftSchema,
  inboxFragmentCandidateSchema,
  inboxRoutingPolicyTraceSchema,
  inboxStructuredPacketMetadataSchema,
  ingestInboxItemInputSchema,
  structuredPacketDraftSchema,
} from "@/features/inbox/schemas";

describe("inbox schemas", () => {
  it("parses a valid ingest payload", () => {
    const parsed = ingestInboxItemInputSchema.parse({
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      mapId: "33333333-3333-4333-8333-333333333333",
      sourceType: "transcript",
      rawText: "When the topic shifts to criticism, the person shuts down.",
      idempotencyKey: "inbox-raw-12345678",
    });

    expect(parsed.sourceType).toBe("transcript");
    expect(parsed.rawText).toContain("shuts down");
  });

  it("rejects an invalid fragment span", () => {
    expect(() =>
      inboxFragmentCandidateSchema.parse({
        ordinal: 0,
        fragmentText: "This fragment is malformed.",
        span: {
          start: 12,
          end: 8,
        },
      })
    ).toThrow("Fragment span end must be greater than start");
  });

  it("parses structured packets and clarification drafts", () => {
    const packet = structuredPacketDraftSchema.parse({
      packetType: "mixed_packet",
      summary: "Potential Concept and Link candidates were extracted.",
      payload: {
        entities: [],
        relations: [],
        intents: [],
        questions: [],
        constraints: [],
        clarificationContext: [],
        applyContract: {
          contractVersion: "inbox-apply-contract.v1",
          operations: [
            {
              operationType: "park_for_review",
              reason: "Needs review before canonical apply.",
              evidenceFragmentOrdinals: [],
              payload: {},
            },
          ],
          warnings: [],
        },
      },
      route: "promote",
      status: "ready",
    });
    const clarification = clarificationRequestDraftSchema.parse({
      question: "Who is the criticism coming from in this situation?",
      reason: "The source changes whether the signal should be promoted or parked.",
    });

    expect(packet.status).toBe("ready");
    expect(clarification.status).toBe("pending");
  });

  it("parses routing policy traces and packet metadata", () => {
    const routingPolicy = inboxRoutingPolicyTraceSchema.parse({
      policyVersion: "inbox-routing.v1",
      input: {
        rInbox: 0.81,
        confidence: 0.78,
        ambiguity: 0.18,
        risk: 0.12,
        isDuplicate: false,
        isEmptySignal: false,
        hasReusableSignal: true,
        expectedValueGain: 0.22,
        askCost: 0.32,
        gates: {
          discard: false,
          promote: true,
          clarify: false,
          park: true,
        },
      },
      requestedDecision: {
        ruleId: "promote.strong_signal_low_ambiguity",
        route: "promote",
        nextStatus: "ready_for_review",
        reason:
          "The signal is strong enough to emit a structured packet without forcing extra clarification.",
      },
      finalDecision: {
        ruleId: "override.promotion_scope_requires_target_map",
        route: "park",
        nextStatus: "parked",
        reason:
          "The signal is preserved for review because a target map is required before promote materialization.",
      },
      overrides: [
        {
          ruleId: "override.promotion_scope_requires_target_map",
          fromRoute: "promote",
          toRoute: "park",
          note: {
            id: "route.override.promotion_scope_requires_target_map",
            text:
              "The signal is preserved for review because a target map is required before promote materialization.",
          },
        },
      ],
      decisionNotes: [
        {
          id: "route.promote.strong_signal_low_ambiguity",
          text:
            "The signal is strong enough to emit a structured packet without forcing extra clarification.",
        },
        {
          id: "route.override.promotion_scope_requires_target_map",
          text:
            "The signal is preserved for review because a target map is required before promote materialization.",
        },
      ],
    });
    const metadata = inboxStructuredPacketMetadataSchema.parse({
      routingPolicy,
    });

    expect(routingPolicy.finalDecision.ruleId).toBe(
      "override.promotion_scope_requires_target_map"
    );
    expect(metadata.routingPolicy?.decisionNotes).toHaveLength(2);
  });

  it("rejects an empty clarification answer body", () => {
    expect(() =>
      clarificationAnswerInputSchema.parse({
        answerText: "   ",
      })
    ).toThrow();
  });
});
