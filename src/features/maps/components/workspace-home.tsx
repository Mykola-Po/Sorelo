import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  ScrollArea,
  Text,
} from "@radix-ui/themes";

import type { ScenarioRunStatus, WorkspaceRole } from "@/shared/db/schema";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  getIntlLocale,
  type SupportedLocale,
} from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";
import { getWorkspaceHomeMessages } from "@/shared/i18n/messages/workspace-home";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { SectionCard } from "@/shared/ui/components/section-card";
import { StatusBadge } from "@/shared/ui/components/status-badge";
import { deriveGuidedOnboardingStep } from "@/features/maps/workspace-state";
import { CreateMapForm } from "@/features/maps/components/create-map-form";
import { WorkspaceSectionNav } from "@/features/workspace/components/workspace-section-nav";

type WorkspaceHomeProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole;
  data: {
    maps: Array<{
      id: string;
      title: string;
      slug: string;
      subjectLabel: string;
      description: string | null;
      updatedAt: Date;
    }>;
      recentRuns: Array<{
      id: string;
      mapId: string;
      triggerText: string;
      status: ScenarioRunStatus;
      summary: string | null;
      createdAt: Date;
      map: {
        title: string;
      };
      starter: {
        fullName: string | null;
        email: string;
      };
    }>;
    summary: {
      mapCount: number;
      memberCount: number;
      conceptCount: number;
      linkCount: number;
      scenarioRunCount: number;
      latestMapMetrics: {
        conceptCount: number;
        linkCount: number;
        scenarioRunCount: number;
      } | null;
    };
  };
};

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WorkspaceHome({
  locale,
  workspaceSlug,
  workspaceName,
  workspaceRole,
  data,
}: WorkspaceHomeProps) {
  const homeMessages = getWorkspaceHomeMessages(locale);
  const shellMessages = getAppShellMessages(locale);
  const mapMessages = getMapWorkspaceMessages(locale);
  const intlLocale = getIntlLocale(locale);
  const latestMap = data.maps[0] ?? null;
  const stageKey = latestMap
    ? deriveGuidedOnboardingStep(
        data.summary.latestMapMetrics ?? {
          conceptCount: 0,
          linkCount: 0,
          scenarioRunCount: 0,
        }
      )
    : "no_maps";
  const stage = homeMessages.stages[stageKey];
  const guidedStep =
    stageKey === "no_maps" ? null : mapMessages.guided[stageKey];
  const hasMaps = data.maps.length > 0;

  const metricCards = [
    {
      label: homeMessages.metrics.maps,
      value: data.summary.mapCount,
    },
    {
      label: homeMessages.metrics.concepts,
      value: data.summary.conceptCount,
    },
    {
      label: homeMessages.metrics.links,
      value: data.summary.linkCount,
    },
    {
      label: homeMessages.metrics.scenarios,
      value: data.summary.scenarioRunCount,
    },
    {
      label: homeMessages.metrics.members,
      value: data.summary.memberCount,
    },
  ];

  return (
    <div
      className="page-stack maps-home-page sl-workspace-home"
      data-surface-mode="operational"
    >
      <WorkspaceSectionNav
        workspaceSlug={workspaceSlug}
        currentSection="overview"
      />

      <div className="sl-workspace-hero">
        <Card className="sl-workspace-hero-panel">
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="3">
              <Text
                size="1"
                weight="medium"
                className="sl-workspace-hero-eyebrow"
              >
                {homeMessages.headerEyebrow}
              </Text>
              <Flex align="center" gap="2" wrap="wrap">
                <Heading as="h1" size="8" className="sl-workspace-title">
                  {workspaceName}
                </Heading>
                <StatusBadge
                  status={workspaceRole}
                  label={mapMessages.labels.workspaceRoles[workspaceRole]}
                />
              </Flex>
              <Text size="3" color="gray" className="sl-workspace-description">
                {homeMessages.headerDescription}
              </Text>
            </Flex>

            <div className="sl-workspace-metric-grid">
              {metricCards.map((metric) => (
                <div key={metric.label} className="sl-workspace-metric-card">
                  <Text size="1" color="gray">
                    {metric.label}
                  </Text>
                  <Text size="6" weight="bold" className="sl-workspace-metric-value">
                    {metric.value}
                  </Text>
                </div>
              ))}
            </div>

            <div className="sl-workspace-summary-card">
              <Text size="1" weight="medium" className="sl-workspace-summary-label">
                {homeMessages.summaryTitle}
              </Text>
              <Text size="2" color="gray">
                {homeMessages.summaryDescription}
              </Text>
            </div>
          </Flex>
        </Card>

        <Card className="sl-workspace-focus-card">
          <Flex direction="column" gap="5">
            <Flex align="start" justify="between" gap="3" wrap="wrap">
              <Flex direction="column" gap="2" className="sl-workspace-focus-copy">
                <Text
                  size="1"
                  weight="medium"
                  className="sl-workspace-focus-eyebrow"
                >
                  {homeMessages.focusEyebrow}
                </Text>
                <Heading as="h2" size="6" className="sl-workspace-focus-title">
                  {stage.title}
                </Heading>
                <Text size="2" color="gray">
                  {stage.description}
                </Text>
              </Flex>
              {guidedStep ? (
                <Badge size="2" radius="full" variant="soft" color="blue">
                  {mapMessages.stepLabel(
                    guidedStep.stepNumber,
                    guidedStep.totalSteps
                  )}
                </Badge>
              ) : null}
            </Flex>

            {latestMap ? (
              <div className="sl-workspace-focus-meta">
                <div className="sl-workspace-focus-meta-row">
                  <Text size="1" color="gray">
                    {homeMessages.latestMapLabel}
                  </Text>
                  <Text size="2" weight="medium">
                    {latestMap.title}
                  </Text>
                </div>
                <div className="sl-workspace-focus-meta-row">
                  <Text size="1" color="gray">
                    {homeMessages.lastUpdatedLabel}
                  </Text>
                  <Text size="2" weight="medium">
                    {formatDate(latestMap.updatedAt, intlLocale)}
                  </Text>
                </div>
                <Text size="2" color="gray">
                  {latestMap.subjectLabel}
                </Text>
              </div>
            ) : null}

            <div className="sl-workspace-reason-grid">
              <div className="sl-workspace-reason-card">
                <Text size="1" weight="medium" className="sl-workspace-reason-label">
                  {homeMessages.whyNowLabel}
                </Text>
                <Text size="2" color="gray">
                  {stage.whyNow}
                </Text>
              </div>
              <div className="sl-workspace-reason-card">
                <Text size="1" weight="medium" className="sl-workspace-reason-label">
                  {homeMessages.solidProgressLabel}
                </Text>
                <Text size="2" color="gray">
                  {stage.solidProgress}
                </Text>
              </div>
            </div>

            {latestMap ? (
              <Flex gap="2" wrap="wrap">
                <Button asChild size="3">
                  <Link href={workspaceMapPath(workspaceSlug, latestMap.id)}>
                    {homeMessages.openMap}
                  </Link>
                </Button>
                <Button asChild size="3" variant="soft" color="gray">
                  <Link href="#workspace-create">
                    {homeMessages.createAnotherMap}
                  </Link>
                </Button>
              </Flex>
            ) : (
              <div className="sl-workspace-create-form-shell">
                <CreateMapForm workspaceSlug={workspaceSlug} locale={locale} />
              </div>
            )}
          </Flex>
        </Card>
      </div>

      {!hasMaps ? (
        <SectionCard
          title={homeMessages.noMapsStepsTitle}
          description={homeMessages.noMapsStepsDescription}
        >
          <div className="sl-workspace-step-list">
            {shellMessages.mapsHome.emptyState.steps.map((step) => (
              <div key={step} className="sl-workspace-step-card">
                <Text size="2">{step}</Text>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <div className="sl-workspace-home-grid">
          <SectionCard
            title={homeMessages.mapLibraryTitle}
            description={homeMessages.mapLibraryDescription}
            className="sl-workspace-map-library"
          >
            {data.maps.length === 0 ? (
              <EmptyState
                title={homeMessages.mapLibraryEmptyTitle}
                description={homeMessages.mapLibraryEmptyDescription}
              />
            ) : (
              <ScrollArea type="auto" scrollbars="vertical" className="panel-scroll">
                <div className="sl-workspace-map-list">
                  {data.maps.map((map, index) => (
                    <Card key={map.id} variant="surface" className="sl-workspace-map-card">
                      <Flex direction="column" gap="3">
                        <Flex align="start" justify="between" gap="3" wrap="wrap">
                          <Flex direction="column" gap="1">
                            <Flex align="center" gap="2" wrap="wrap">
                              <Text weight="medium">{map.title}</Text>
                              {index === 0 ? (
                                <Badge
                                  size="1"
                                  radius="full"
                                  variant="soft"
                                  color="blue"
                                >
                                  {homeMessages.latestFocusBadge}
                                </Badge>
                              ) : null}
                            </Flex>
                            <Text color="gray" size="2">
                              {map.subjectLabel}
                            </Text>
                          </Flex>
                          <Text color="gray" size="1">
                            {formatDate(map.updatedAt, intlLocale)}
                          </Text>
                        </Flex>

                        <Text color="gray" size="2">
                          {map.description ??
                            shellMessages.mapsHome.workspaceMaps.emptyDescription}
                        </Text>

                        <Flex gap="2" wrap="wrap" align="center">
                          <Button asChild>
                            <Link href={workspaceMapPath(workspaceSlug, map.id)}>
                              {homeMessages.openMap}
                            </Link>
                          </Button>
                        </Flex>
                      </Flex>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </SectionCard>

          <div className="sl-workspace-rail">
            <SectionCard
              title={homeMessages.recentRunsTitle}
              description={homeMessages.recentRunsDescription}
              className="scroll-card"
            >
              {data.recentRuns.length === 0 ? (
                <EmptyState
                  title={homeMessages.recentRunsEmptyTitle}
                  description={homeMessages.recentRunsEmptyDescription}
                  action={
                    latestMap ? (
                      <Button asChild>
                        <Link href={workspaceMapPath(workspaceSlug, latestMap.id)}>
                          {homeMessages.openMap}
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <ScrollArea type="auto" scrollbars="vertical" className="panel-scroll">
                  <div className="sl-workspace-run-list">
                    {data.recentRuns.map((run) => (
                      <Card key={run.id} variant="surface" className="sl-workspace-run-card">
                        <Flex direction="column" gap="3">
                          <Flex align="start" justify="between" gap="3">
                            <Flex direction="column" gap="1">
                              <Text weight="medium">{run.map.title}</Text>
                              <Text color="gray" size="2">
                                {run.triggerText}
                              </Text>
                            </Flex>
                            <StatusBadge
                              status={run.status}
                              label={mapMessages.labels.scenarioStatuses[run.status]}
                            />
                          </Flex>

                          {run.summary ? (
                            <Text color="gray" size="2">
                              {run.summary}
                            </Text>
                          ) : null}

                          <Text color="gray" size="1">
                            {run.starter.fullName ?? run.starter.email} |{" "}
                            {run.createdAt.toLocaleString(intlLocale)}
                          </Text>

                          <Button asChild variant="soft" color="gray">
                            <Link href={workspaceMapPath(workspaceSlug, run.mapId)}>
                              {homeMessages.openMap}
                            </Link>
                          </Button>
                        </Flex>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </SectionCard>

            <div id="workspace-create" className="sl-workspace-create-anchor">
              <SectionCard
                title={homeMessages.createAnotherMapTitle}
                description={homeMessages.createAnotherMapDescription}
              >
                <Flex direction="column" gap="4">
                  <Text color="gray" size="2">
                    {homeMessages.createAnotherMapHelper}
                  </Text>
                  <CreateMapForm workspaceSlug={workspaceSlug} locale={locale} />
                </Flex>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
