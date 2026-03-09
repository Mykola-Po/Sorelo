import {
  Avatar,
  Box,
  Button,
  DropdownMenu,
  Flex,
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

type ProductShellProps = {
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
  user,
  workspaces,
  activeWorkspaceSlug,
  children,
}: ProductShellProps) {
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
                <Text color="gray" size="1" className="brand-subtitle">
                  Explainable human maps
                </Text>
              </Flex>
            </Flex>

            <Flex justify="center" className="topbar-workspace-zone">
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspaceSlug={activeWorkspaceSlug}
              />
            </Flex>

            <Flex
              align="center"
              gap="2"
              wrap="wrap"
              className="product-topbar-right"
            >
              {activeWorkspace ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <Button
                      type="button"
                      size="1"
                      variant="surface"
                      color="gray"
                    >
                      Settings
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item asChild>
                      <Link href={workspaceMapsPath(activeWorkspace.slug)}>
                        Maps
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href={workspaceMembersPath(activeWorkspace.slug)}>
                        Members
                      </Link>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              ) : null}
              <Flex align="center" gap="2" className="topbar-user">
                <Avatar
                  fallback={
                    user.fullName?.[0] ?? user.email[0]?.toUpperCase() ?? "S"
                  }
                  size="2"
                  radius="full"
                />
                <Flex direction="column" gap="1">
                  <Text size="1" weight="medium">
                    {user.fullName ?? "Signed in user"}
                  </Text>
                  <Text size="1" color="gray">
                    {user.email}
                  </Text>
                </Flex>
              </Flex>
              <form action={signOutAction}>
                <Button type="submit" variant="soft" color="gray" size="1">
                  Sign out
                </Button>
              </form>
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
