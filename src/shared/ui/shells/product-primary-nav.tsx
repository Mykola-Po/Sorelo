"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  workspaceMapsPath,
  workspaceMembersPath,
} from "@/shared/config/routes";

type ProductPrimaryNavProps = {
  workspaceSlug?: string | undefined;
  mapsLabel: string;
  membersLabel: string;
};

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProductPrimaryNav({
  workspaceSlug,
  mapsLabel,
  membersLabel,
}: ProductPrimaryNavProps) {
  const pathname = usePathname();

  if (!workspaceSlug) {
    return null;
  }

  // Inbox is intentionally excluded here while it remains a hidden internal
  // workbench rather than a workspace-visible review/apply feature.
  const mapsHref = workspaceMapsPath(workspaceSlug);
  const membersHref = workspaceMembersPath(workspaceSlug);
  const currentPath = normalizePath(pathname ?? "");

  const isMembersActive = isCurrentPath(currentPath, membersHref);
  const isMapsActive =
    !isMembersActive && isCurrentPath(currentPath, mapsHref);

  return (
    <nav className="sl-primary-nav" aria-label="Primary navigation">
      <Link
        href={mapsHref}
        className="sl-primary-nav-link"
        data-active={isMapsActive}
        aria-current={isMapsActive ? "page" : undefined}
      >
        {mapsLabel}
      </Link>
      <Link
        href={membersHref}
        className="sl-primary-nav-link"
        data-active={isMembersActive}
        aria-current={isMembersActive ? "page" : undefined}
      >
        {membersLabel}
      </Link>
    </nav>
  );
}
