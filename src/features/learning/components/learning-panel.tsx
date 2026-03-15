"use client";

import { useActionState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextArea,
} from "@radix-ui/themes";

import { resolveSuggestionAction } from "@/features/learning/actions";
import {
  deriveLearningReviewDiff,
  formatLearningDiffValue,
  humanizeLearningFieldPath,
} from "@/features/learning/review-diff";
import type { LearningSuggestionSummary } from "@/features/maps/types";
import { getIntlLocale, type SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import type { ActionState } from "@/shared/validation/action-state";

const initialResolutionState: ActionState<"resolutionType" | "reasonText"> = {
  status: "idle",
};

type LearningPanelProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  suggestions: LearningSuggestionSummary[];
};

export function LearningPanel({
  locale,
  workspaceSlug,
  mapId,
  suggestions,
}: LearningPanelProps) {
  const messages = getMapWorkspaceMessages(locale).learning;
  const openSuggestions = suggestions.filter((item) => !item.resolution);
  const resolvedSuggestions = suggestions.filter((item) => item.resolution);

  if (suggestions.length === 0) {
    return (
      <EmptyState
        title={messages.emptyTitle}
        description={messages.emptyDescription}
      />
    );
  }

  return (
    <Flex direction="column" gap="3" className="panel-scroll-fill">
      <Card className="panel-card">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Heading size="4">{messages.heading}</Heading>
          <Flex gap="2" wrap="wrap">
            <Badge color="blue" variant="soft" radius="full">
              {messages.openCount(openSuggestions.length)}
            </Badge>
            <Badge color="gray" variant="surface" radius="full">
              {messages.resolvedCount(resolvedSuggestions.length)}
            </Badge>
          </Flex>
        </Flex>
      </Card>

      <div className="panel-native-scroll">
        {suggestions.map((item) => (
          <SuggestionCard
            key={item.id}
            locale={locale}
            workspaceSlug={workspaceSlug}
            mapId={mapId}
            item={item}
          />
        ))}
      </div>
    </Flex>
  );
}

type SuggestionCardProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  item: LearningSuggestionSummary;
};

function summarizeEvidenceSnippet(text: string, maxLength = 260) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

function SuggestionCard({
  locale,
  workspaceSlug,
  mapId,
  item,
}: SuggestionCardProps) {
  const messages = getMapWorkspaceMessages(locale).learning;
  const intlLocale = getIntlLocale(locale);
  const [state, formAction, isPending] = useActionState(
    resolveSuggestionAction,
    initialResolutionState
  );
  const diffEntries = deriveLearningReviewDiff(item.proposedPayload);
  const formatFieldPath = (fieldPath: string) =>
    humanizeLearningFieldPath(
      fieldPath,
      messages.fieldLabels,
      messages.genericFieldLabel
    );
  const evidenceItems = [
    item.rationale
      ? {
          label: messages.evidenceRationaleLabel,
          value: summarizeEvidenceSnippet(item.rationale),
        }
      : null,
    item.sourceRawText
      ? {
          label: messages.evidenceSourceLabel,
          value: summarizeEvidenceSnippet(item.sourceRawText),
        }
      : null,
  ].filter(
    (
      value
    ): value is {
      label: string;
      value: string;
    } => Boolean(value)
  );

  return (
    <Card className="panel-card">
      <Flex direction="column" gap="3">
        <Flex align="start" justify="between" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="3">{messages.suggestionType(item.suggestionType)}</Heading>
            <Text size="2" color="gray">
              {messages.targetEntity(item.targetEntityType)}
            </Text>
          </Flex>
          <Badge
            color={item.resolution ? "green" : "orange"}
            variant={item.resolution ? "soft" : "surface"}
            radius="full"
          >
            {item.resolution
              ? messages.resolutionType(item.resolution.resolutionType)
              : messages.pending}
          </Badge>
        </Flex>

        <Flex gap="2" wrap="wrap">
          {typeof item.confidence === "number" ? (
            <Badge color="gray" variant="surface">
              {messages.confidence(item.confidence)}
            </Badge>
          ) : null}
          {item.sourceType ? (
            <Badge color="gray" variant="surface">
              {messages.sourceType(item.sourceType)}
            </Badge>
          ) : null}
          <Badge color="gray" variant="surface">
            {new Date(item.createdAt).toLocaleString(intlLocale)}
          </Badge>
        </Flex>

        <Flex direction="column" gap="2" className="sl-learning-review-section">
          <Text size="2" weight="medium">
            {messages.reviewChangesHeading}
          </Text>
          {diffEntries.length > 0 ? (
            <ul className="sl-learning-diff-list">
              {diffEntries.map((entry) => (
                <li key={entry.fieldPath} className="sl-learning-diff-item">
                  <Text size="1" color="gray" className="sl-learning-diff-label">
                    {formatFieldPath(entry.fieldPath)}
                  </Text>
                  <Text size="2" className="sl-learning-diff-change">
                    {entry.changeKind === "update"
                      ? `${formatLearningDiffValue(entry.beforeValue)} -> ${formatLearningDiffValue(entry.afterValue)}`
                      : entry.changeKind === "remove"
                        ? `${formatLearningDiffValue(entry.beforeValue)} -> -`
                        : `-> ${formatLearningDiffValue(entry.afterValue)}`}
                  </Text>
                </li>
              ))}
            </ul>
          ) : (
            <Text size="2" color="gray">
              {messages.reviewNoChanges}
            </Text>
          )}
        </Flex>

        <Flex direction="column" gap="2" className="sl-learning-review-section">
          <Text size="2" weight="medium">
            {messages.reviewEvidenceHeading}
          </Text>
          {evidenceItems.length > 0 ? (
            <div className="sl-learning-evidence-list">
              {evidenceItems.map((entry) => (
                <div key={entry.label} className="sl-learning-evidence-item">
                  <Text size="1" color="gray" className="sl-learning-evidence-label">
                    {entry.label}
                  </Text>
                  <Text size="2" className="sl-learning-evidence-value">
                    {entry.value}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <Text size="2" color="gray">
              {messages.reviewNoEvidence}
            </Text>
          )}
        </Flex>

        {item.resolution ? (
          <Flex direction="column" gap="1">
            {item.resolution.reasonText ? (
              <Text size="2">{item.resolution.reasonText}</Text>
            ) : null}
            <Text size="1" color="gray">
              {new Date(item.resolution.resolvedAt).toLocaleString(intlLocale)}
            </Text>
          </Flex>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={mapId} />
            <input type="hidden" name="suggestionId" value={item.id} />

            <Flex direction="column" gap="3">
              <InlineFormField
                label={messages.reasonLabel}
                error={state.fieldErrors?.reasonText?.[0]}
              >
                <TextArea
                  name="reasonText"
                  rows={2}
                  placeholder={messages.reasonPlaceholder}
                />
              </InlineFormField>

              {state.fieldErrors?.resolutionType?.[0] ? (
                <Text size="2" color="red">
                  {state.fieldErrors.resolutionType[0]}
                </Text>
              ) : null}

              {state.status === "error" && state.message ? (
                <Text size="2" color="red">
                  {state.message}
                </Text>
              ) : null}

              <Flex gap="2" wrap="wrap" className="sl-learning-actions">
                <Button
                  type="submit"
                  size="2"
                  name="resolutionType"
                  value="accepted"
                  color="green"
                  disabled={isPending}
                >
                  {messages.acceptCta}
                </Button>
                <Button
                  type="submit"
                  size="2"
                  name="resolutionType"
                  value="edited"
                  color="blue"
                  variant="soft"
                  disabled={isPending}
                >
                  {messages.editCta}
                </Button>
                <Button
                  type="submit"
                  size="2"
                  name="resolutionType"
                  value="rejected"
                  color="red"
                  variant="soft"
                  disabled={isPending}
                >
                  {messages.rejectCta}
                </Button>
                <Button
                  type="submit"
                  size="2"
                  name="resolutionType"
                  value="context_limited"
                  color="amber"
                  variant="soft"
                  disabled={isPending}
                >
                  {messages.contextLimitedCta}
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Flex>
    </Card>
  );
}

