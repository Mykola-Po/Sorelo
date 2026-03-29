import type { WorkspaceRole } from "@/shared/db/schema";

export type { WorkspaceRole } from "@/shared/db/schema";

export const workspaceRoleRank: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
} as const;

export function hasWorkspaceRole(
  currentRole: WorkspaceRole,
  requiredRole: WorkspaceRole
) {
  return workspaceRoleRank[currentRole] >= workspaceRoleRank[requiredRole];
}

export function canManageMembers(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "admin");
}

export function canOwnWorkspace(role: WorkspaceRole) {
  return role === "owner";
}

export function canManageWorkspace(role: WorkspaceRole) {
  return canOwnWorkspace(role);
}

export function canViewWorkspace(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "viewer");
}

export function canEditMapGraph(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "editor");
}

export function canManageMapMetadata(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "admin");
}

export function canReviewLearning(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "editor");
}

export function canCreateProject(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "admin");
}

export function canEditTask(
  role: WorkspaceRole,
  createdByUserId: string,
  currentUserId: string
) {
  return hasWorkspaceRole(role, "admin")
    ? true
    : canEditMapGraph(role) && createdByUserId === currentUserId;
}
