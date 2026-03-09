import { cookies } from "next/headers";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import type { Metadata } from "next";

import { lockHandbookAction } from "@/features/docs-hub/actions";
import { HandbookUnlockCard } from "@/features/docs-hub/components/handbook-unlock-card";
import { DocumentationHub } from "@/features/docs-hub/components/documentation-hub";
import {
  DOCS_HUB_ACCESS_COOKIE,
  hasDocsHubAccess,
} from "@/features/docs-hub/access";
import { docsHubSections } from "@/features/docs-hub/content";
import { env } from "@/shared/config/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sorelo Handbook",
  description:
    "Internal documentation hub for product, data, UI, security, and operations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HandbookPage() {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DOCS_HUB_ACCESS_COOKIE)?.value;
  const hasAccess = hasDocsHubAccess(
    accessCookie,
    env.DOCS_HUB_PASSWORD,
    env.SUPABASE_SECRET_KEY
  );

  return (
    <div className="viewport-shell docs-hub-viewport">
      <div className="docs-hub-shell">
        <header className="docs-hub-topbar">
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" color="gray">
                Internal hub
              </Text>
              <Heading size="6">Sorelo handbook</Heading>
            </Flex>

            {hasAccess ? (
              <form action={lockHandbookAction}>
                <Button type="submit" size="2" variant="soft" color="gray">
                  Lock page
                </Button>
              </form>
            ) : null}
          </Flex>
        </header>

        <div className="docs-hub-surface">
          {hasAccess ? (
            <DocumentationHub sections={docsHubSections} />
          ) : (
            <div className="docs-hub-locked">
              <div className="docs-hub-locked-copy">
                <Heading size="7">Shared documentation entrypoint</Heading>
                <Text size="2" color="gray">
                  This page is designed as a strict internal hub for product,
                  data, UI, security, and operations documentation. Access is
                  gated by a shared password.
                </Text>
              </div>
              <HandbookUnlockCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
