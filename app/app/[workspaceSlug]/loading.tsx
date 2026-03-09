import { Card, Flex, Grid, Skeleton } from "@radix-ui/themes";

export default function WorkspaceLoading() {
  return (
    <div className="page-stack maps-home-page">
      <Flex direction="column" gap="2">
        <Skeleton width="180px" height="18px" />
        <Skeleton width="440px" height="12px" />
      </Flex>

      <Grid
        columns={{ initial: "1", md: "2" }}
        gap="4"
        className="maps-home-grid"
      >
        <Card>
          <Flex direction="column" gap="3">
            <Skeleton width="160px" height="18px" />
            <Skeleton width="100%" height="42px" />
            <Skeleton width="100%" height="42px" />
            <Skeleton width="140px" height="36px" />
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Skeleton width="200px" height="18px" />
            <Skeleton width="100%" height="84px" />
            <Skeleton width="100%" height="84px" />
          </Flex>
        </Card>

        <Card className="maps-list-card">
          <Flex direction="column" gap="3">
            <Skeleton width="180px" height="18px" />
            <Skeleton width="100%" height="92px" />
            <Skeleton width="100%" height="92px" />
          </Flex>
        </Card>
      </Grid>
    </div>
  );
}
