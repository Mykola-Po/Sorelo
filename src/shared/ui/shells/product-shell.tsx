import {
  Avatar,
  Box,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";
import type { ReactNode } from "react";

import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { signOutAction } from "@/shared/auth/actions";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import { PathnameLocaleSwitcher } from "@/shared/ui/components/pathname-locale-switcher";
import { ProductPrimaryNav } from "@/shared/ui/shells/product-primary-nav";

type ProductShellProps = {
  locale: SupportedLocale;
  user: {
    fullName: string | null;
    email: string;
  };
  workspaces: Array<{
    id: string;
    slug: string;
    name: string;
    role: string;
  }>;
  activeWorkspaceSlug?: string | undefined;
  children: ReactNode;
};

export function ProductShell({
  locale,
  user,
  workspaces,
  activeWorkspaceSlug,
  children,
}: ProductShellProps) {
  const messages = getAppShellMessages(locale);
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.slug === activeWorkspaceSlug
  );

  return (
    <div className="viewport-shell app-shell" data-surface-mode="operational">
      <Flex direction="column" className="product-shell">
        <div className="product-topbar">
          <Flex
            align="center"
            justify="between"
            gap="3"
            wrap="wrap"
            className="product-topbar-row"
          >
            <Flex align="center" gap="2" className="topbar-brand-zone">
              <Flex align="center" gap="2" className="brand-lockup">
                <Text size="4" weight="bold">
                  Sorelo
                </Text>
                <Text size="1" color="gray" className="brand-subtitle">
                  {messages.shell.brandNote}
                </Text>
              </Flex>
            </Flex>

            <Flex justify="center" className="topbar-workspace-zone">
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspaceSlug={activeWorkspaceSlug}
                ariaLabel={messages.shell.workspaceSwitcherLabel}
              />
            </Flex>

            <Flex
              align="center"
              gap="2"
              className="product-topbar-right"
            >
              <ProductPrimaryNav
                workspaceSlug={activeWorkspace?.slug}
                mapsLabel={messages.shell.maps}
                membersLabel={messages.shell.members}
              />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton
                    type="button"
                    size="2"
                    variant="surface"
                    color="gray"
                    radius="full"
                    className="profile-trigger"
                    aria-label={user.fullName ?? messages.shell.signedInUser}
                  >
                    <Avatar
                      fallback={
                        user.fullName?.[0] ?? user.email[0]?.toUpperCase() ?? "S"
                      }
                      size="2"
                      radius="full"
                    />
                  </IconButton>
                </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" className="profile-menu-content">
                  <Flex align="center" gap="2" className="profile-menu-header">
                    <Avatar
                      fallback={
                        user.fullName?.[0] ?? user.email[0]?.toUpperCase() ?? "S"
                      }
                      size="3"
                      radius="full"
                    />
                    <Flex direction="column" gap="1">
                      <Text size="1" weight="medium">
                        {user.fullName ?? messages.shell.signedInUser}
                      </Text>
                      <Text size="1" color="gray">
                        {user.email}
                      </Text>
                    </Flex>
                  </Flex>
                  <DropdownMenu.Separator />
                  <Box className="profile-menu-locale">
                    <PathnameLocaleSwitcher currentLocale={locale} />
                  </Box>
                  <DropdownMenu.Separator />
                  <Box className="profile-menu-actions">
                    <form action={signOutAction}>
                      <Button type="submit" variant="soft" color="gray" size="1">
                        {messages.shell.signOut}
                      </Button>
                    </form>
                  </Box>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
          </Flex>
        </div>

        <div className="product-body">
          <div className="product-page-surface">{children}</div>
        </div>
      </Flex>
    </div>
  );
}
