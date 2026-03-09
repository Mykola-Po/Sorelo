import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  children,
  action,
  className,
}: SectionCardProps) {
  return (
    <Card className={className}>
      <Flex direction="column" gap="4">
        <Flex align="start" justify="between" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Heading size="4">{title}</Heading>
            {description ? (
              <Text color="gray" size="2">
                {description}
              </Text>
            ) : null}
          </Flex>
          {action}
        </Flex>
        {children}
      </Flex>
    </Card>
  );
}
