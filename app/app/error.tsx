"use client";

import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="page-stack">
      <Card>
        <Flex direction="column" gap="3">
          <Heading size="6">This part of the app failed to load</Heading>
          <Text color="gray" size="2">
            Refresh the route state and try again. The rest of the workspace
            session is still intact.
          </Text>
          {error.digest ? (
            <Text color="gray" size="1">
              Digest: {error.digest}
            </Text>
          ) : null}
          <Flex gap="2" wrap="wrap">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
          </Flex>
        </Flex>
      </Card>
    </div>
  );
}
