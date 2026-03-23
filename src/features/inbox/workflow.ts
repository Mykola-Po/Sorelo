import { z } from "zod";

import {
  answerClarificationInputSchema,
  answerClarificationOutputSchema,
  clarifierInputSchema,
  clarifierOutputSchema,
  discardInputSchema,
  discardOutputSchema,
  emitStatusInputSchema,
  emitStatusOutputSchema,
  interpretInputSchema,
  interpretOutputSchema,
  normalizerInputSchema,
  normalizerOutputSchema,
  parkInputSchema,
  parkOutputSchema,
  persistRawInputSchema,
  persistRawOutputSchema,
  promoteInputSchema,
  promoteOutputSchema,
  resolveInputSchema,
  resolveOutputSchema,
  routeInputSchema,
  routeOutputSchema,
  scoreInputSchema,
  scoreOutputSchema,
  segmenterInputSchema,
  segmenterOutputSchema,
  type InboxWorkerStep,
} from "@/features/inbox/contracts";
import {
  ingestInboxItemInputSchema,
  inboxItemStatusSchema,
  inboxRouteSchema,
  type InboxItemStatusInput,
  type InboxRouteInput,
  type InboxWorkflowStepName,
} from "@/features/inbox/schemas";

const uuidSchema = z.string().uuid();

const inboxStepAcceptedSchema = z.object({
  itemId: uuidSchema,
  acceptedAt: z.coerce.date(),
});

type WorkflowSchema = z.ZodTypeAny;

type InboxWorkflowContractDefinition = {
  stepName: InboxWorkflowStepName;
  inputSchema: WorkflowSchema;
  outputSchema: WorkflowSchema;
  completionStatus: InboxItemStatusInput | null;
};

type InboxWorkerContractDefinition = InboxWorkflowContractDefinition & {
  stepName: InboxWorkerStep;
  modelName: string;
  promptVersion: string;
  temperature: number;
  safetyFlags: readonly string[];
};

const defaultWorkerRuntime = {
  modelName: "pending-model-selection",
  temperature: 0,
  safetyFlags: [
    "json_only",
    "schema_validated",
    "no_unbounded_text_output",
  ] as const,
};

export const inboxRetryPolicy = {
  immediateRetries: 3,
  delayedRetries: 1,
  terminalStatus: "failed_needs_review",
} as const;

export const inboxBaseWorkflowStepOrder = [
  "ingest_item",
  "persist_raw",
  "normalize",
  "segment",
  "interpret",
  "score",
  "resolve",
  "route",
] as const satisfies readonly InboxWorkflowStepName[];

export const inboxClarificationWorkflowStepOrder = [
  "answer_clarification",
  "interpret",
  "score",
  "resolve",
  "route",
] as const satisfies readonly InboxWorkflowStepName[];

export const inboxTerminalWorkflowBranches = {
  promote: ["promote", "emit_status"],
  clarify: ["clarify", "emit_status"],
  park: ["park", "emit_status"],
  discard: ["discard", "emit_status"],
} as const satisfies Record<InboxRouteInput, readonly InboxWorkflowStepName[]>;

export const inboxWorkflowStatusByStep = {
  ingest_item: "received",
  persist_raw: "persisted",
  normalize: "normalized",
  segment: "segmented",
  answer_clarification: null,
  interpret: "interpreted",
  score: "scored",
  resolve: "resolved",
  route: "resolved",
  promote: "ready_for_review",
  clarify: "clarification_requested",
  park: "parked",
  discard: "discarded",
  emit_status: null,
} as const satisfies Record<InboxWorkflowStepName, InboxItemStatusInput | null>;

export const inboxStepContracts = {
  ingest_item: {
    stepName: "ingest_item",
    inputSchema: ingestInboxItemInputSchema,
    outputSchema: inboxStepAcceptedSchema,
    completionStatus: "received",
  },
  persist_raw: {
    stepName: "persist_raw",
    inputSchema: persistRawInputSchema,
    outputSchema: persistRawOutputSchema,
    completionStatus: "persisted",
  },
  normalize: {
    stepName: "normalize",
    inputSchema: normalizerInputSchema,
    outputSchema: normalizerOutputSchema,
    completionStatus: "normalized",
  },
  segment: {
    stepName: "segment",
    inputSchema: segmenterInputSchema,
    outputSchema: segmenterOutputSchema,
    completionStatus: "segmented",
  },
  answer_clarification: {
    stepName: "answer_clarification",
    inputSchema: answerClarificationInputSchema,
    outputSchema: answerClarificationOutputSchema,
    completionStatus: null,
  },
  interpret: {
    stepName: "interpret",
    inputSchema: interpretInputSchema,
    outputSchema: interpretOutputSchema,
    completionStatus: "interpreted",
  },
  score: {
    stepName: "score",
    inputSchema: scoreInputSchema,
    outputSchema: scoreOutputSchema,
    completionStatus: "scored",
  },
  resolve: {
    stepName: "resolve",
    inputSchema: resolveInputSchema,
    outputSchema: resolveOutputSchema,
    completionStatus: "resolved",
  },
  route: {
    stepName: "route",
    inputSchema: routeInputSchema,
    outputSchema: routeOutputSchema,
    completionStatus: "resolved",
  },
  promote: {
    stepName: "promote",
    inputSchema: promoteInputSchema,
    outputSchema: promoteOutputSchema,
    completionStatus: "ready_for_review",
  },
  clarify: {
    stepName: "clarify",
    inputSchema: clarifierInputSchema,
    outputSchema: clarifierOutputSchema,
    completionStatus: "clarification_requested",
  },
  park: {
    stepName: "park",
    inputSchema: parkInputSchema,
    outputSchema: parkOutputSchema,
    completionStatus: "parked",
  },
  discard: {
    stepName: "discard",
    inputSchema: discardInputSchema,
    outputSchema: discardOutputSchema,
    completionStatus: "discarded",
  },
  emit_status: {
    stepName: "emit_status",
    inputSchema: emitStatusInputSchema,
    outputSchema: emitStatusOutputSchema,
    completionStatus: null,
  },
} as const satisfies Record<
  InboxWorkflowStepName,
  InboxWorkflowContractDefinition
>;

export const inboxWorkerContracts = {
  normalize: {
    ...inboxStepContracts.normalize,
    ...defaultWorkerRuntime,
    promptVersion: "inbox-normalize.v1",
  },
  segment: {
    ...inboxStepContracts.segment,
    ...defaultWorkerRuntime,
    promptVersion: "inbox-segment.v1",
  },
  interpret: {
    ...inboxStepContracts.interpret,
    ...defaultWorkerRuntime,
    temperature: 0.1,
    promptVersion: "inbox-interpret.v1",
  },
  score: {
    ...inboxStepContracts.score,
    ...defaultWorkerRuntime,
    promptVersion: "inbox-score.v1",
  },
  resolve: {
    ...inboxStepContracts.resolve,
    ...defaultWorkerRuntime,
    promptVersion: "inbox-resolve.v1",
  },
  clarify: {
    ...inboxStepContracts.clarify,
    ...defaultWorkerRuntime,
    temperature: 0.1,
    promptVersion: "inbox-clarify.v1",
  },
} as const satisfies Record<InboxWorkerStep, InboxWorkerContractDefinition>;

export function resolveInboxWorkflowPath(route: InboxRouteInput) {
  inboxRouteSchema.parse(route);

  return [
    ...inboxBaseWorkflowStepOrder,
    ...inboxTerminalWorkflowBranches[route],
  ];
}

export function resolveInboxClarificationWorkflowPath(route: InboxRouteInput) {
  inboxRouteSchema.parse(route);

  return [
    ...inboxClarificationWorkflowStepOrder,
    ...inboxTerminalWorkflowBranches[route],
  ];
}

export function getInboxStepCompletionStatus(stepName: InboxWorkflowStepName) {
  return inboxWorkflowStatusByStep[stepName];
}

export function assertInboxWorkflowCompleteness() {
  for (const status of Object.values(inboxWorkflowStatusByStep)) {
    if (status) {
      inboxItemStatusSchema.parse(status);
    }
  }

  return true;
}
