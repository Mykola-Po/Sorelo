import { canManageMembers, type WorkspaceRole } from "@/shared/auth/policies";

export function normalizeWorkspaceSlug(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || "workspace";
}

export function canTransitionMemberRole(
  actorRole: WorkspaceRole,
  currentTargetRole: WorkspaceRole,
  nextRole: WorkspaceRole
) {
  if (!canManageMembers(actorRole)) {
    return false;
  }

  if (currentTargetRole === "owner" || nextRole === "owner") {
    return false;
  }

  return true;
}
