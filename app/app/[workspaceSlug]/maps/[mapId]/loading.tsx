import { Card, Flex, Skeleton } from "@radix-ui/themes";

export default function MapWorkspaceLoading() {
  return (
    <div className="map-screen">
      <div className="page-stack map-screen-stack">
        <div className="map-canvas-layer">
          <Card className="canvas-card">
            <Flex direction="column" gap="3" height="100%">
              <Skeleton width="280px" height="18px" />
              <Skeleton width="100%" height="100%" />
            </Flex>
          </Card>
        </div>

        <div className="map-overlay-layer">
          <div className="map-overlay-top">
            <div className="map-top-strip">
              <Flex gap="2" wrap="wrap" align="center">
                <Skeleton width="96px" height="20px" />
                <Skeleton width="88px" height="20px" />
                <Skeleton width="72px" height="20px" />
              </Flex>
              <Skeleton width="124px" height="24px" />
            </div>
          </div>

          <div className="map-overlay-bottom">
            <div className="map-bottom-dock">
              <div className="map-bottom-dock-group">
                <Skeleton width="40px" height="40px" />
              </div>
              <div className="map-bottom-dock-group is-clustered">
                <Skeleton width="40px" height="40px" />
                <Skeleton width="40px" height="40px" />
              </div>
              <div className="map-bottom-dock-group">
                <Skeleton width="40px" height="40px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
