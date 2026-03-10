import { Box, Container, Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <Box className="viewport-shell marketing-shell">
      <Container size="4" className="viewport-container">
        <Flex direction="column" className="marketing-grid">
          {children}
        </Flex>
      </Container>
    </Box>
  );
}
