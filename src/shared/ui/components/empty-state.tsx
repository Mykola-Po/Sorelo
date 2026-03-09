import { Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Flex
      direction="column"
      gap="3"
      align="start"
      justify="center"
      className="empty-state"
    >
      <Heading size="5">{title}</Heading>
      <Text color="gray" size="3">
        {description}
      </Text>
      {action}
    </Flex>
  );
}
