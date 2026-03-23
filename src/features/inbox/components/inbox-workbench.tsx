import Link from "next/link";
import {
  Card,
  Flex,
  Heading,
  ScrollArea,
  Text,
} from "@radix-ui/themes";

import { InboxClarificationAnswerForm } from "@/features/inbox/components/inbox-clarification-answer-form";
import { InboxWorkbenchComposer } from "@/features/inbox/components/inbox-workbench-composer";
import { InboxWorkbenchProcessForm } from "@/features/inbox/components/inbox-workbench-process-form";
import { inboxRoutingPolicyTraceSchema } from "@/features/inbox/schemas";
import type { MapSummary } from "@/features/maps/types";
import type {
  InboxItemDetailRecord,
  InboxItemRecord,
  InboxRoutingPolicyTraceRecord,
} from "@/features/inbox/types";
import { workspaceInboxPath } from "@/shared/config/routes";
import { DataTable } from "@/shared/ui/components/data-table";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { PageHeader } from "@/shared/ui/components/page-header";
import { SectionCard } from "@/shared/ui/components/section-card";
import { StatusBadge } from "@/shared/ui/components/status-badge";

type InboxWorkbenchProps = {
  workspaceSlug: string;
  workspaceName: string;
  availableMaps: MapSummary[];
  items: InboxItemRecord[];
  selectedItemId?: string;
  selectionError?: string | null;
  detail: InboxItemDetailRecord | null;
};

const actionableStatuses = new Set([
  "received",
  "persisted",
  "normalized",
  "segmented",
  "interpreted",
  "scored",
  "resolved",
  "failed_needs_review",
]);

function formatTimestamp(date: Date | null) {
  if (!date) {
    return "Not available";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(text: string, max = 120) {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 3)}...`;
}

function formatJson(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRoutingPolicyTrace(value: unknown): InboxRoutingPolicyTraceRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = "routingPolicy" in value ? value.routingPolicy : value;
  const parsed = inboxRoutingPolicyTraceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function getRoutingCompatibility(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const requestedRoute =
    typeof value.requestedRoute === "string" ? value.requestedRoute : null;
  const effectiveRoute =
    typeof value.effectiveRoute === "string"
      ? value.effectiveRoute
      : typeof value.route === "string"
        ? value.route
        : null;
  const reason = typeof value.reason === "string" ? value.reason : null;
  const overrideReason =
    typeof value.overrideReason === "string" ? value.overrideReason : null;

  if (!requestedRoute && !effectiveRoute && !reason && !overrideReason) {
    return null;
  }

  return {
    requestedRoute,
    effectiveRoute,
    reason,
    overrideReason,
  };
}

function renderRoutingPolicySummary(
  trace: InboxRoutingPolicyTraceRecord | null,
  label = "Routing policy",
  noteSize: "1" | "2" = "2"
) {
  if (!trace) {
    return null;
  }

  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray">
        {label}
      </Text>
      <Text size="1" className="sl-inbox-mono">
        {trace.policyVersion}
      </Text>
      {trace.decisionNotes.map((note) => (
        <Text key={note.id} size={noteSize}>
          {note.text}
        </Text>
      ))}
    </Flex>
  );
}

function humanizeToken(value: string) {
  return value.replaceAll("_", " ");
}

function formatReviewArtifactLabel(value: string) {
  return humanizeToken(value);
}

function formatLatency(latencyMs: number | null) {
  if (latencyMs === null) {
    return "Not recorded";
  }

  if (latencyMs < 1000) {
    return `${latencyMs} ms`;
  }

  return `${(latencyMs / 1000).toFixed(2)} s`;
}

function formatFailureReason(input: {
  failureCode: string | null;
  failureMessage: string | null;
}) {
  if (!input.failureCode && !input.failureMessage) {
    return "Not recorded";
  }

  if (input.failureCode && input.failureMessage) {
    return `${humanizeToken(input.failureCode)}: ${input.failureMessage}`;
  }

  return input.failureMessage ?? humanizeToken(input.failureCode ?? "unknown");
}

function getProcessActionLabel(status: InboxItemRecord["status"]) {
  if (status === "failed_needs_review") {
    return "Retry processing";
  }

  return "Process item";
}

function renderSelectionState(selectionError?: string | null) {
  if (selectionError) {
    return (
      <SectionCard
        title="Item detail"
        description="The selected Inbox item could not be loaded."
      >
        <EmptyState
          title="Inbox item unavailable"
          description={selectionError}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Item detail"
      description="Select an Inbox item from the list to inspect its derived state."
    >
      <EmptyState
        title="No item selected"
        description="Choose an Inbox item from the list or create a new one from the composer."
      />
    </SectionCard>
  );
}

function renderDetailPanels(
  detail: InboxItemDetailRecord,
  workspaceSlug: string
) {
  const selectedItem = detail.item;
  const rawFragments = detail.fragments.filter(
    (fragment) => fragment.sourceKind === "item_raw"
  );
  const clarificationFragments = detail.fragments.filter(
    (fragment) => fragment.sourceKind === "clarification_answer"
  );
  const pendingClarification =
    detail.clarificationRequests.find((request) => request.status === "pending") ??
    null;
  const clarificationAnswerByRequestId = new Map(
    detail.clarificationAnswers.map((answer) => [answer.requestId, answer])
  );
  const reviewBatchByPacketId = new Map(
    detail.reviewBatches
      .filter((batch) => batch.inboxPacketId)
      .map((batch) => [batch.inboxPacketId as string, batch])
  );
  const canProcess = actionableStatuses.has(selectedItem.status);

  return (
    <>
      <SectionCard
        title="Item detail"
        description="Inspect the current status, raw evidence, and processing state for the selected item."
        action={
          canProcess ? (
            <InboxWorkbenchProcessForm
              workspaceSlug={workspaceSlug}
              itemId={selectedItem.id}
              label={getProcessActionLabel(selectedItem.status)}
            />
          ) : undefined
        }
      >
        <div className="sl-inbox-detail-meta-grid">
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              Item ID
            </Text>
            <Text size="2" weight="medium" className="sl-inbox-mono">
              {selectedItem.id}
            </Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              Status
            </Text>
            <Flex gap="2" wrap="wrap">
              <StatusBadge status={selectedItem.status} />
              {selectedItem.route ? (
                <StatusBadge
                  status={selectedItem.route}
                  label={selectedItem.route}
                />
              ) : null}
            </Flex>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              Source
            </Text>
            <Text size="2">{selectedItem.sourceType}</Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              Created
            </Text>
            <Text size="2">{formatTimestamp(selectedItem.createdAt)}</Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              Updated
            </Text>
            <Text size="2">{formatTimestamp(selectedItem.updatedAt)}</Text>
          </div>
        </div>

        <div className="sl-inbox-text-grid">
          <div className="sl-inbox-text-block">
            <Text size="1" color="gray">
              Raw text
            </Text>
            <pre className="sl-inbox-pre sl-inbox-plain-pre">
              {selectedItem.rawText}
            </pre>
          </div>
          <div className="sl-inbox-text-block">
            <Text size="1" color="gray">
              Normalized text
            </Text>
            <pre className="sl-inbox-pre sl-inbox-plain-pre">
              {selectedItem.normalizedText ?? "Not produced yet."}
            </pre>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Fragments"
        description="Fragments are grouped by provenance so raw evidence stays separate from clarification answers."
      >
        {detail.fragments.length === 0 ? (
          <EmptyState
            title="No fragments yet"
            description="Fragments appear after the item has been segmented or rerun with clarification context."
          />
        ) : (
          <div className="sl-inbox-fragment-groups">
            <div className="sl-inbox-fragment-group">
              <Flex align="center" gap="2" wrap="wrap">
                <Heading as="h3" size="3">
                  Raw item fragments
                </Heading>
                <StatusBadge status="manual_note" label={`${rawFragments.length}`} />
              </Flex>
              {rawFragments.length === 0 ? (
                <Text size="2" color="gray">
                  No raw fragments were stored yet.
                </Text>
              ) : (
                <div className="sl-inbox-fragment-list">
                  {rawFragments.map((fragment) => (
                    <Card
                      key={fragment.id}
                      className="sl-inbox-fragment-card"
                      variant="surface"
                    >
                      <Flex direction="column" gap="2">
                        <Flex align="center" justify="between" gap="2" wrap="wrap">
                          <Flex gap="2" wrap="wrap">
                            <StatusBadge
                              status={fragment.sourceKind}
                              label={fragment.sourceKind}
                            />
                            {fragment.fragmentType ? (
                              <StatusBadge
                                status={fragment.fragmentType}
                                label={fragment.fragmentType}
                              />
                            ) : null}
                          </Flex>
                          <Text size="1" color="gray">
                            #{fragment.ordinal}
                          </Text>
                        </Flex>
                        <Text size="2">{fragment.fragmentText}</Text>
                      </Flex>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="sl-inbox-fragment-group">
              <Flex align="center" gap="2" wrap="wrap">
                <Heading as="h3" size="3">
                  Clarification answer fragments
                </Heading>
                <StatusBadge
                  status="clarification_answer"
                  label={`${clarificationFragments.length}`}
                />
              </Flex>
              {clarificationFragments.length === 0 ? (
                <Text size="2" color="gray">
                  No clarification-derived fragments were stored for this item.
                </Text>
              ) : (
                <div className="sl-inbox-fragment-list">
                  {clarificationFragments.map((fragment) => (
                    <Card
                      key={fragment.id}
                      className="sl-inbox-fragment-card"
                      variant="surface"
                    >
                      <Flex direction="column" gap="2">
                        <Flex align="center" justify="between" gap="2" wrap="wrap">
                          <Flex gap="2" wrap="wrap">
                            <StatusBadge
                              status={fragment.sourceKind}
                              label={fragment.sourceKind}
                            />
                            {fragment.fragmentType ? (
                              <StatusBadge
                                status={fragment.fragmentType}
                                label={fragment.fragmentType}
                              />
                            ) : null}
                          </Flex>
                          <Text size="1" color="gray">
                            #{fragment.ordinal}
                          </Text>
                        </Flex>
                        <Text size="2">{fragment.fragmentText}</Text>
                        {fragment.clarificationAnswerId ? (
                          <Text size="1" color="gray" className="sl-inbox-mono">
                            answer {fragment.clarificationAnswerId}
                          </Text>
                        ) : null}
                      </Flex>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Hypotheses and atoms"
        description="Review the current interpreted structure before any canonical handoff exists."
      >
        <div className="sl-inbox-analysis-grid">
          <div className="sl-inbox-analysis-column">
            <Heading as="h3" size="3">
              Hypotheses
            </Heading>
            {detail.hypotheses.length === 0 ? (
              <Text size="2" color="gray">
                No hypotheses have been produced yet.
              </Text>
            ) : (
              <div className="sl-inbox-analysis-list">
                {detail.hypotheses.map((hypothesis) => (
                  <Card
                    key={hypothesis.id}
                    variant="surface"
                    className="sl-inbox-analysis-card"
                  >
                    <Flex direction="column" gap="2">
                      <Flex align="center" justify="between" gap="2" wrap="wrap">
                        <Flex gap="2" wrap="wrap">
                          <StatusBadge
                            status={hypothesis.hypothesisType}
                            label={hypothesis.hypothesisType}
                          />
                          <Text size="1" color="gray">
                            rank {hypothesis.rank}
                          </Text>
                        </Flex>
                        <Text size="1" color="gray">
                          confidence {hypothesis.confidence.toFixed(2)}
                        </Text>
                      </Flex>
                      <Text size="2">
                        {hypothesis.explanation ?? "No explanation stored."}
                      </Text>
                      <pre className="sl-inbox-pre">
                        {formatJson(hypothesis.payload)}
                      </pre>
                    </Flex>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="sl-inbox-analysis-column">
            <Heading as="h3" size="3">
              Atoms
            </Heading>
            {detail.atoms.length === 0 ? (
              <Text size="2" color="gray">
                No atoms have been produced yet.
              </Text>
            ) : (
              <div className="sl-inbox-analysis-list">
                {detail.atoms.map((atom) => (
                  <Card
                    key={atom.id}
                    variant="surface"
                    className="sl-inbox-analysis-card"
                  >
                    <Flex direction="column" gap="2">
                      <Flex align="center" justify="between" gap="2" wrap="wrap">
                        <StatusBadge status={atom.atomType} label={atom.atomType} />
                        <Text size="1" color="gray">
                          confidence {atom.confidence.toFixed(2)}
                        </Text>
                      </Flex>
                      <Text size="2">
                        {atom.canonicalValue ?? "No canonical value stored."}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Structured packets"
        description="Packets stay as routed evidence containers. Canonical changes now depend on explicit review artifacts in the bridge below."
      >
        {detail.structuredPackets.length === 0 ? (
          <EmptyState
            title="No structured packet yet"
            description="Packets appear once the item reaches a non-discard route."
          />
        ) : (
          <div className="sl-inbox-packet-list">
            {detail.structuredPackets.map((packet) => {
              const reviewBatch = reviewBatchByPacketId.get(packet.id);
              const routingPolicy = getRoutingPolicyTrace(packet.metadata);

              return (
                <Card
                  key={packet.id}
                  variant="surface"
                  className="sl-inbox-packet-card"
                >
                  <Flex direction="column" gap="3">
                    <Flex align="center" justify="between" gap="2" wrap="wrap">
                      <Flex gap="2" wrap="wrap">
                        <StatusBadge
                          status={packet.packetType}
                          label={packet.packetType}
                        />
                        <StatusBadge status={packet.route} label={packet.route} />
                      </Flex>
                      <Text size="1" color="gray">
                        {packet.status}
                      </Text>
                    </Flex>
                    <Text size="2">{packet.summary}</Text>
                    {renderRoutingPolicySummary(routingPolicy)}
                    {reviewBatch ? (
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">
                          Review bridge
                        </Text>
                        <Flex gap="2" wrap="wrap">
                          <StatusBadge
                            status={
                              reviewBatch.batchType === "promote_apply"
                                ? "inbox_review"
                                : reviewBatch.batchType
                            }
                            label={
                              reviewBatch.batchType === "promote_apply"
                                ? "inbox review"
                                : humanizeToken(reviewBatch.batchType)
                            }
                          />
                          <StatusBadge status={reviewBatch.status} />
                          <Text size="1" color="gray" className="sl-inbox-mono">
                            {reviewBatch.id}
                          </Text>
                        </Flex>
                        <Text size="2" color="gray">
                          {reviewBatch.artifacts.length} review artifacts were
                          materialized from this packet.
                        </Text>
                      </Flex>
                    ) : null}
                    <pre className="sl-inbox-pre">{formatJson(packet.payload)}</pre>
                  </Flex>
                </Card>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Review bridge"
        description="Each user decision is recorded per artifact first. Only resolved artifacts can trigger canonical apply."
      >
        {detail.reviewBatches.length === 0 ? (
          <EmptyState
            title="No review artifacts yet"
            description="Promoted packets materialize here as Learning review batches before anything can touch the canonical layer."
          />
        ) : (
          <div className="sl-inbox-packet-list">
            {detail.reviewBatches.map((batch) => (
              <Card
                key={batch.id}
                variant="surface"
                className="sl-inbox-packet-card"
              >
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between" gap="2" wrap="wrap">
                    <Flex gap="2" wrap="wrap">
                      <StatusBadge
                        status={
                          batch.batchType === "promote_apply"
                            ? "inbox_review"
                            : batch.batchType
                        }
                        label={
                          batch.batchType === "promote_apply"
                            ? "inbox review"
                            : humanizeToken(batch.batchType)
                        }
                      />
                      <StatusBadge status={batch.status} />
                    </Flex>
                    <Text size="1" color="gray" className="sl-inbox-mono">
                      {batch.id}
                    </Text>
                  </Flex>

                  <Text size="2">
                    {typeof batch.metadata.packetSummary === "string"
                      ? batch.metadata.packetSummary
                      : "Inbox review batch"}
                  </Text>

                  {batch.artifacts.length === 0 ? (
                    <Text size="2" color="gray">
                      No review artifacts were materialized for this batch.
                    </Text>
                  ) : (
                    <div className="sl-inbox-analysis-list">
                      {batch.artifacts.map((artifact) => (
                        <Card
                          key={artifact.id}
                          variant="surface"
                          className="sl-inbox-analysis-card"
                        >
                          <Flex direction="column" gap="2">
                            <Flex
                              align="center"
                              justify="between"
                              gap="2"
                              wrap="wrap"
                            >
                              <Flex gap="2" wrap="wrap">
                                <StatusBadge
                                  status={artifact.suggestionType}
                                  label={formatReviewArtifactLabel(
                                    artifact.suggestionType
                                  )}
                                />
                                <StatusBadge
                                  status={artifact.targetEntityType}
                                  label={formatReviewArtifactLabel(
                                    artifact.targetEntityType
                                  )}
                                />
                                {artifact.resolutionType ? (
                                  <StatusBadge
                                    status={artifact.resolutionType}
                                    label={formatReviewArtifactLabel(
                                      artifact.resolutionType
                                    )}
                                  />
                                ) : null}
                                {artifact.applyStatus ? (
                                  <StatusBadge
                                    status={artifact.applyStatus}
                                    label={formatReviewArtifactLabel(
                                      artifact.applyStatus
                                    )}
                                  />
                                ) : null}
                              </Flex>
                              <Text size="1" color="gray">
                                artifact #{artifact.artifactOrder + 1}
                              </Text>
                            </Flex>

                            {artifact.reasonText ? (
                              <Text size="2">{artifact.reasonText}</Text>
                            ) : null}

                            {artifact.applyError ? (
                              <Text size="2" color="red">
                                {artifact.applyError}
                              </Text>
                            ) : null}

                            <pre className="sl-inbox-pre">
                              {formatJson(artifact.proposedPayload)}
                            </pre>
                          </Flex>
                        </Card>
                      ))}
                    </div>
                  )}
                </Flex>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Clarification"
        description="Review the current request and answer history for this item."
      >
        {detail.clarificationRequests.length === 0 ? (
          <EmptyState
            title="No clarification history"
            description="This item has not produced a clarification request."
          />
        ) : (
          <div className="sl-inbox-clarification-stack">
            {detail.clarificationRequests.map((request) => {
              const answer = clarificationAnswerByRequestId.get(request.id);

              return (
                <Card
                  key={request.id}
                  variant="surface"
                  className="sl-inbox-clarification-card"
                >
                  <Flex direction="column" gap="3">
                    <Flex align="center" justify="between" gap="2" wrap="wrap">
                      <Flex gap="2" wrap="wrap">
                        <StatusBadge status={request.status} label={request.status} />
                        <Text size="1" color="gray" className="sl-inbox-mono">
                          {request.id}
                        </Text>
                      </Flex>
                      <Text size="1" color="gray">
                        answered {formatTimestamp(request.answeredAt)}
                      </Text>
                    </Flex>
                    <div className="sl-inbox-text-block">
                      <Text size="1" color="gray">
                        Question
                      </Text>
                      <Text size="2">{request.question}</Text>
                    </div>
                    <div className="sl-inbox-text-block">
                      <Text size="1" color="gray">
                        Reason
                      </Text>
                      <Text size="2">{request.reason}</Text>
                    </div>
                    {answer ? (
                      <div className="sl-inbox-text-block">
                        <Text size="1" color="gray">
                          Answer
                        </Text>
                        <pre className="sl-inbox-pre sl-inbox-plain-pre">
                          {answer.answerText}
                        </pre>
                      </div>
                    ) : null}
                  </Flex>
                </Card>
              );
            })}

            {pendingClarification &&
            selectedItem.status === "clarification_requested" ? (
              <Card variant="surface" className="sl-inbox-answer-form-card">
                <Flex direction="column" gap="3">
                  <Heading as="h3" size="3">
                    Answer the pending clarification
                  </Heading>
                  <Text size="2" color="gray">
                    Submit one clarification answer to rerun the item without
                    mutating the original raw text.
                  </Text>
                  <InboxClarificationAnswerForm
                    workspaceSlug={workspaceSlug}
                    requestId={pendingClarification.id}
                  />
                </Flex>
              </Card>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Execution attempts"
        description="Inspect durable process and rerun telemetry before diving into the legacy event timeline."
      >
        {detail.attempts.length === 0 ? (
          <EmptyState
            title="No execution telemetry yet"
            description="Attempts and step runs are recorded on the next process or clarification rerun."
          />
        ) : (
          <div className="sl-inbox-packet-list">
            {detail.attempts.map((attempt) => (
              <Card
                key={attempt.id}
                variant="surface"
                className="sl-inbox-packet-card"
              >
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between" gap="2" wrap="wrap">
                    <Flex gap="2" wrap="wrap">
                      <StatusBadge status={attempt.status} label={attempt.status} />
                      <StatusBadge
                        status={
                          attempt.triggerKind === "manual_process"
                            ? "manual_note"
                            : "clarification_answer"
                        }
                        label={humanizeToken(attempt.triggerKind)}
                      />
                      {attempt.route ? (
                        <StatusBadge status={attempt.route} label={attempt.route} />
                      ) : null}
                    </Flex>
                    <Text size="1" color="gray" className="sl-inbox-mono">
                      attempt {attempt.attemptNo}
                    </Text>
                  </Flex>

                  <div className="sl-inbox-detail-meta-grid">
                    <div className="sl-inbox-meta-card">
                      <Text size="1" color="gray">
                        Duration
                      </Text>
                      <Text size="2">{formatLatency(attempt.latencyMs)}</Text>
                    </div>
                    <div className="sl-inbox-meta-card">
                      <Text size="1" color="gray">
                        Started
                      </Text>
                      <Text size="2">{formatTimestamp(attempt.startedAt)}</Text>
                    </div>
                    <div className="sl-inbox-meta-card">
                      <Text size="1" color="gray">
                        Finished
                      </Text>
                      <Text size="2">{formatTimestamp(attempt.finishedAt)}</Text>
                    </div>
                    <div className="sl-inbox-meta-card">
                      <Text size="1" color="gray">
                        Runner
                      </Text>
                      <Text size="2" className="sl-inbox-mono">
                        {attempt.runnerKind}
                      </Text>
                    </div>
                  </div>

                  <div className="sl-inbox-text-grid">
                    <div className="sl-inbox-text-block">
                      <Text size="1" color="gray">
                        Route reason
                      </Text>
                      <Text size="2">
                        {attempt.reason ?? "No route reason was recorded."}
                      </Text>
                    </div>
                    <div className="sl-inbox-text-block">
                      <Text size="1" color="gray">
                        Failure
                      </Text>
                      <Text size="2">
                        {formatFailureReason({
                          failureCode: attempt.failureCode,
                          failureMessage: attempt.failureMessage,
                        })}
                      </Text>
                    </div>
                  </div>

                  {attempt.steps.length === 0 ? (
                    <Text size="2" color="gray">
                      No step telemetry was recorded for this attempt.
                    </Text>
                  ) : (
                    <div className="table-scroll">
                      <DataTable
                        columns={[
                          "Step",
                          "Status",
                          "Latency",
                          "Runtime",
                          "Route / reason",
                          "Failure",
                        ]}
                        rows={attempt.steps.map((step) => [
                          (() => {
                            const routingPolicy = getRoutingPolicyTrace(step.metadata);

                            return (
                              <Flex
                                key={`${step.id}-step`}
                                direction="column"
                                gap="1"
                                wrap="wrap"
                              >
                                <Text size="2" weight="medium">
                                  {step.stepName}
                                </Text>
                                <Text size="1" color="gray">
                                  run {step.runNo}
                                </Text>
                                {routingPolicy ? (
                                  <Text size="1" color="gray" className="sl-inbox-mono">
                                    {routingPolicy.policyVersion}
                                  </Text>
                                ) : null}
                              </Flex>
                            );
                          })(),
                          <StatusBadge
                            key={`${step.id}-status`}
                            status={step.status}
                            label={step.status}
                          />,
                          formatLatency(step.latencyMs),
                          <Flex
                            key={`${step.id}-runtime`}
                            direction="column"
                            gap="1"
                            wrap="wrap"
                          >
                            <Text size="2" className="sl-inbox-mono">
                              {step.modelName ?? "deterministic"}
                            </Text>
                            <Text size="1" color="gray" className="sl-inbox-mono">
                              {step.promptVersion ?? "n/a"}
                            </Text>
                          </Flex>,
                          <Flex
                            key={`${step.id}-route`}
                            direction="column"
                            gap="1"
                            wrap="wrap"
                          >
                            {step.route ? (
                              <StatusBadge status={step.route} label={step.route} />
                            ) : (
                              <Text size="1" color="gray">
                                No route
                              </Text>
                            )}
                            <Text size="1" color="gray">
                              {step.reason ?? "No reason"}
                            </Text>
                            {renderRoutingPolicySummary(
                              getRoutingPolicyTrace(step.metadata),
                              "Policy notes",
                              "1"
                            )}
                          </Flex>,
                          formatFailureReason({
                            failureCode: step.failureCode,
                            failureMessage: step.failureMessage,
                          }),
                        ])}
                      />
                    </div>
                  )}
                </Flex>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Workflow timeline"
        description="Track step-level events, attempt numbers, and timestamps for the selected item."
      >
        {detail.workflowEvents.length === 0 ? (
          <EmptyState
            title="No workflow events yet"
            description="Workflow events are recorded as the item is ingested, processed, or rerun."
          />
        ) : (
          <div className="table-scroll">
            <DataTable
              columns={["Step", "Event", "Attempt", "Policy", "Details", "Time"]}
              rows={detail.workflowEvents.map((event) => {
                const routingPolicy = getRoutingPolicyTrace(event.payload);
                const routingCompatibility = getRoutingCompatibility(event.payload);

                return [
                  event.stepName,
                  event.eventType,
                  event.attemptNo.toString(),
                  routingPolicy ? (
                    <Text
                      key={`${event.id}-policy`}
                      size="1"
                      className="sl-inbox-mono"
                    >
                      {routingPolicy.policyVersion}
                    </Text>
                  ) : (
                    <Text key={`${event.id}-policy`} size="1" color="gray">
                      n/a
                    </Text>
                  ),
                  routingCompatibility || routingPolicy ? (
                    <Flex
                      key={`${event.id}-details`}
                      direction="column"
                      gap="1"
                      wrap="wrap"
                    >
                      {routingCompatibility?.effectiveRoute ? (
                        <Text size="1">
                          {routingCompatibility.requestedRoute
                            ? `${routingCompatibility.requestedRoute} -> ${routingCompatibility.effectiveRoute}`
                            : routingCompatibility.effectiveRoute}
                        </Text>
                      ) : null}
                      {routingCompatibility?.reason ? (
                        <Text size="1" color="gray">
                          {routingCompatibility.reason}
                        </Text>
                      ) : null}
                      {routingCompatibility?.overrideReason ? (
                        <Text size="1" color="gray">
                          {routingCompatibility.overrideReason}
                        </Text>
                      ) : null}
                      {routingPolicy?.decisionNotes.map((note) => (
                        <Text key={note.id} size="1">
                          {note.text}
                        </Text>
                      ))}
                    </Flex>
                  ) : (
                    <Text key={`${event.id}-details`} size="1" color="gray">
                      No routing details
                    </Text>
                  ),
                  formatTimestamp(event.createdAt),
                ];
              })}
            />
          </div>
        )}
      </SectionCard>
    </>
  );
}

export function InboxWorkbench({
  workspaceSlug,
  workspaceName,
  availableMaps,
  items,
  selectedItemId,
  selectionError,
  detail,
}: InboxWorkbenchProps) {
  return (
    <div className="page-stack sl-inbox-page">
      <PageHeader
        title="Inbox Workbench"
        description={`Internal triage surface for raw Inbox items in ${workspaceName}. Data is scoped to the current signed-in user.`}
      />

      <div className="sl-inbox-grid">
        <div className="sl-inbox-rail">
          <SectionCard
            title="Create Inbox item"
            description="Pick a target Map first, then paste a raw note or transcript snippet to start the triage loop."
          >
            <InboxWorkbenchComposer
              workspaceSlug={workspaceSlug}
              availableMaps={availableMaps}
            />
          </SectionCard>

          <SectionCard
            title="Latest items"
            description="The latest 50 user-scoped Inbox items ordered by recent activity."
          >
            {items.length === 0 ? (
              <EmptyState
                title="No inbox items yet"
                description="Create the first Inbox item from the composer to start the internal triage flow."
              />
            ) : (
              <ScrollArea
                type="auto"
                scrollbars="vertical"
                className="sl-inbox-list-scroll"
              >
                <div className="sl-inbox-item-list">
                  {items.map((item) => {
                    const href = `${workspaceInboxPath(workspaceSlug)}?item=${item.id}`;
                    const isSelected = !selectionError && selectedItemId === item.id;

                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className="sl-inbox-item-link"
                        data-selected={isSelected}
                        aria-current={isSelected ? "page" : undefined}
                      >
                        <Flex direction="column" gap="3" className="sl-inbox-item-card">
                          <Flex align="start" justify="between" gap="3" wrap="wrap">
                            <Flex direction="column" gap="1">
                              <Text size="1" color="gray">
                                {formatTimestamp(item.updatedAt)}
                              </Text>
                              <Text size="2" weight="medium" className="sl-inbox-item-id">
                                {item.id}
                              </Text>
                            </Flex>
                            <Flex gap="2" wrap="wrap">
                              <StatusBadge status={item.status} />
                              {item.route ? (
                                <StatusBadge status={item.route} label={item.route} />
                              ) : null}
                            </Flex>
                          </Flex>

                          <Text size="2" className="sl-inbox-item-snippet">
                            {truncateText(item.rawText)}
                          </Text>

                          <Flex align="center" justify="between" gap="2" wrap="wrap">
                            <Text size="1" color="gray">
                              {item.sourceType}
                            </Text>
                            <Text size="1" color="gray">
                              {item.normalizedText ? "normalized" : "raw only"}
                            </Text>
                          </Flex>
                        </Flex>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </SectionCard>
        </div>

        <ScrollArea
          type="auto"
          scrollbars="vertical"
          className="sl-inbox-detail-scroll"
        >
          <div className="sl-inbox-detail-stack">
            {detail
              ? renderDetailPanels(detail, workspaceSlug)
              : renderSelectionState(selectionError)}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
