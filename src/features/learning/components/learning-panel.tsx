"use client";

import { useActionState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Text,
  TextArea,
} from "@radix-ui/themes";

import { resolveSuggestionAction } from "@/features/learning/actions";
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

        {item.rationale ? (
          <Text size="2" className="sl-learning-rationale">
            {item.rationale}
          </Text>
        ) : null}

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

        {item.sourceRawText ? (
          <Text size="2" className="sl-learning-source">
            {item.sourceRawText}
          </Text>
        ) : null}

        <details className="sl-learning-payload">
          <summary>{messages.payload}</summary>
          <pre>{JSON.stringify(item.proposedPayload, null, 2)}</pre>
        </details>

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
                label={messages.resolutionLabel}
                error={state.fieldErrors?.resolutionType?.[0]}
              >
                <Select.Root name="resolutionType" defaultValue="accepted">
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="accepted">
                      {messages.resolutionType("accepted")}
                    </Select.Item>
                    <Select.Item value="edited">
                      {messages.resolutionType("edited")}
                    </Select.Item>
                    <Select.Item value="rejected">
                      {messages.resolutionType("rejected")}
                    </Select.Item>
                    <Select.Item value="context_limited">
                      {messages.resolutionType("context_limited")}
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </InlineFormField>

              <InlineFormField
                label={messages.reasonLabel}
                error={state.fieldErrors?.reasonText?.[0]}
              >
                <TextArea name="reasonText" rows={2} />
              </InlineFormField>

              {state.status === "error" && state.message ? (
                <Text size="2" color="red">
                  {state.message}
                </Text>
              ) : null}

              <Button type="submit" size="2" loading={isPending}>
                {messages.resolveCta}
              </Button>
            </Flex>
          </form>
        )}
      </Flex>
    </Card>
  );
}

