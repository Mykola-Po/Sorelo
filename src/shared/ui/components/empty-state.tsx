import { Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  eyebrow,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Flex
      direction="column"
      gap="4"
      align="start"
      justify="center"
      className={className ? `empty-state ${className}` : "empty-state"}
    >
      {eyebrow ? <div className="empty-state-eyebrow">{eyebrow}</div> : null}
      <Flex direction="column" gap="2" className="empty-state-copy">
        <Heading size="4" className="empty-state-title">
          {title}
        </Heading>
        <Text size="2" className="empty-state-description">
          {description}
        </Text>
      </Flex>
      {action ? (
        <Flex gap="2" wrap="wrap" className="empty-state-actions">
          {action}
        </Flex>
      ) : null}
    </Flex>
  );
}
