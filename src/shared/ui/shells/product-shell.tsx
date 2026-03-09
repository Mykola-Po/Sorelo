import {
  Avatar,
  Box,
  Button,
  Flex,
  ScrollArea,
  Text,
} from "@radix-ui/themes";
import Link from "next/link";
import type { ReactNode } from "react";

import { switchActiveWorkspaceAction } from "@/features/workspace/actions";
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
          <Flex align="center" justify="between" gap="4" wrap="wrap">
            <Flex align="center" gap="4" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text size="5" weight="bold">
                  Sorelo
                </Text>
                <Text color="gray" size="1">
                  Explainable human maps
                </Text>
              </Flex>

              <ScrollArea
                type="auto"
                scrollbars="horizontal"
                className="workspace-switcher-scroll"
              >
                <Flex gap="2" wrap="nowrap">
                  {workspaces.map((workspace) => (
                    <form action={switchActiveWorkspaceAction} key={workspace.id}>
                      <input
                        type="hidden"
                        name="workspaceSlug"
                        value={workspace.slug}
                      />
                      <Button
                        type="submit"
                        variant={
                          workspace.slug === activeWorkspaceSlug ? "solid" : "surface"
                        }
                        color={
                          workspace.slug === activeWorkspaceSlug ? "blue" : "gray"
                        }
                      >
                        {workspace.name}
                      </Button>
                    </form>
                  ))}
                </Flex>
              </ScrollArea>

              {activeWorkspace ? (
                <Flex gap="2" wrap="wrap">
                  <Button asChild variant="ghost" color="gray">
                    <Link href={workspaceMapsPath(activeWorkspace.slug)}>Maps</Link>
                  </Button>
                  <Button asChild variant="ghost" color="gray">
                    <Link href={workspaceMembersPath(activeWorkspace.slug)}>
                      Members
                    </Link>
                  </Button>
                </Flex>
              ) : null}
            </Flex>

            <Flex align="center" gap="3" wrap="wrap">
              <Flex align="center" gap="3">
                <Avatar
                  fallback={
                    user.fullName?.[0] ?? user.email[0]?.toUpperCase() ?? "S"
                  }
                  size="3"
                  radius="full"
                />
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    {user.fullName ?? "Signed in user"}
                  </Text>
                  <Text size="1" color="gray">
                    {user.email}
                  </Text>
                </Flex>
              </Flex>
              <form action={signOutAction}>
                <Button type="submit" variant="soft" color="gray">
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
