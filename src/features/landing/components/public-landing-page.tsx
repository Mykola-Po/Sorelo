import { ArrowRightIcon } from "@radix-ui/react-icons";
import { Badge, Button, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";

import {
  CausalPathOrnament,
  MapGridBackground,
  NodeClusterOrnament,
  SectionSignalDivider,
} from "@/features/landing/components/landing-ornaments";
import { signInWithGoogleAction } from "@/shared/auth/actions";
import type { SupportedLocale } from "@/shared/i18n/config";
import type { LandingMessageSet } from "@/shared/i18n/messages/landing";
import { LocaleSwitcher } from "@/shared/ui/components/locale-switcher";
import { MarketingShell } from "@/shared/ui/shells/marketing-shell";

type PublicLandingPageProps = {
  locale: SupportedLocale;
  copy: LandingMessageSet;
};

type SectionIntroProps = {
  eyebrow: string;
  title: string;
  body: string;
};

function SectionIntro({ eyebrow, title, body }: SectionIntroProps) {
  return (
    <Flex direction="column" gap="3" className="marketing-section-intro">
      <Text size="1" className="marketing-section-eyebrow">
        {eyebrow}
      </Text>
      <Flex direction="column" gap="2">
        <Heading as="h2" size="7" className="marketing-section-title">
          {title}
        </Heading>
        <Text size="3" color="gray" className="marketing-section-body">
          {body}
        </Text>
      </Flex>
    </Flex>
  );
}

function PreviewCanvas({ copy }: { copy: LandingMessageSet }) {
  return (
    <>
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
          <Heading as="h3" size="3">
            {copy.canvasNodes.trigger.title}
          </Heading>
          <Text size="1" color="gray">
            {copy.canvasNodes.trigger.caption}
          </Text>
        </div>

        <div className="marketing-preview-node marketing-preview-node-state">
          <Badge radius="full" variant="soft" color="blue">
            {copy.canvasNodes.state.type}
          </Badge>
          <Heading as="h3" size="3">
            {copy.canvasNodes.state.title}
          </Heading>
          <Text size="1" color="gray">
            {copy.canvasNodes.state.caption}
          </Text>
        </div>

        <div className="marketing-preview-node marketing-preview-node-belief">
          <Badge radius="full" variant="soft" color="purple">
            {copy.canvasNodes.belief.type}
          </Badge>
          <Heading as="h3" size="3">
            {copy.canvasNodes.belief.title}
          </Heading>
          <Text size="1" color="gray">
            {copy.canvasNodes.belief.caption}
          </Text>
        </div>

        <div className="marketing-preview-node marketing-preview-node-reaction">
          <Badge radius="full" variant="soft" color="grass">
            {copy.canvasNodes.reaction.type}
          </Badge>
          <Heading as="h3" size="3">
            {copy.canvasNodes.reaction.title}
          </Heading>
          <Text size="1" color="gray">
            {copy.canvasNodes.reaction.caption}
          </Text>
        </div>
      </div>

      <Grid columns={{ initial: "1fr", sm: "1.05fr 0.95fr" }} gap="3">
        <Card className="marketing-trace-card">
          <Flex direction="column" gap="3">
            <Text size="2" color="gray">
              {copy.scenarioLabel}
            </Text>
            <Text size="3" weight="medium">
              {copy.scenarioValue}
            </Text>
            <div className="marketing-trace-path">
              <Text size="1" color="gray">
                {copy.pathLabel}
              </Text>
              <Flex direction="column" gap="2">
                {copy.pathSteps.map((step, index) => (
                  <div key={step} className="marketing-trace-step">
                    <span className="marketing-trace-index">{index + 1}</span>
                    <Text size="2">{step}</Text>
                  </div>
                ))}
              </Flex>
            </div>
          </Flex>
        </Card>

        <Card className="marketing-inspector-card">
          <Flex direction="column" gap="3">
            <Text size="2" color="gray">
              {copy.inspectorLabel}
            </Text>
            <Heading as="h3" size="4">
              {copy.inspectorTitle}
            </Heading>
            <Text size="2" color="gray">
              {copy.inspectorBody}
            </Text>
          </Flex>
        </Card>
      </Grid>
    </>
  );
}

export function PublicLandingPage({
  locale,
  copy,
}: PublicLandingPageProps) {
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
          <div className="marketing-content-stack">
            <section className="marketing-hero-section">
              <Grid
                columns={{ initial: "1fr", lg: "minmax(0, 1.02fr) minmax(0, 0.98fr)" }}
                gap="7"
                align="center"
                className="marketing-hero-grid"
              >
                <Flex
                  direction="column"
                  gap="5"
                  className="marketing-copy-column"
                >
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
                    <Heading as="h1" size="9" className="marketing-title">
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

                  <NodeClusterOrnament className="sl-landing-hero-cluster" />

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
                    columns={{ initial: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }}
                    gap="3"
                    className="marketing-proof-grid"
                  >
                    {copy.credibility.map((item) => (
                      <Card key={item.value} className="marketing-proof-card">
                        <Flex direction="column" gap="2">
                          <Text size="2" weight="medium" className="marketing-proof-value">
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

                <Card className="marketing-preview-shell marketing-hero-preview-shell">
                  <MapGridBackground className="sl-landing-preview-grid" />
                  <Flex direction="column" gap="4" className="marketing-preview-content">
                    <Flex direction="column" gap="2">
                      <Text size="2" className="marketing-section-eyebrow">
                        {copy.previewEyebrow}
                      </Text>
                      <Heading as="h2" size="6" className="marketing-preview-title">
                        {copy.previewTitle}
                      </Heading>
                      <Text size="2" color="gray">
                        {copy.previewBody}
                      </Text>
                    </Flex>

                    <PreviewCanvas copy={copy} />
                  </Flex>
                </Card>
              </Grid>
            </section>

            <section className="marketing-section">
              <SectionIntro
                eyebrow={copy.problemEyebrow}
                title={copy.problemTitle}
                body={copy.problemBody}
              />
              <SectionSignalDivider />

              <Grid
                columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
                gap="4"
                className="marketing-problem-grid"
              >
                {copy.problemPoints.map((item) => (
                  <Card key={item.title} className="marketing-problem-card">
                    <Flex direction="column" gap="3">
                      <Heading as="h3" size="4">
                        {item.title}
                      </Heading>
                      <Text size="2" color="gray">
                        {item.body}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </section>

            <section className="marketing-section">
              <SectionIntro
                eyebrow={copy.modelEyebrow}
                title={copy.modelTitle}
                body={copy.modelBody}
              />
              <SectionSignalDivider />

              <Grid
                columns={{ initial: "1fr", lg: "repeat(5, minmax(0, 1fr))" }}
                gap="3"
                className="marketing-model-grid"
              >
                {copy.modelSteps.map((step, index) => (
                  <Card key={step.title} className="marketing-model-step-card">
                    <Flex direction="column" gap="3">
                      <span className="marketing-step-index">{index + 1}</span>
                      <Flex direction="column" gap="2">
                        <Heading as="h3" size="4">
                          {step.title}
                        </Heading>
                        <Text size="2" color="gray">
                          {step.body}
                        </Text>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </section>

            <section className="marketing-section">
              <SectionIntro
                eyebrow={copy.surfacesEyebrow}
                title={copy.surfacesTitle}
                body={copy.surfacesBody}
              />
              <SectionSignalDivider />

              <Grid
                columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                gap="4"
                className="marketing-surface-grid"
              >
                {copy.surfaces.map((surface) => (
                  <Card key={surface.name} className="marketing-surface-card">
                    <Flex direction="column" gap="3">
                      <Text size="1" className="marketing-surface-name">
                        {surface.name}
                      </Text>
                      <Heading as="h3" size="4">
                        {surface.title}
                      </Heading>
                      <Text size="2" color="gray">
                        {surface.body}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </section>

            <section className="marketing-section">
              <SectionIntro
                eyebrow={copy.exampleEyebrow}
                title={copy.exampleTitle}
                body={copy.exampleBody}
              />
              <SectionSignalDivider />

              <Grid
                columns={{ initial: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
                gap="4"
                className="marketing-example-grid"
              >
                {copy.exampleInsights.map((item) => (
                  <Card key={item.title} className="marketing-example-card">
                    <Flex direction="column" gap="3">
                      <Heading as="h3" size="4">
                        {item.title}
                      </Heading>
                      <Text size="2" color="gray">
                        {item.body}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </section>

            <section className="marketing-section marketing-section-emphasis">
              <Grid
                columns={{ initial: "1fr", lg: "minmax(0, 0.72fr) minmax(0, 1.28fr)" }}
                gap="5"
                className="marketing-session-layout"
              >
                <SectionIntro
                  eyebrow={copy.sessionEyebrow}
                  title={copy.sessionTitle}
                  body={copy.sessionBody}
                />

                <div className="marketing-session-grid">
                  {copy.sessionSteps.map((step, index) => (
                    <Card key={step.title} className="marketing-session-step">
                      <Flex align="start" gap="3">
                        <span className="marketing-step-index marketing-step-index-large">
                          {index + 1}
                        </span>
                        <Flex direction="column" gap="2">
                          <Heading as="h3" size="4">
                            {step.title}
                          </Heading>
                          <Text size="2" color="gray">
                            {step.body}
                          </Text>
                        </Flex>
                      </Flex>
                    </Card>
                  ))}
                </div>
              </Grid>
            </section>

            <section className="marketing-section">
              <SectionIntro
                eyebrow={copy.guardrailsEyebrow}
                title={copy.guardrailsTitle}
                body={copy.guardrailsBody}
              />
              <SectionSignalDivider />

              <Grid
                columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                gap="4"
                className="marketing-guardrail-grid"
              >
                {copy.guardrails.map((item) => (
                  <Card key={item.title} className="marketing-guardrail-card">
                    <Flex direction="column" gap="3">
                      <Heading as="h3" size="4">
                        {item.title}
                      </Heading>
                      <Text size="2" color="gray">
                        {item.body}
                      </Text>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </section>

            <section className="marketing-section marketing-final-section">
              <Card className="marketing-final-card">
                <CausalPathOrnament className="sl-landing-final-ornament" />
                <Flex
                  direction="column"
                  gap="4"
                  align="start"
                  className="marketing-final-content"
                >
                  <Text size="1" className="marketing-section-eyebrow">
                    {copy.finalEyebrow}
                  </Text>
                  <Flex direction="column" gap="2">
                    <Heading as="h2" size="8" className="marketing-final-title">
                      {copy.finalTitle}
                    </Heading>
                    <Text size="3" color="gray" className="marketing-final-body">
                      {copy.finalBody}
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="3" className="marketing-cta-block">
                    <form action={signInWithGoogleAction}>
                      <Button type="submit" size="4" className="marketing-cta">
                        {copy.cta}
                        <ArrowRightIcon />
                      </Button>
                    </form>
                    <Text size="2" color="gray" className="marketing-cta-note">
                      {copy.ctaNote}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </MarketingShell>
  );
}
