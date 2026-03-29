import { z } from "zod";

export const mapTransportTelemetryActions = {
  opsPublished: "map_transport.ops_published",
  opsReplayed: "map_transport.ops_replayed",
  gapRecovery: "map_transport.gap_recovery",
  snapshotFallback: "map_transport.snapshot_fallback",
  duplicateClientMutation: "map_transport.duplicate_client_mutation",
  transportResubscribe: "map_transport.transport_resubscribe",
} as const;

export type MapTransportTelemetryAction =
  (typeof mapTransportTelemetryActions)[keyof typeof mapTransportTelemetryActions];

const transportCounterSchema = z.number().int().min(0).max(1_000_000);

export const mapTransportReplayTriggerSchema = z.enum([
  "revision_event",
  "window_focus",
  "transport_resubscribe",
]);

export type MapTransportReplayTrigger = z.infer<
  typeof mapTransportReplayTriggerSchema
>;

export const mapTransportSnapshotFallbackReasonSchema = z.enum([
  "unsupported_op",
  "response_not_ok",
  "missing_sequence",
  "apply_failed",
  "network_error",
]);

export type MapTransportSnapshotFallbackReason = z.infer<
  typeof mapTransportSnapshotFallbackReasonSchema
>;

const opsReplayedEventSchema = z.object({
  action: z.literal(mapTransportTelemetryActions.opsReplayed),
  trigger: mapTransportReplayTriggerSchema,
  opCount: transportCounterSchema.min(1),
  fromSeq: transportCounterSchema,
  toSeq: transportCounterSchema,
});

const gapRecoveryEventSchema = z.object({
  action: z.literal(mapTransportTelemetryActions.gapRecovery),
  trigger: mapTransportReplayTriggerSchema.exclude(["revision_event"]),
  opCount: transportCounterSchema.min(1),
  fromSeq: transportCounterSchema.min(1),
  toSeq: transportCounterSchema,
});

const snapshotFallbackEventSchema = z.object({
  action: z.literal(mapTransportTelemetryActions.snapshotFallback),
  reason: mapTransportSnapshotFallbackReasonSchema,
  afterSeq: transportCounterSchema,
  opKind: z.string().trim().min(1).max(160).optional(),
});

const transportResubscribeEventSchema = z.object({
  action: z.literal(mapTransportTelemetryActions.transportResubscribe),
  afterSeq: transportCounterSchema,
});

export const mapTransportClientTelemetryEventSchema = z.discriminatedUnion(
  "action",
  [
    opsReplayedEventSchema,
    gapRecoveryEventSchema,
    snapshotFallbackEventSchema,
    transportResubscribeEventSchema,
  ]
);

export type MapTransportClientTelemetryEvent = z.infer<
  typeof mapTransportClientTelemetryEventSchema
>;
