import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";

import {
  classifyInboxExecutionFailure,
  runRecordedInboxStep,
} from "@/features/inbox/execution";

describe("inbox execution recorder", () => {
  it("writes started and completed telemetry with measured latency", async () => {
    const startStep = vi.fn(async () => "step-run-1");
    const finishStep = vi.fn(async () => undefined);
    const now = vi
      .fn<() => Date>()
      .mockReturnValueOnce(new Date("2026-03-22T12:00:00.000Z"))
      .mockReturnValueOnce(new Date("2026-03-22T12:00:00.125Z"));

    const result = await runRecordedInboxStep(
      {
        recorder: {
          startStep,
          finishStep,
        },
        attemptId: "11111111-1111-4111-8111-111111111111",
        stepName: "score",
        stepOrder: 5,
        inputHash: "input-hash",
        now,
      },
      async () => ({
        result: { ok: true },
        outputHash: "output-hash",
        metadata: {
          rInbox: 0.84,
        },
      })
    );

    expect(result).toEqual({ ok: true });
    expect(startStep).toHaveBeenCalledWith(
      expect.objectContaining({
        stepName: "score",
        status: "running",
        modelName: "pending-model-selection",
        promptVersion: "inbox-score.v1",
      })
    );
    expect(finishStep).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        outputHash: "output-hash",
        latencyMs: 125,
      })
    );
  });

  it("copies worker runtime metadata from the workflow contract", async () => {
    const startStep = vi.fn(async () => "step-run-2");
    const finishStep = vi.fn(async () => undefined);

    await runRecordedInboxStep(
      {
        recorder: {
          startStep,
          finishStep,
        },
        attemptId: "11111111-1111-4111-8111-111111111111",
        stepName: "interpret",
        stepOrder: 4,
      },
      async () => ({
        result: null,
      })
    );

    expect(startStep).toHaveBeenCalledWith(
      expect.objectContaining({
        stepName: "interpret",
        modelName: "pending-model-selection",
        promptVersion: "inbox-interpret.v1",
      })
    );
  });

  it("allows step runtimes to be overridden by the caller", async () => {
    const startStep = vi.fn(async () => "step-run-override");
    const finishStep = vi.fn(async () => undefined);

    await runRecordedInboxStep(
      {
        recorder: {
          startStep,
          finishStep,
        },
        attemptId: "11111111-1111-4111-8111-111111111111",
        stepName: "interpret",
        stepOrder: 4,
        runtimeOverride: {
          modelName: "gpt-5-mini",
          promptVersion: "inbox-interpret.openai.v1",
        },
      },
      async () => ({
        result: null,
      })
    );

    expect(startStep).toHaveBeenCalledWith(
      expect.objectContaining({
        stepName: "interpret",
        modelName: "gpt-5-mini",
        promptVersion: "inbox-interpret.openai.v1",
      })
    );
  });

  it("records route and reason on route-bound steps", async () => {
    const startStep = vi.fn(async () => "step-run-3");
    const finishStep = vi.fn(async () => undefined);
    const routingPolicy = {
      policyVersion: "inbox-routing.v1",
      input: {
        rInbox: 0.58,
        confidence: 0.62,
        ambiguity: 0.49,
        risk: 0.2,
        isDuplicate: false,
        isEmptySignal: false,
        hasReusableSignal: true,
        expectedValueGain: 0.8,
        askCost: 0.25,
        gates: {
          discard: false,
          promote: false,
          clarify: true,
          park: true,
        },
      },
      requestedDecision: {
        ruleId: "clarify.value_of_asking_exceeds_cost",
        route: "clarify",
        nextStatus: "clarification_requested",
        reason:
          "A single clarification is likely to change the routing outcome more than it costs the user.",
      },
      finalDecision: {
        ruleId: "override.clarification_cap_reached",
        route: "park",
        nextStatus: "parked",
        reason:
          "Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.",
      },
      overrides: [
        {
          ruleId: "override.clarification_cap_reached",
          fromRoute: "clarify",
          toRoute: "park",
          note: {
            id: "route.override.clarification_cap_reached",
            text:
              "Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.",
          },
        },
      ],
      decisionNotes: [
        {
          id: "route.clarify.value_of_asking_exceeds_cost",
          text:
            "A single clarification is likely to change the routing outcome more than it costs the user.",
        },
        {
          id: "route.override.clarification_cap_reached",
          text:
            "Clarification cap reached after one answered request, so the signal is preserved as parked instead of asking again.",
        },
      ],
    };

    await runRecordedInboxStep(
      {
        recorder: {
          startStep,
          finishStep,
        },
        attemptId: "11111111-1111-4111-8111-111111111111",
        stepName: "route",
        stepOrder: 7,
      },
      async () => ({
        result: null,
        route: "park",
        reason: "The signal is preserved for review.",
        metadata: {
          requestedRoute: "clarify",
          effectiveRoute: "park",
          routingPolicy,
        },
      })
    );

    expect(finishStep).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        route: "park",
        reason: "The signal is preserved for review.",
        metadata: expect.objectContaining({
          requestedRoute: "clarify",
          effectiveRoute: "park",
          routingPolicy: expect.objectContaining({
            policyVersion: "inbox-routing.v1",
          }),
        }),
      })
    );
  });

  it("marks failed steps with the classified failure reason", async () => {
    const startStep = vi.fn(async () => "step-run-4");
    const finishStep = vi.fn(async () => undefined);

    await expect(
      runRecordedInboxStep(
        {
          recorder: {
            startStep,
            finishStep,
          },
          attemptId: "11111111-1111-4111-8111-111111111111",
          stepName: "resolve",
          stepOrder: 6,
        },
        async () => {
          throw new Error("Boom");
        }
      )
    ).rejects.toThrow("Boom");

    expect(finishStep).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        failureCode: "pipeline",
        failureMessage: "Boom",
      })
    );
  });

  it("classifies zod validation failures explicitly", () => {
    const failure = classifyInboxExecutionFailure(
      new ZodError([
        {
          code: "custom",
          message: "Invalid payload.",
          path: ["rawText"],
        },
      ])
    );

    expect(failure).toEqual({
      code: "validation",
      message: "Invalid payload.",
    });
  });
});
