import {
  Avatar,
  Box,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";
import Link from "next/link";
import type { ReactNode } from "react";

import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { signOutAction } from "@/shared/auth/actions";
import {
  workspaceMapsPath,
  workspaceMembersPath,
} from "@/shared/config/routes";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import { PathnameLocaleSwitcher } from "@/shared/ui/components/pathname-locale-switcher";

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
    <Box className="viewport-shell app-shell">
      <Flex direction="column" className="product-shell">
        <Box className="product-topbar">
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
              gap="0"
              className="product-topbar-right"
            >
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
                  {activeWorkspace ? (
                    <>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item asChild>
                        <Link href={workspaceMapsPath(activeWorkspace.slug)}>
                          {messages.shell.maps}
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link href={workspaceMembersPath(activeWorkspace.slug)}>
                          {messages.shell.members}
                        </Link>
                      </DropdownMenu.Item>
                    </>
                  ) : null}
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
        </Box>

        <Box className="product-body">
          <div className="product-page-surface">{children}</div>
        </Box>
      </Flex>
    </Box>
  );
}
