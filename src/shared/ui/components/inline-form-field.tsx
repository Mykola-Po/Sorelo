import { Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type InlineFormFieldProps = {
  label: string;
  error?: string | undefined;
  children: ReactNode;
};

export function InlineFormField({
  label,
  error,
  children,
}: InlineFormFieldProps) {
  return (
    <Flex direction="column" gap="2">
      <Text as="label" size="2" weight="medium">
        {label}
      </Text>
      {children}
      {error ? (
        <Text color="red" size="1">
          {error}
        </Text>
      ) : null}
    </Flex>
  );
}
