import { describe, expect, it } from "vitest";

import {
  clarificationAnswerInputSchema,
  clarificationRequestDraftSchema,
  inboxFragmentCandidateSchema,
  ingestInboxItemInputSchema,
  structuredPacketDraftSchema,
} from "@/features/inbox/schemas";

describe("inbox schemas", () => {
  it("parses a valid ingest payload", () => {
    const parsed = ingestInboxItemInputSchema.parse({
      userId: "11111111-1111-4111-8111-111111111111",
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

  it("rejects an empty clarification answer body", () => {
    expect(() =>
      clarificationAnswerInputSchema.parse({
        answerText: "   ",
      })
    ).toThrow();
  });
});
