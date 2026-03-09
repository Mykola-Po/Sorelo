import { ArrowRightIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";

import { signInWithGoogleAction } from "@/shared/auth/actions";
import { MarketingShell } from "@/shared/ui/shells/marketing-shell";

const highlights = [
  "Concepts as meaningful units",
  "Links that explain influence",
  "Inspector for detailed editing",
  "Scenarios for explainable reaction paths",
];

export default function HomePage() {
  return (
    <MarketingShell>
      <Grid
        columns={{ initial: "1fr", md: "1.2fr 0.8fr" }}
        gap="6"
        align="center"
      >
        <Flex direction="column" gap="5">
          <Badge color="blue" size="2" radius="full" variant="soft">
            Sorelo source of truth fixed
          </Badge>
          <Flex direction="column" gap="4">
            <Heading size="9" className="hero-title">
              Build an explainable map of a person through Concepts, Links, and
              Scenarios.
            </Heading>
            <Text size="4" color="gray" className="hero-copy">
              Sorelo helps turn scattered observations into a structured human
              model. The interface stays calm and obvious. No endless page
              scroll. Dense work stays inside bounded panels instead of the
              whole page.
            </Text>
          </Flex>
          <Flex gap="3" wrap="wrap">
            <form action={signInWithGoogleAction}>
              <Button type="submit" size="4">
                Continue with Google
                <ArrowRightIcon />
              </Button>
            </form>
          </Flex>
        </Flex>
        <Card className="hero-panel">
          <Flex direction="column" gap="4">
            <Text size="2" color="gray">
              Product direction
            </Text>
            <Box className="metric-strip">
              {highlights.map((highlight) => (
                <Box key={highlight} className="metric-chip">
                  <Text size="2">{highlight}</Text>
                </Box>
              ))}
            </Box>
            <Text size="3">
              The current foundation already covers auth, workspace tenancy,
              permissions, and database structure. The next domain layer pivots
              toward Concepts, Links, Inspector workflows, and Scenarios.
            </Text>
          </Flex>
        </Card>
      </Grid>
    </MarketingShell>
  );
}
