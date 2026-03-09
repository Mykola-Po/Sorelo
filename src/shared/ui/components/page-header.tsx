import { Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Flex align="start" justify="between" gap="4" wrap="wrap">
      <Flex direction="column" gap="2">
        <Heading size="7">{title}</Heading>
        {description ? (
          <Text color="gray" size="3">
            {description}
          </Text>
        ) : null}
      </Flex>
      {actions ? <Flex gap="2">{actions}</Flex> : null}
    </Flex>
  );
}
