import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";

import { InboxClarificationAnswerForm } from "@/features/inbox/components/inbox-clarification-answer-form";
import { InboxWorkbenchComposer } from "@/features/inbox/components/inbox-workbench-composer";
import { InboxWorkbenchProcessForm } from "@/features/inbox/components/inbox-workbench-process-form";
import { inboxRoutingPolicyTraceSchema } from "@/features/inbox/schemas";
import type { MapSummary } from "@/features/maps/types";
import type {
  InboxItemDetailRecord,
  InboxListPageRecord,
  InboxReviewBatchRecord,
  InboxRoutingPolicyTraceRecord,
} from "@/features/inbox/types";
import type { InboxWorkbenchListState } from "@/features/inbox/workbench-state";
import {
  buildInboxWorkbenchHref,
  defaultInboxWorkbenchListState,
} from "@/features/inbox/workbench-state";
import { workspaceMapPath } from "@/shared/config/routes";
import { getIntlLocale, type SupportedLocale } from "@/shared/i18n/config";
import { getInboxWorkbenchMessages } from "@/shared/i18n/messages/inbox-workbench";
import { DataTable } from "@/shared/ui/components/data-table";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { PageHeader } from "@/shared/ui/components/page-header";
import { SectionCard } from "@/shared/ui/components/section-card";
import { StatusBadge } from "@/shared/ui/components/status-badge";
import { WorkspaceSectionNav } from "@/features/workspace/components/workspace-section-nav";

type InboxWorkbenchProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  workspaceName: string;
  availableMaps: MapSummary[];
  listPage: InboxListPageRecord;
  listState: InboxWorkbenchListState;
  selectedItemId?: string;
  selectedItemVisibleInList: boolean;
  selectionError?: string | null;
  detail: InboxItemDetailRecord | null;
};

type DetailPrimaryAction =
  | {
      kind: "link";
      label: string;
      href: string;
    }
  | {
      kind: "process";
      label: string;
    }
  | {
      kind: "clarification";
      label: string;
    }
  | {
      kind: "closed";
      label: string;
      href: string | null;
    }
  | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRecordString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function formatTimestamp(value: Date | null, locale: SupportedLocale) {
  if (!value) {
    return "--";
  }

  return value.toLocaleString(getIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(text: string, max = 140) {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 3)}...`;
}

function formatJson(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2);
}

function formatLatency(latencyMs: number | null) {
  if (latencyMs === null) {
    return "--";
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
    return "--";
  }

  if (input.failureCode && input.failureMessage) {
    return `${input.failureCode}: ${input.failureMessage}`;
  }

  return input.failureMessage ?? input.failureCode ?? "--";
}

function getRoutingPolicyTrace(value: unknown): InboxRoutingPolicyTraceRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = "routingPolicy" in value ? value.routingPolicy : value;
  const parsed = inboxRoutingPolicyTraceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function getRoutingSummary(detail: InboxItemDetailRecord) {
  const workflowEvent = [...detail.workflowEvents]
    .reverse()
    .find((event) => event.stepName === "route");
  const packet = detail.structuredPackets.at(-1) ?? null;
  const routingPayload = workflowEvent?.payload ?? packet?.metadata ?? null;
  const trace = getRoutingPolicyTrace(routingPayload);

  const reason =
    getRecordString(routingPayload, "reason") ??
    trace?.finalDecision.reason ??
    detail.item.route;

  return {
    trace,
    reason,
  };
}

function findInspectorHref(
  detail: InboxItemDetailRecord,
  workspaceSlug: string
) {
  for (const batch of detail.reviewBatches) {
    for (const artifact of batch.artifacts) {
      if (!artifact.targetEntityId) {
        continue;
      }

      if (artifact.targetEntityType === "concept") {
        return `${workspaceMapPath(workspaceSlug, detail.item.mapId)}?panel=inspector&conceptId=${artifact.targetEntityId}`;
      }

      if (artifact.targetEntityType === "link") {
        return `${workspaceMapPath(workspaceSlug, detail.item.mapId)}?panel=inspector&linkId=${artifact.targetEntityId}`;
      }
    }
  }

  for (const candidate of detail.mergeCandidates) {
    if (candidate.targetObjectType === "concept") {
      return `${workspaceMapPath(workspaceSlug, detail.item.mapId)}?panel=inspector&conceptId=${candidate.targetObjectId}`;
    }

    if (candidate.targetObjectType === "link") {
      return `${workspaceMapPath(workspaceSlug, detail.item.mapId)}?panel=inspector&linkId=${candidate.targetObjectId}`;
    }
  }

  return null;
}

function countResolvedArtifacts(reviewBatches: InboxReviewBatchRecord[]) {
  return reviewBatches.reduce((total, batch) => {
    return (
      total +
      batch.artifacts.filter((artifact) => artifact.resolutionType !== null).length
    );
  }, 0);
}

function buildPrimaryAction(
  detail: InboxItemDetailRecord,
  workspaceSlug: string,
  messages: ReturnType<typeof getInboxWorkbenchMessages>
): DetailPrimaryAction {
  const item = detail.item;

  if (item.status === "clarification_requested") {
    return {
      kind: "clarification",
      label: messages.detailActionAnswer,
    };
  }

  if (item.status === "failed_needs_review") {
    return {
      kind: "process",
      label: messages.detailActionRetry,
    };
  }

  if (
    item.status === "received" ||
    item.status === "persisted" ||
    item.status === "normalized" ||
    item.status === "segmented" ||
    item.status === "interpreted" ||
    item.status === "scored" ||
    item.status === "resolved"
  ) {
    return {
      kind: "process",
      label: messages.detailActionProcess,
    };
  }

  if (item.status === "ready_for_review" || item.status === "promoted") {
    return {
      kind: "link",
      label: messages.detailActionReviewLearning,
      href: `${workspaceMapPath(workspaceSlug, item.mapId)}?panel=learning`,
    };
  }

  if (item.status === "parked") {
    return {
      kind: "link",
      label: messages.detailActionOpenMap,
      href: workspaceMapPath(workspaceSlug, item.mapId),
    };
  }

  if (item.status === "discarded" || item.status === "applied") {
    return {
      kind: "closed",
      label: messages.detailActionClosed,
      href: workspaceMapPath(workspaceSlug, item.mapId),
    };
  }

  return null;
}

function renderSelectionState(
  locale: SupportedLocale,
  selectionError: string | null | undefined
) {
  const messages = getInboxWorkbenchMessages(locale);

  if (selectionError) {
    return (
      <SectionCard
        title={messages.selectionUnavailableTitle}
        description={messages.selectionUnavailableDescription}
      >
        <EmptyState
          title={messages.selectionUnavailableTitle}
          description={selectionError}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={messages.selectionEmptyTitle}
      description={messages.selectionEmptyDescription}
    >
      <EmptyState
        title={messages.selectionEmptyTitle}
        description={messages.selectionEmptyDescription}
      />
    </SectionCard>
  );
}

function renderQueueCards(
  locale: SupportedLocale,
  workspaceSlug: string,
  workspaceName: string,
  listState: InboxWorkbenchListState,
  listPage: InboxListPageRecord,
  selectedItemId: string | undefined
) {
  const messages = getInboxWorkbenchMessages(locale);

  if (listPage.items.length === 0) {
    const usingDefaultQueue =
      listState.view === defaultInboxWorkbenchListState.view &&
      listState.status === defaultInboxWorkbenchListState.status &&
      listState.route === defaultInboxWorkbenchListState.route &&
      listState.mapId === defaultInboxWorkbenchListState.mapId;

    return (
      <EmptyState
        title={
          usingDefaultQueue
            ? messages.queueEmptyTitle
            : messages.queueFilteredEmptyTitle
        }
        description={
          usingDefaultQueue
            ? messages.queueEmptyDescription
            : messages.queueFilteredEmptyDescription
        }
      />
    );
  }

  return (
    <div className="sl-inbox-item-list">
      {listPage.items.map((item) => {
        const isSelected = selectedItemId === item.id;

        return (
          <Card
            key={item.id}
            className="sl-inbox-item-card"
            variant="surface"
            data-selected={isSelected}
          >
            <Flex direction="column" gap="3">
              <Flex align="start" justify="between" gap="3" wrap="wrap">
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    {truncateText(item.rawText, 96)}
                  </Text>
                  <Text size="1" color="gray">
                    {messages.queueRelatedToLabel}: {workspaceName} /{" "}
                    {item.mapTitle ?? item.mapSubjectLabel ?? messages.filtersAnyMap}
                  </Text>
                </Flex>
                <Flex gap="2" wrap="wrap">
                  <StatusBadge
                    status={item.status}
                    label={messages.statusLabels[item.status]}
                  />
                  {item.route ? (
                    <StatusBadge
                      status={item.route}
                      label={messages.routeLabels[item.route]}
                    />
                  ) : null}
                </Flex>
              </Flex>

              <div className="sl-inbox-queue-meta-grid">
                <div className="sl-inbox-meta-card">
                  <Text size="1" color="gray">
                    {messages.queueStateLabel}
                  </Text>
                  <Text size="2">{messages.statusLabels[item.status]}</Text>
                </div>
                <div className="sl-inbox-meta-card">
                  <Text size="1" color="gray">
                    {messages.queueReceivedLabel}
                  </Text>
                  <Text size="2">{formatTimestamp(item.createdAt, locale)}</Text>
                </div>
                <div className="sl-inbox-meta-card">
                  <Text size="1" color="gray">
                    {messages.queueUpdatedLabel}
                  </Text>
                  <Text size="2">{formatTimestamp(item.updatedAt, locale)}</Text>
                </div>
                <div className="sl-inbox-meta-card">
                  <Text size="1" color="gray">
                    {messages.queueNextLabel}
                  </Text>
                  <Text size="2">{item.nextActionLabel}</Text>
                </div>
                <div className="sl-inbox-meta-card">
                  <Text size="1" color="gray">
                    {messages.detailSourceLabel}
                  </Text>
                  <Text size="2">{messages.sourceLabels[item.sourceType]}</Text>
                </div>
                {item.ownerLabel ? (
                  <div className="sl-inbox-meta-card">
                    <Text size="1" color="gray">
                      {messages.queueOwnerLabel}
                    </Text>
                    <Text size="2">{item.ownerLabel}</Text>
                  </div>
                ) : null}
              </div>

              <Flex gap="2" wrap="wrap">
                <Button asChild size="1">
                  <Link
                    href={buildInboxWorkbenchHref(workspaceSlug, {
                      ...listState,
                      item: item.id,
                    })}
                  >
                    {messages.queueOpenTriage}
                  </Link>
                </Button>
                {item.nextActionHref ? (
                  <Button asChild size="1" variant="soft">
                    <Link href={item.nextActionHref}>{item.nextActionLabel}</Link>
                  </Button>
                ) : (
                  <Badge radius="full" variant="soft">
                    {item.nextActionLabel}
                  </Badge>
                )}
              </Flex>
            </Flex>
          </Card>
        );
      })}
    </div>
  );
}

function renderDetailPanels(input: {
  locale: SupportedLocale;
  workspaceSlug: string;
  availableMaps: MapSummary[];
  listState: InboxWorkbenchListState;
  detail: InboxItemDetailRecord;
  selectedItemVisibleInList: boolean;
}) {
  const {
    locale,
    workspaceSlug,
    availableMaps,
    listState,
    detail,
    selectedItemVisibleInList,
  } = input;
  const messages = getInboxWorkbenchMessages(locale);
  const selectedItem = detail.item;
  const targetMap =
    availableMaps.find((map) => map.id === selectedItem.mapId) ?? null;
  const primaryAction = buildPrimaryAction(detail, workspaceSlug, messages);
  const inspectorHref = findInspectorHref(detail, workspaceSlug);
  const routingSummary = getRoutingSummary(detail);
  const resolvedArtifacts = countResolvedArtifacts(detail.reviewBatches);
  const pendingClarification =
    detail.clarificationRequests.find((request) => request.status === "pending") ??
    null;
  const clarificationAnswerByRequestId = new Map(
    detail.clarificationAnswers.map((answer) => [answer.requestId, answer])
  );
  const visibleArtifacts = detail.reviewBatches
    .flatMap((batch) => batch.artifacts)
    .slice(0, 3);

  return (
    <>
      {!selectedItemVisibleInList ? (
        <Card variant="surface" className="sl-inbox-warning-card">
          <Text size="2">{messages.selectionOutsideCurrentView}</Text>
        </Card>
      ) : null}

      <SectionCard
        title={messages.detailSummaryTitle}
        description={messages.detailSummaryDescription}
        action={
          primaryAction?.kind === "process" ? (
            <InboxWorkbenchProcessForm
              workspaceSlug={workspaceSlug}
              itemId={selectedItem.id}
              listState={listState}
              label={primaryAction.label}
            />
          ) : undefined
        }
      >
        <div className="sl-inbox-detail-meta-grid">
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailNextStepLabel}
            </Text>
            <Text size="2">{primaryAction?.label ?? messages.queueOpenTriage}</Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailStateLabel}
            </Text>
            <Text size="2">{messages.statusLabels[selectedItem.status]}</Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailRouteLabel}
            </Text>
              <Text size="2">
                {selectedItem.route
                  ? messages.routeLabels[selectedItem.route]
                  : "--"}
              </Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailMapLabel}
            </Text>
            <Text size="2">
              {targetMap
                ? `${targetMap.title} (${targetMap.subjectLabel})`
                : messages.detailNoTargetMap}
            </Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailSourceLabel}
            </Text>
            <Text size="2">{messages.sourceLabels[selectedItem.sourceType]}</Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailCreatedLabel}
            </Text>
            <Text size="2">{formatTimestamp(selectedItem.createdAt, locale)}</Text>
          </div>
          <div className="sl-inbox-meta-card">
            <Text size="1" color="gray">
              {messages.detailUpdatedLabel}
            </Text>
            <Text size="2">{formatTimestamp(selectedItem.updatedAt, locale)}</Text>
          </div>
        </div>

        <Flex gap="2" wrap="wrap">
          {primaryAction?.kind === "link" ? (
            <Button asChild size="2">
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
          ) : null}
          {primaryAction?.kind === "closed" && primaryAction.href ? (
            <Button asChild size="2" variant="soft">
              <Link href={primaryAction.href}>{messages.detailActionOpenMap}</Link>
            </Button>
          ) : null}
          {primaryAction?.kind === "clarification" ? (
            <Badge color="orange" radius="full" variant="soft">
              {primaryAction.label}
            </Badge>
          ) : null}
          {targetMap ? (
            <Button asChild size="2" variant="soft">
              <Link href={workspaceMapPath(workspaceSlug, targetMap.id)}>
                {messages.detailActionOpenMap}
              </Link>
            </Button>
          ) : null}
          {inspectorHref ? (
            <Button asChild size="2" variant="soft">
              <Link href={inspectorHref}>{messages.detailActionOpenInspector}</Link>
            </Button>
          ) : null}
        </Flex>
      </SectionCard>

      <SectionCard
        title={messages.detailSignalTitle}
        description={messages.detailSignalDescription}
      >
        <div className="sl-inbox-text-grid">
          <div className="sl-inbox-text-block">
            <Text size="1" color="gray">
              {messages.detailRawInputLabel}
            </Text>
            <pre className="sl-inbox-pre sl-inbox-plain-pre">
              {selectedItem.rawText}
            </pre>
          </div>
          <div className="sl-inbox-text-block">
            <Text size="1" color="gray">
              {messages.detailNormalizedLabel}
            </Text>
            <pre className="sl-inbox-pre sl-inbox-plain-pre">
              {selectedItem.normalizedText ?? messages.detailNoNormalizedText}
            </pre>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={messages.detailRoutingTitle}
        description={messages.detailRoutingDescription}
      >
        <div className="sl-inbox-text-grid">
          <div className="sl-inbox-text-block">
            <Text size="1" color="gray">
              {messages.detailRoutingSummaryLabel}
            </Text>
            <Text size="2">{routingSummary.reason ?? messages.detailRoutingFallback}</Text>
          </div>
          <div className="sl-inbox-text-block">
            <Text size="1" color="gray">
              {messages.technicalPolicyNotes}
            </Text>
            {routingSummary.trace ? (
              <Flex direction="column" gap="1">
                {routingSummary.trace.decisionNotes.map((note) => (
                  <Text key={note.id} size="2">
                    {note.text}
                  </Text>
                ))}
              </Flex>
            ) : (
              <Text size="2" color="gray">
                {messages.detailRoutingFallback}
              </Text>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={messages.detailReviewTitle}
        description={messages.detailReviewDescription}
      >
        {detail.reviewBatches.length === 0 ? (
          <Text size="2" color="gray">
            {messages.detailNoReviewArtifacts}
          </Text>
        ) : (
          <div className="sl-inbox-analysis-list">
            <Card variant="surface" className="sl-inbox-analysis-card">
              <Flex direction="column" gap="2">
                <Text size="2">
                  {messages.detailReviewSummary(
                    detail.reviewBatches.reduce(
                      (total, batch) => total + batch.artifacts.length,
                      0
                    ),
                    resolvedArtifacts
                  )}
                </Text>
                {visibleArtifacts.map((artifact) => (
                  <div key={artifact.id} className="sl-inbox-text-block">
                    <Text size="1" color="gray">
                      {messages.technicalReviewArtifact(artifact.artifactOrder)}
                    </Text>
                    <Text size="2">
                      {artifact.suggestionType.replaceAll("_", " ")}
                    </Text>
                    {artifact.resolutionType ? (
                      <StatusBadge
                        status={artifact.resolutionType}
                        label={artifact.resolutionType.replaceAll("_", " ")}
                      />
                    ) : null}
                  </div>
                ))}
              </Flex>
            </Card>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={messages.detailClarificationTitle}
        description={messages.detailClarificationDescription}
      >
        {detail.clarificationRequests.length === 0 && !pendingClarification ? (
          <Text size="2" color="gray">
            {messages.detailNoClarificationHistory}
          </Text>
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
                      <Text size="2" weight="medium">
                        {messages.detailClarificationQuestionLabel}
                      </Text>
                      <StatusBadge status={request.status} label={request.status} />
                    </Flex>
                    <Text size="2">{request.question}</Text>
                    <div className="sl-inbox-text-grid">
                      <div className="sl-inbox-text-block">
                        <Text size="1" color="gray">
                          {messages.detailClarificationReasonLabel}
                        </Text>
                        <Text size="2">{request.reason}</Text>
                      </div>
                      <div className="sl-inbox-text-block">
                        <Text size="1" color="gray">
                          {messages.detailClarificationAnswerLabel}
                        </Text>
                        <Text size="2">{answer?.answerText ?? "--"}</Text>
                      </div>
                    </div>
                  </Flex>
                </Card>
              );
            })}

            {pendingClarification && selectedItem.status === "clarification_requested" ? (
              <Card variant="surface" className="sl-inbox-answer-form-card">
                <Flex direction="column" gap="3">
                  <Heading as="h3" size="3">
                    {messages.detailClarificationPendingTitle}
                  </Heading>
                  <Text size="2" color="gray">
                    {messages.detailClarificationPendingDescription}
                  </Text>
                  <InboxClarificationAnswerForm
                    locale={locale}
                    workspaceSlug={workspaceSlug}
                    requestId={pendingClarification.id}
                    listState={listState}
                  />
                </Flex>
              </Card>
            ) : null}
          </div>
        )}
      </SectionCard>

      <details className="sl-inbox-disclosure">
        <summary>{messages.detailTechnicalEvidence}</summary>
        <div className="sl-inbox-disclosure-content">
          {detail.fragments.length === 0 ? (
            <Text size="2" color="gray">
              {messages.detailNoFragments}
            </Text>
          ) : (
            <div className="sl-inbox-fragment-list">
              {detail.fragments.map((fragment) => (
                <Card key={fragment.id} variant="surface" className="sl-inbox-fragment-card">
                  <Flex direction="column" gap="2">
                    <Flex align="center" justify="between" gap="2" wrap="wrap">
                      <Text size="1" color="gray">
                        {messages.technicalFragment(fragment.ordinal)}
                      </Text>
                      <Flex gap="2" wrap="wrap">
                        <StatusBadge status={fragment.sourceKind} label={fragment.sourceKind} />
                        {fragment.fragmentType ? (
                          <StatusBadge
                            status={fragment.fragmentType}
                            label={fragment.fragmentType}
                          />
                        ) : null}
                      </Flex>
                    </Flex>
                    <Text size="2">{fragment.fragmentText}</Text>
                  </Flex>
                </Card>
              ))}
            </div>
          )}
        </div>
      </details>

      <details className="sl-inbox-disclosure">
        <summary>{messages.detailTechnicalReviewBridge}</summary>
        <div className="sl-inbox-disclosure-content">
          {detail.structuredPackets.length === 0 ? (
            <Text size="2" color="gray">
              {messages.detailNoPackets}
            </Text>
          ) : (
            <div className="sl-inbox-packet-list">
              {detail.structuredPackets.map((packet) => (
                <Card key={packet.id} variant="surface" className="sl-inbox-packet-card">
                  <Flex direction="column" gap="2">
                    <Flex gap="2" wrap="wrap">
                      <StatusBadge status={packet.route} label={packet.route} />
                      <StatusBadge status={packet.packetType} label={packet.packetType} />
                      <StatusBadge status={packet.status} label={packet.status} />
                    </Flex>
                    <Text size="2">{packet.summary}</Text>
                    <pre className="sl-inbox-pre">{formatJson(packet.payload)}</pre>
                  </Flex>
                </Card>
              ))}
            </div>
          )}
        </div>
      </details>

      <details className="sl-inbox-disclosure">
        <summary>{messages.detailTechnicalRoute}</summary>
        <div className="sl-inbox-disclosure-content">
          <div className="sl-inbox-text-grid">
            <div className="sl-inbox-text-block">
              <Text size="1" color="gray">
                {messages.technicalRouteReason}
              </Text>
              <Text size="2">{routingSummary.reason ?? messages.detailRoutingFallback}</Text>
            </div>
            <div className="sl-inbox-text-block">
              <Text size="1" color="gray">
                {messages.technicalPolicyNotes}
              </Text>
              <pre className="sl-inbox-pre">
                {routingSummary.trace
                  ? formatJson(routingSummary.trace)
                  : messages.detailRoutingFallback}
              </pre>
            </div>
          </div>
        </div>
      </details>

      <details className="sl-inbox-disclosure">
        <summary>{messages.detailTechnicalExecution}</summary>
        <div className="sl-inbox-disclosure-content">
          {detail.attempts.length === 0 ? (
            <Text size="2" color="gray">
              {messages.detailNoAttempts}
            </Text>
          ) : (
            <div className="sl-inbox-packet-list">
              {detail.attempts.map((attempt) => (
                <Card key={attempt.id} variant="surface" className="sl-inbox-packet-card">
                  <Flex direction="column" gap="3">
                    <Flex align="center" justify="between" gap="2" wrap="wrap">
                      <Text size="2" weight="medium">
                        {messages.technicalAttempt(attempt.attemptNo)}
                      </Text>
                      <Flex gap="2" wrap="wrap">
                        <StatusBadge status={attempt.status} label={attempt.status} />
                        {attempt.route ? (
                          <StatusBadge status={attempt.route} label={attempt.route} />
                        ) : null}
                      </Flex>
                    </Flex>
                    <div className="sl-inbox-detail-meta-grid">
                      <div className="sl-inbox-meta-card">
                        <Text size="1" color="gray">
                          {messages.technicalDuration}
                        </Text>
                        <Text size="2">{formatLatency(attempt.latencyMs)}</Text>
                      </div>
                      <div className="sl-inbox-meta-card">
                        <Text size="1" color="gray">
                          {messages.technicalStarted}
                        </Text>
                        <Text size="2">{formatTimestamp(attempt.startedAt, locale)}</Text>
                      </div>
                      <div className="sl-inbox-meta-card">
                        <Text size="1" color="gray">
                          {messages.technicalFinished}
                        </Text>
                        <Text size="2">{formatTimestamp(attempt.finishedAt, locale)}</Text>
                      </div>
                      <div className="sl-inbox-meta-card">
                        <Text size="1" color="gray">
                          {messages.technicalRunner}
                        </Text>
                        <Text size="2">{attempt.runnerKind}</Text>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <DataTable
                        columns={[
                          messages.technicalStep,
                          messages.technicalStatus,
                          messages.technicalLatency,
                          messages.technicalRuntime,
                          messages.technicalRouteReason,
                          messages.technicalFailure,
                        ]}
                        rows={attempt.steps.map((step) => [
                          step.stepName,
                          <StatusBadge
                            key={`${step.id}-status`}
                            status={step.status}
                            label={step.status}
                          />,
                          formatLatency(step.latencyMs),
                          step.modelName ?? "deterministic",
                          step.reason ?? "--",
                          formatFailureReason({
                            failureCode: step.failureCode,
                            failureMessage: step.failureMessage,
                          }),
                        ])}
                      />
                    </div>
                  </Flex>
                </Card>
              ))}
            </div>
          )}
        </div>
      </details>

      <details className="sl-inbox-disclosure">
        <summary>{messages.detailTechnicalTimeline}</summary>
        <div className="sl-inbox-disclosure-content">
          {detail.workflowEvents.length === 0 ? (
            <Text size="2" color="gray">
              {messages.detailNoEvents}
            </Text>
          ) : (
            <div className="table-scroll">
              <DataTable
                columns={[
                  messages.technicalStep,
                  messages.technicalStatus,
                  messages.technicalPolicyNotes,
                  messages.technicalTime,
                ]}
                rows={detail.workflowEvents.map((event) => {
                  const trace = getRoutingPolicyTrace(event.payload);

                  return [
                    event.stepName,
                    <StatusBadge
                      key={`${event.id}-event`}
                      status={event.status}
                      label={event.eventType}
                    />,
                    trace
                      ? trace.decisionNotes.map((note) => note.text).join(" ")
                      : "--",
                    formatTimestamp(event.createdAt, locale),
                  ];
                })}
              />
            </div>
          )}
        </div>
      </details>
    </>
  );
}

export function InboxWorkbench({
  locale,
  workspaceSlug,
  workspaceName,
  availableMaps,
  listPage,
  listState,
  selectedItemId,
  selectedItemVisibleInList,
  selectionError,
  detail,
}: InboxWorkbenchProps) {
  const messages = getInboxWorkbenchMessages(locale);
  const queueListState: InboxWorkbenchListState = {
    view: listState.view,
    status: listState.status,
    route: listState.route,
    mapId: listState.mapId,
    sort: listState.sort,
    page: listState.page,
    pageSize: listState.pageSize,
  };
  const resetHref = buildInboxWorkbenchHref(workspaceSlug, {
    ...defaultInboxWorkbenchListState,
    ...(selectedItemId ? { item: selectedItemId } : {}),
  });
  const previousPageHref = buildInboxWorkbenchHref(workspaceSlug, {
    ...listState,
    page: Math.max(1, listPage.page - 1),
  });
  const nextPageHref = buildInboxWorkbenchHref(workspaceSlug, {
    ...listState,
    page: Math.min(listPage.totalPages, listPage.page + 1),
  });
  const mobileView = selectedItemId ? "detail" : "list";

  return (
    <div className="page-stack sl-inbox-page" data-mobile-view={mobileView}>
      <WorkspaceSectionNav workspaceSlug={workspaceSlug} currentSection="inbox" />

      <PageHeader
        title={messages.pageTitle}
        description={messages.pageDescription(workspaceName)}
      />

      <div className="sl-inbox-grid">
        <div className="sl-inbox-rail">
          <SectionCard
            title={messages.composerTitle}
            description={messages.composerDescription}
          >
            <InboxWorkbenchComposer
              locale={locale}
              workspaceSlug={workspaceSlug}
              availableMaps={availableMaps}
              listState={listState}
            />
          </SectionCard>

          <SectionCard title={messages.filtersTitle} description={messages.queueDescription}>
            <form method="get" className="sl-inbox-filter-form">
              {selectedItemId ? (
                <input type="hidden" name="item" value={selectedItemId} />
              ) : null}
              <div className="sl-inbox-filter-grid">
                <label className="sl-inbox-filter-field">
                  <Text size="1" color="gray">
                    {messages.filtersViewLabel}
                  </Text>
                  <select
                    name="view"
                    defaultValue={listState.view}
                    className="sl-inbox-select"
                  >
                    <option value="needs-attention">
                      {messages.filtersViewNeedsAttention}
                    </option>
                    <option value="all">{messages.filtersViewAll}</option>
                  </select>
                </label>
                <label className="sl-inbox-filter-field">
                  <Text size="1" color="gray">
                    {messages.filtersStatusLabel}
                  </Text>
                  <select
                    name="status"
                    defaultValue={listState.status}
                    className="sl-inbox-select"
                  >
                    <option value="any">{messages.filtersAnyStatus}</option>
                    {Object.entries(messages.statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sl-inbox-filter-field">
                  <Text size="1" color="gray">
                    {messages.filtersRouteLabel}
                  </Text>
                  <select
                    name="route"
                    defaultValue={listState.route}
                    className="sl-inbox-select"
                  >
                    <option value="any">{messages.filtersAnyRoute}</option>
                    {Object.entries(messages.routeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sl-inbox-filter-field">
                  <Text size="1" color="gray">
                    {messages.filtersMapLabel}
                  </Text>
                  <select
                    name="mapId"
                    defaultValue={listState.mapId}
                    className="sl-inbox-select"
                  >
                    <option value="any">{messages.filtersAnyMap}</option>
                    {availableMaps.map((map) => (
                      <option key={map.id} value={map.id}>
                        {map.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sl-inbox-filter-field">
                  <Text size="1" color="gray">
                    {messages.filtersSortLabel}
                  </Text>
                  <select
                    name="sort"
                    defaultValue={listState.sort}
                    className="sl-inbox-select"
                  >
                    <option value="updated_desc">
                      {messages.filtersSortUpdatedDesc}
                    </option>
                    <option value="updated_asc">
                      {messages.filtersSortUpdatedAsc}
                    </option>
                    <option value="created_desc">
                      {messages.filtersSortCreatedDesc}
                    </option>
                  </select>
                </label>
                <label className="sl-inbox-filter-field">
                  <Text size="1" color="gray">
                    {messages.filtersPageSizeLabel}
                  </Text>
                  <select
                    name="pageSize"
                    defaultValue={listState.pageSize.toString()}
                    className="sl-inbox-select"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </label>
              </div>
              <Flex gap="2" wrap="wrap">
                <Button type="submit" size="2">
                  {messages.filtersApply}
                </Button>
                <Button asChild type="button" size="2" variant="soft">
                  <Link href={resetHref}>{messages.filtersReset}</Link>
                </Button>
              </Flex>
            </form>
          </SectionCard>

          <SectionCard
            title={messages.queueTitle}
            description={messages.queueSummary(listPage.totalCount)}
          >
            <div className="sl-inbox-list-scroll">
              {renderQueueCards(
                locale,
                workspaceSlug,
                workspaceName,
                listState,
                listPage,
                selectedItemId
              )}
            </div>

            <div className="sl-inbox-pagination">
              <Text size="1" color="gray">
                {messages.filtersPageSummary(listPage.page, listPage.totalPages)}
              </Text>
              <Flex gap="2" wrap="wrap">
                {listPage.page <= 1 ? (
                  <Button size="1" variant="soft" disabled>
                    {messages.filtersPrevious}
                  </Button>
                ) : (
                  <Button asChild size="1" variant="soft">
                    <Link href={previousPageHref}>{messages.filtersPrevious}</Link>
                  </Button>
                )}
                {listPage.page >= listPage.totalPages ? (
                  <Button size="1" variant="soft" disabled>
                    {messages.filtersNext}
                  </Button>
                ) : (
                  <Button asChild size="1" variant="soft">
                    <Link href={nextPageHref}>{messages.filtersNext}</Link>
                  </Button>
                )}
              </Flex>
            </div>
          </SectionCard>
        </div>

        <div className="sl-inbox-detail-pane">
          {selectedItemId ? (
            <div className="sl-inbox-mobile-back">
              <Button asChild size="1" variant="soft">
                <Link
                  href={buildInboxWorkbenchHref(workspaceSlug, queueListState)}
                >
                  {messages.mobileBackToQueue}
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="sl-inbox-detail-scroll">
            <div className="sl-inbox-detail-stack">
              {detail
                ? renderDetailPanels({
                    locale,
                    workspaceSlug,
                    availableMaps,
                    listState,
                    detail,
                    selectedItemVisibleInList,
                  })
                : renderSelectionState(locale, selectionError)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
