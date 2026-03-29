import { describe, expect, it } from "vitest";

import {
  assertInboxWorkflowCompleteness,
  getInboxStepCompletionStatus,
  inboxBaseWorkflowStepOrder,
  inboxClarificationWorkflowStepOrder,
  inboxRetryPolicy,
  inboxWorkerContracts,
  resolveInboxClarificationWorkflowPath,
  resolveInboxWorkflowPath,
} from "@/features/inbox/workflow";

describe("inbox workflow", () => {
  it("keeps the base workflow order stable", () => {
    expect(inboxBaseWorkflowStepOrder).toEqual([
      "ingest_item",
      "persist_raw",
      "normalize",
      "segment",
      "interpret",
      "score",
      "resolve",
      "route",
    ]);
  });

  it("defines a dedicated clarification rerun path", () => {
    expect(inboxClarificationWorkflowStepOrder).toEqual([
      "answer_clarification",
      "interpret",
      "score",
      "resolve",
      "route",
    ]);
    expect(resolveInboxClarificationWorkflowPath("park")).toEqual([
      "answer_clarification",
      "interpret",
      "score",
      "resolve",
      "route",
      "park",
      "emit_status",
    ]);
  });

  it("resolves route branches into a full workflow path", () => {
    expect(resolveInboxWorkflowPath("promote")).toEqual([
      "ingest_item",
      "persist_raw",
      "normalize",
      "segment",
      "interpret",
      "score",
      "resolve",
      "route",
      "promote",
      "emit_status",
    ]);
    expect(resolveInboxWorkflowPath("clarify").at(-2)).toBe("clarify");
  });

  it("exposes worker contracts and retry policy for orchestration", () => {
    expect(Object.keys(inboxWorkerContracts)).toEqual([
      "normalize",
      "segment",
      "interpret",
      "score",
      "resolve",
      "clarify",
    ]);
    expect(inboxWorkerContracts.interpret.promptVersion).toBe(
      "inbox-interpret.v1"
    );
    expect(inboxRetryPolicy.terminalStatus).toBe("failed_needs_review");
    expect(getInboxStepCompletionStatus("answer_clarification")).toBeNull();
    expect(getInboxStepCompletionStatus("promote")).toBe("ready_for_review");
    expect(assertInboxWorkflowCompleteness()).toBe(true);
  });
});
