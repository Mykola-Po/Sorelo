import Link from "next/link";
import { Badge, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";

import type { InspectorProvenancePayload } from "@/features/inspector/types";
import { workspaceInboxPath } from "@/shared/config/routes";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";

type InspectorProvenanceSectionProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  provenance: InspectorProvenancePayload | null;
};

function formatInspectorTimestamp(value: string, locale: SupportedLocale) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function InspectorProvenanceSection({
  locale,
  workspaceSlug,
  provenance,
}: InspectorProvenanceSectionProps) {
  const messages = getMapWorkspaceMessages(locale);

  return (
    <Flex direction="column" gap="3">
      <Heading size="3">{messages.inspector.provenanceTitle}</Heading>

      {!provenance ? (
        <Text color="gray" size="2">
          {messages.inspector.provenanceEmpty}
        </Text>
      ) : (
        <>
          <Flex gap="2" wrap="wrap">
            <Badge color="blue" radius="full" variant="soft">
              {messages.inspector.provenanceMutationType(
                provenance.mutationType
              )}
            </Badge>
            <Badge color="green" radius="full" variant="soft">
              {`${messages.inspector.provenanceReviewStatus}: ${provenance.resolution.resolutionType}`}
            </Badge>
            {provenance.resolution.appliedAt ? (
              <Badge color="gray" radius="full" variant="surface">
                {`${messages.inspector.provenanceAppliedAt}: ${formatInspectorTimestamp(
                  provenance.resolution.appliedAt,
                  locale
                )}`}
              </Badge>
            ) : null}
          </Flex>

          <Flex direction="column" gap="1">
            <Text color="gray" size="1">
              {messages.inspector.provenanceInboxItem}
            </Text>
            <Text size="2">{provenance.inboxItem.rawText}</Text>
            <Button asChild size="1" variant="soft">
              <Link
                href={{
                  pathname: workspaceInboxPath(workspaceSlug),
                  query: { item: provenance.inboxItem.id },
                }}
              >
                {messages.inspector.provenanceOpenInbox}
              </Link>
            </Button>
          </Flex>

          {provenance.resolution.reasonText ? (
            <Flex direction="column" gap="1">
              <Text color="gray" size="1">
                {messages.inspector.provenanceReason}
              </Text>
              <Text size="2">{provenance.resolution.reasonText}</Text>
            </Flex>
          ) : null}

          {provenance.suggestion.rationale ? (
            <Flex direction="column" gap="1">
              <Text color="gray" size="1">
                {messages.inspector.provenanceSuggestionRationale}
              </Text>
              <Text size="2">{provenance.suggestion.rationale}</Text>
            </Flex>
          ) : null}

          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              {messages.inspector.provenanceEvidence}
            </Text>
            {provenance.evidence.length === 0 ? (
              <Text color="gray" size="2">
                {messages.inspector.provenanceNoEvidence}
              </Text>
            ) : (
              provenance.evidence.map((evidence) => (
                <Card
                  key={evidence.id}
                  variant="surface"
                  className="panel-surface-card"
                >
                  <Flex direction="column" gap="1">
                    <Text color="gray" size="1">
                      {messages.inspector.provenanceFragment(
                        evidence.fragmentOrdinal
                      )}
                    </Text>
                    <Text size="2">{evidence.fragmentText}</Text>
                    {evidence.clarificationAnswerText ? (
                      <Text size="2">
                        {`${messages.inspector.provenanceClarificationAnswer}: ${evidence.clarificationAnswerText}`}
                      </Text>
                    ) : null}
                  </Flex>
                </Card>
              ))
            )}
          </Flex>
        </>
      )}
    </Flex>
  );
}
