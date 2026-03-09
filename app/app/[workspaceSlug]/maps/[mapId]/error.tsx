"use client";

import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";

type MapWorkspaceErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MapWorkspaceError({
  error,
  reset,
}: MapWorkspaceErrorProps) {
  return (
    <div className="page-stack">
      <Card>
        <Flex direction="column" gap="3">
          <Heading size="6">The map workspace could not be rendered</Heading>
          <Text color="gray" size="2">
            Try reloading the map. If the error repeats, the route state or
            server data for this map needs attention.
          </Text>
          {error.digest ? (
            <Text color="gray" size="1">
              Digest: {error.digest}
            </Text>
          ) : null}
          <Button type="button" onClick={reset}>
            Reload map
          </Button>
        </Flex>
      </Card>
    </div>
  );
}
