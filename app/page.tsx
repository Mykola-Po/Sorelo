import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

import { getCurrentSession } from "@/shared/auth/session";
import { signInWithGoogleAction } from "@/shared/auth/actions";
import {
  LOCALE_COOKIE,
  resolveSupportedLocale,
} from "@/shared/i18n/config";
import { landingMessages } from "@/shared/i18n/messages/landing";
import { LocaleSwitcher } from "@/shared/ui/components/locale-switcher";
import { MarketingShell } from "@/shared/ui/shells/marketing-shell";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session.data.session) {
    redirect("/app");
  }

  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const copy = landingMessages[locale];

  return (
    <MarketingShell>
      <div className="marketing-page" data-locale={locale} lang={locale}>
        <header className="marketing-topbar">
          <Flex
            align="center"
            justify="between"
            gap="3"
            wrap="wrap"
            className="marketing-topbar-row"
          >
            <Flex align="center" gap="3" className="marketing-brand">
              <div className="marketing-brand-mark">S</div>
              <Flex direction="column" gap="1">
                <Text size="4" weight="bold">
                  Sorelo
                </Text>
                <Text size="1" color="gray" className="marketing-brand-note">
                  {copy.brandNote}
                </Text>
              </Flex>
            </Flex>

            <LocaleSwitcher currentLocale={locale} redirectTo="/" />
          </Flex>
        </header>

        <main className="marketing-main">
          <Grid
            columns={{ initial: "1fr", lg: "1.06fr 0.94fr" }}
            gap="7"
            align="center"
            className="marketing-hero-grid"
          >
            <Flex direction="column" gap="5" className="marketing-copy-column">
              <Badge
                color="blue"
                size="2"
                radius="full"
                variant="soft"
                className="marketing-badge"
              >
                {copy.badge}
              </Badge>

              <Flex direction="column" gap="4">
                <Heading size="9" className="marketing-title">
                  {copy.headline}
                </Heading>
                <Text size="4" color="gray" className="marketing-subheadline">
                  {copy.subheadline}
                </Text>
              </Flex>

              <div className="marketing-bullet-list">
                {copy.bullets.map((bullet) => (
                  <div key={bullet} className="marketing-bullet">
                    <span className="marketing-bullet-dot" />
                    <Text size="2">{bullet}</Text>
                  </div>
                ))}
              </div>

              <Flex direction="column" gap="3" className="marketing-cta-block">
                <Flex gap="3" wrap="wrap" align="center">
                  <form action={signInWithGoogleAction}>
                    <Button type="submit" size="4" className="marketing-cta">
                      {copy.cta}
                      <ArrowRightIcon />
                    </Button>
                  </form>
                </Flex>
                <Text size="2" color="gray" className="marketing-cta-note">
                  {copy.ctaNote}
                </Text>
              </Flex>

              <Grid
                columns={{ initial: "1fr", sm: "repeat(3, minmax(0, 1fr))" }}
                gap="3"
                className="marketing-proof-grid"
              >
                {copy.credibility.map((item) => (
                  <Card key={item.value} className="marketing-proof-card">
                    <Flex direction="column" gap="2">
                      <Text size="4" weight="bold">
                        {item.value}
                      </Text>
                      <Text size="2" color="gray">
                        {item.label}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </Flex>

            <Card className="marketing-preview-shell">
              <Flex direction="column" gap="4">
                <Flex direction="column" gap="2">
                  <Text size="2" color="gray">
                    {copy.previewEyebrow}
                  </Text>
                  <Heading size="6" className="marketing-preview-title">
                    {copy.previewTitle}
                  </Heading>
                  <Text size="2" color="gray">
                    {copy.previewBody}
                  </Text>
                </Flex>

                <div className="marketing-preview-canvas">
                  <svg
                    className="marketing-preview-lines"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="22" x2="43" y2="40" />
                    <line x1="43" y1="40" x2="68" y2="26" />
                    <line x1="68" y1="26" x2="82" y2="66" />
                  </svg>

                  <div className="marketing-preview-node marketing-preview-node-trigger">
                    <Badge radius="full" variant="soft" color="amber">
                      {copy.canvasNodes.trigger.type}
                    </Badge>
                    <Heading size="3">{copy.canvasNodes.trigger.title}</Heading>
                    <Text size="1" color="gray">
                      {copy.canvasNodes.trigger.caption}
                    </Text>
                  </div>

                  <div className="marketing-preview-node marketing-preview-node-state">
                    <Badge radius="full" variant="soft" color="blue">
                      {copy.canvasNodes.state.type}
                    </Badge>
                    <Heading size="3">{copy.canvasNodes.state.title}</Heading>
                    <Text size="1" color="gray">
                      {copy.canvasNodes.state.caption}
                    </Text>
                  </div>

                  <div className="marketing-preview-node marketing-preview-node-belief">
                    <Badge radius="full" variant="soft" color="purple">
                      {copy.canvasNodes.belief.type}
                    </Badge>
                    <Heading size="3">{copy.canvasNodes.belief.title}</Heading>
                    <Text size="1" color="gray">
                      {copy.canvasNodes.belief.caption}
                    </Text>
                  </div>

                  <div className="marketing-preview-node marketing-preview-node-reaction">
                    <Badge radius="full" variant="soft" color="grass">
                      {copy.canvasNodes.reaction.type}
                    </Badge>
                    <Heading size="3">{copy.canvasNodes.reaction.title}</Heading>
                    <Text size="1" color="gray">
                      {copy.canvasNodes.reaction.caption}
                    </Text>
                  </div>
                </div>

                <Grid columns={{ initial: "1fr", sm: "1.02fr 0.98fr" }} gap="3">
                  <Card className="marketing-trace-card">
                    <Flex direction="column" gap="3">
                      <Text size="2" color="gray">
                        {copy.scenarioLabel}
                      </Text>
                      <Text size="3" weight="medium">
                        {copy.scenarioValue}
                      </Text>
                      <Box className="marketing-trace-path">
                        <Text size="1" color="gray">
                          {copy.pathLabel}
                        </Text>
                        <Flex direction="column" gap="2">
                          {copy.pathSteps.map((step, index) => (
                            <div key={step} className="marketing-trace-step">
                              <span className="marketing-trace-index">
                                {index + 1}
                              </span>
                              <Text size="2">{step}</Text>
                            </div>
                          ))}
                        </Flex>
                      </Box>
                    </Flex>
                  </Card>

                  <Card className="marketing-inspector-card">
                    <Flex direction="column" gap="3">
                      <Text size="2" color="gray">
                        {copy.inspectorLabel}
                      </Text>
                      <Heading size="4">{copy.inspectorTitle}</Heading>
                      <Text size="2" color="gray">
                        {copy.inspectorBody}
                      </Text>
                    </Flex>
                  </Card>
                </Grid>
              </Flex>
            </Card>
          </Grid>
        </main>

        <section className="marketing-secondary-grid">
          <Card className="marketing-section-card">
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text size="2" color="gray">
                  {copy.workflowEyebrow}
                </Text>
                <Heading size="5">{copy.workflowTitle}</Heading>
              </Flex>

              <div className="marketing-workflow-list">
                {copy.workflowSteps.map((step, index) => (
                  <div key={step.title} className="marketing-workflow-step">
                    <span className="marketing-workflow-index">{index + 1}</span>
                    <Flex direction="column" gap="1">
                      <Text size="3" weight="medium">
                        {step.title}
                      </Text>
                      <Text size="2" color="gray">
                        {step.body}
                      </Text>
                    </Flex>
                  </div>
                ))}
              </div>
            </Flex>
          </Card>

          <Card className="marketing-section-card">
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text size="2" color="gray">
                  {copy.principlesEyebrow}
                </Text>
                <Heading size="5">{copy.principlesTitle}</Heading>
              </Flex>

              <div className="marketing-principles-list">
                {copy.principles.map((item) => (
                  <div key={item.title} className="marketing-principle-item">
                    <Text size="3" weight="medium">
                      {item.title}
                    </Text>
                    <Text size="2" color="gray">
                      {item.body}
                    </Text>
                  </div>
                ))}
              </div>
            </Flex>
          </Card>
        </section>
      </div>
    </MarketingShell>
  );
}
