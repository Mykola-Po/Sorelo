import Link from "next/link";
import { Button, Card, Flex, Grid, ScrollArea, Text } from "@radix-ui/themes";

import { CreateMapForm } from "@/features/maps/components/create-map-form";
import { getMapsHomeData } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
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
  const data = await getMapsHomeData(access.workspace.id);

  return (
    <div className="page-stack maps-home-page">
      <PageHeader
        title="Maps"
        description="A map turns scattered notes into an explainable structure of Concepts, Links, and scenario paths."
      />

      <div className="maps-home-grid">
        <SectionCard
          title="Create map"
          description="Start with one person, one map, and the first meaningful Concept."
        >
          <CreateMapForm workspaceSlug={workspaceSlug} />
        </SectionCard>

        <SectionCard
          title="Recent scenario runs"
          description="Recent checks across this workspace stay inside a bounded panel."
          className="scroll-card"
        >
          {data.recentRuns.length === 0 ? (
            <EmptyState
              title="No scenario runs yet"
              description="Runs appear after someone tests a situation against a map. Each run keeps an ordered explanation path."
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
                        <StatusBadge status={run.status} />
                      </Flex>
                      <Text color="gray" size="2">
                        {run.starter.fullName ?? run.starter.email} ·{" "}
                        {run.createdAt.toLocaleString()}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </ScrollArea>
          )}
        </SectionCard>

        <SectionCard
          title="Workspace maps"
          description="Open an existing map or create the first one for this workspace."
          className="maps-list-card"
        >
          {data.maps.length === 0 ? (
            <EmptyState
              title="No maps yet"
              description="A person's model begins with the first Concept. Create a map, then add Concepts and Links until the structure becomes explainable."
            />
          ) : (
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
                          {map.updatedAt.toLocaleDateString()}
                        </Text>
                      </Flex>
                      <Text color="gray" size="2">
                        {map.description ??
                          "Open the map to start defining Concepts, Links, and Scenarios."}
                      </Text>
                      <Button asChild>
                        <Link href={workspaceMapPath(workspaceSlug, map.id)}>
                          Open map
                        </Link>
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </ScrollArea>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
