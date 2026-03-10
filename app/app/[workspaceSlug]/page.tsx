import { cookies } from "next/headers";
import Link from "next/link";
import { Button, Card, Flex, Grid, ScrollArea, Text } from "@radix-ui/themes";

import { CreateMapForm } from "@/features/maps/components/create-map-form";
import { getMapsHomeData } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  getIntlLocale,
  LOCALE_COOKIE,
  resolveSupportedLocale,
} from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { PageHeader } from "@/shared/ui/components/page-header";
import { SectionCard } from "@/shared/ui/components/section-card";
import { StatusBadge } from "@/shared/ui/components/status-badge";

type MapsHomePageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function MapsHomePage({ params }: MapsHomePageProps) {
  const { workspaceSlug } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const messages = getAppShellMessages(locale);
  const mapMessages = getMapWorkspaceMessages(locale);
  const intlLocale = getIntlLocale(locale);
  const data = await getMapsHomeData(access.workspace.id);
  const hasMaps = data.maps.length > 0;

  return (
    <div className="page-stack maps-home-page">
      <PageHeader
        title={messages.mapsHome.title}
        description={messages.mapsHome.description}
      />

      {!hasMaps ? (
        <SectionCard
          title={messages.mapsHome.emptyState.title}
          description={messages.mapsHome.emptyState.description}
        >
          <Grid columns={{ initial: "1", md: "2" }} gap="5">
            <CreateMapForm workspaceSlug={workspaceSlug} locale={locale} />
            <Flex direction="column" gap="3">
              <Text weight="medium">{messages.mapsHome.emptyState.nextLabel}</Text>
              <Text color="gray" size="2">
                {messages.mapsHome.emptyState.steps[0]}
              </Text>
              <Text color="gray" size="2">
                {messages.mapsHome.emptyState.steps[1]}
              </Text>
              <Text color="gray" size="2">
                {messages.mapsHome.emptyState.steps[2]}
              </Text>
            </Flex>
          </Grid>
        </SectionCard>
      ) : (
        <div className="maps-home-grid">
          <SectionCard
            title={messages.mapsHome.createCard.title}
            description={messages.mapsHome.createCard.description}
          >
            <CreateMapForm workspaceSlug={workspaceSlug} locale={locale} />
          </SectionCard>

          <SectionCard
            title={messages.mapsHome.recentRuns.title}
            description={messages.mapsHome.recentRuns.description}
            className="scroll-card"
          >
            {data.recentRuns.length === 0 ? (
              <EmptyState
                title={messages.mapsHome.recentRuns.emptyTitle}
                description={messages.mapsHome.recentRuns.emptyDescription}
              />
            ) : (
              <ScrollArea type="auto" scrollbars="vertical" className="panel-scroll">
                <Grid gap="3">
                  {data.recentRuns.map((run) => (
                    <Card key={run.id} variant="surface">
                      <Flex direction="column" gap="2">
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
                        <Text color="gray" size="2">
                          {run.starter.fullName ?? run.starter.email} |{" "}
                          {run.createdAt.toLocaleString(intlLocale)}
                        </Text>
                      </Flex>
                    </Card>
                  ))}
                </Grid>
              </ScrollArea>
            )}
          </SectionCard>

          <SectionCard
            title={messages.mapsHome.workspaceMaps.title}
            description={messages.mapsHome.workspaceMaps.description}
            className="maps-list-card"
          >
            <ScrollArea type="auto" scrollbars="vertical" className="panel-scroll">
              <Grid gap="3">
                {data.maps.map((map) => (
                  <Card key={map.id} variant="surface">
                    <Flex direction="column" gap="3">
                      <Flex align="start" justify="between" gap="3">
                        <Flex direction="column" gap="1">
                          <Text weight="medium">{map.title}</Text>
                          <Text color="gray" size="2">
                            {map.subjectLabel}
                          </Text>
                        </Flex>
                        <Text color="gray" size="1">
                          {map.updatedAt.toLocaleDateString(intlLocale)}
                        </Text>
                      </Flex>
                      <Text color="gray" size="2">
                        {map.description ?? messages.mapsHome.workspaceMaps.emptyDescription}
                      </Text>
                      <Button asChild>
                        <Link href={workspaceMapPath(workspaceSlug, map.id)}>
                          {messages.mapsHome.workspaceMaps.openMap}
                        </Link>
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </ScrollArea>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
