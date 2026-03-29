import { ZodError } from "zod";

import { inboxWorkerContracts } from "@/features/inbox/workflow";
import type {
  InboxExecutionFailureCodeInput,
  InboxPipelineRunStatusInput,
  InboxRouteInput,
  InboxWorkflowStepName,
} from "@/features/inbox/schemas";

type StepRuntimeInfo = {
  modelName: string | null;
  promptVersion: string | null;
};

type StepStartInput = {
  attemptId: string;
  stepName: InboxWorkflowStepName;
  stepOrder: number;
  runNo: number;
  status: InboxPipelineRunStatusInput;
  modelName: string | null;
  promptVersion: string | null;
  inputHash: string | null;
  route: InboxRouteInput | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  startedAt: Date;
};

type StepFinishInput = {
  stepRunId: string;
  status: InboxPipelineRunStatusInput;
  outputHash: string | null;
  route: InboxRouteInput | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  finishedAt: Date;
  latencyMs: number;
  failureCode: InboxExecutionFailureCodeInput | null;
  failureMessage: string | null;
};

export type InboxStepRecorder = {
  startStep(input: StepStartInput): Promise<string>;
  finishStep(input: StepFinishInput): Promise<void>;
};

export type RecordedStepResult<T> = {
  result: T;
  outputHash?: string | null;
  route?: InboxRouteInput | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export type RunRecordedInboxStepInput = {
  recorder: InboxStepRecorder;
  attemptId: string;
  stepName: InboxWorkflowStepName;
  stepOrder: number;
  runNo?: number;
  inputHash?: string | null;
  route?: InboxRouteInput | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  runtimeOverride?: StepRuntimeInfo;
  now?: () => Date;
};

const workerRuntimeByStep: Partial<Record<InboxWorkflowStepName, StepRuntimeInfo>> = {
  normalize: inboxWorkerContracts.normalize,
  segment: inboxWorkerContracts.segment,
  interpret: inboxWorkerContracts.interpret,
  score: inboxWorkerContracts.score,
  resolve: inboxWorkerContracts.resolve,
  clarify: inboxWorkerContracts.clarify,
};

const inboxExecutionStepOrder: Record<InboxWorkflowStepName, number> = {
  ingest_item: 0,
  persist_raw: 1,
  normalize: 2,
  segment: 3,
  answer_clarification: 0,
  interpret: 4,
  score: 5,
  resolve: 6,
  route: 7,
  promote: 8,
  clarify: 8,
  park: 8,
  discard: 8,
  emit_status: 9,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown inbox execution error.";
}

export function getInboxExecutionStepOrder(stepName: InboxWorkflowStepName) {
  return inboxExecutionStepOrder[stepName];
}

export function getInboxExecutionStepRuntime(
  stepName: InboxWorkflowStepName
): StepRuntimeInfo {
  const runtime = workerRuntimeByStep[stepName];
  return {
    modelName: runtime?.modelName ?? null,
    promptVersion: runtime?.promptVersion ?? null,
  };
}

export function classifyInboxExecutionFailure(
  error: unknown
): {
  code: InboxExecutionFailureCodeInput;
  message: string;
} {
  if (error instanceof ZodError) {
    return {
      code: "validation",
      message: error.issues[0]?.message ?? toFailureMessage(error),
    };
  }

  if (
    isRecord(error) &&
    error.name === "InboxCommandError" &&
    typeof error.statusCode === "number"
  ) {
    if (error.statusCode === 409) {
      return {
        code: "conflict",
        message: toFailureMessage(error),
      };
    }

    if (error.statusCode >= 400 && error.statusCode < 500) {
      return {
        code: "validation",
        message: toFailureMessage(error),
      };
    }
  }

  if (
    isRecord(error) &&
    typeof error.code === "string" &&
    (error.name === "PostgresError" ||
      Object.prototype.hasOwnProperty.call(error, "severity"))
  ) {
    return {
      code: "persistence",
      message: toFailureMessage(error),
    };
  }

  if (error instanceof Error) {
    return {
      code: "pipeline",
      message: toFailureMessage(error),
    };
  }

  return {
    code: "unknown",
    message: toFailureMessage(error),
  };
}

export function measureInboxStepLatencyMs(startedAt: Date, finishedAt: Date) {
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}

export async function runRecordedInboxStep<T>(
  input: RunRecordedInboxStepInput,
  work: () => Promise<RecordedStepResult<T>>
) {
  const now = input.now ?? (() => new Date());
  const runtime = input.runtimeOverride ?? getInboxExecutionStepRuntime(input.stepName);
  const startedAt = now();
  const stepRunId = await input.recorder.startStep({
    attemptId: input.attemptId,
    stepName: input.stepName,
    stepOrder: input.stepOrder,
    runNo: input.runNo ?? 1,
    status: "running",
    modelName: runtime.modelName,
    promptVersion: runtime.promptVersion,
    inputHash: input.inputHash ?? null,
    route: input.route ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
    startedAt,
  });

  try {
    const result = await work();
    const finishedAt = now();

    await input.recorder.finishStep({
      stepRunId,
      status: "completed",
      outputHash: result.outputHash ?? null,
      route: result.route ?? input.route ?? null,
      reason: result.reason ?? input.reason ?? null,
      metadata: result.metadata ?? input.metadata ?? {},
      finishedAt,
      latencyMs: measureInboxStepLatencyMs(startedAt, finishedAt),
      failureCode: null,
      failureMessage: null,
    });

    return result.result;
  } catch (error) {
    const failure = classifyInboxExecutionFailure(error);
    const finishedAt = now();

    await input.recorder.finishStep({
      stepRunId,
      status: "failed",
      outputHash: null,
      route: input.route ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
      finishedAt,
      latencyMs: measureInboxStepLatencyMs(startedAt, finishedAt),
      failureCode: failure.code,
      failureMessage: failure.message,
    });

    throw error;
  }
}
