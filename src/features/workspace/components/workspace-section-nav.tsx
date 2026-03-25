import Link from "next/link";
import { Button, Flex, Text } from "@radix-ui/themes";

import {
  workspaceInboxPath,
  workspaceMembersPath,
  workspaceRootPath,
} from "@/shared/config/routes";

type WorkspaceSectionKey = "overview" | "inbox" | "members";

type WorkspaceSectionNavProps = {
  workspaceSlug: string;
  currentSection: WorkspaceSectionKey;
};

const workspaceSections: Array<{
  key: WorkspaceSectionKey;
  label: string;
  href: (workspaceSlug: string) => string;
}> = [
  {
    key: "overview",
    label: "Overview",
    href: workspaceRootPath,
  },
  {
    key: "inbox",
    label: "Inbox",
    href: workspaceInboxPath,
  },
  {
    key: "members",
    label: "Members",
    href: workspaceMembersPath,
  },
];

export function WorkspaceSectionNav({
  workspaceSlug,
  currentSection,
}: WorkspaceSectionNavProps) {
  return (
    <nav
      aria-label="Workspace sections"
      className="sl-workspace-section-nav"
    >
      <Flex
        align="center"
        gap="3"
        wrap="wrap"
        className="sl-workspace-section-nav-inner"
      >
        <Text
          size="1"
          weight="medium"
          color="gray"
          className="sl-workspace-section-nav-label"
        >
          Workspace sections
        </Text>
        <Flex gap="2" wrap="wrap">
          {workspaceSections.map((section) => {
            const isActive = section.key === currentSection;

            return (
              <Button
                key={section.key}
                asChild
                size="2"
                variant={isActive ? "solid" : "soft"}
                color={isActive ? "blue" : "gray"}
                className="sl-workspace-section-link"
              >
                <Link
                  href={section.href(workspaceSlug)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {section.label}
                </Link>
              </Button>
            );
          })}
        </Flex>
      </Flex>
    </nav>
  );
}
