import { Card, Flex, Skeleton } from "@radix-ui/themes";

export default function MapWorkspaceLoading() {
  return (
    <div className="map-screen">
      <div className="page-stack">
        <Flex align="start" justify="between" gap="4" wrap="wrap">
          <Flex direction="column" gap="2">
            <Skeleton width="220px" height="22px" />
            <Skeleton width="520px" height="14px" />
            <Skeleton width="360px" height="14px" />
          </Flex>
          <Flex gap="2" wrap="wrap">
            <Skeleton width="220px" height="32px" />
            <Skeleton width="100px" height="32px" />
            <Skeleton width="100px" height="32px" />
            <Skeleton width="120px" height="32px" />
          </Flex>
        </Flex>

        <div className="map-workspace-grid">
          <Card className="map-panel">
            <Flex direction="column" gap="3" height="100%">
              <Skeleton width="240px" height="32px" />
              <Skeleton width="100%" height="100%" />
            </Flex>
          </Card>

          <Card className="canvas-card">
            <Flex direction="column" gap="3" height="100%">
              <Skeleton width="300px" height="18px" />
              <Skeleton width="100%" height="100%" />
            </Flex>
          </Card>
        </div>
      </div>
    </div>
  );
}
