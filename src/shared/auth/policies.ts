export const workspaceRoleRank = {
  member: 1,
  admin: 2,
  owner: 3,
} as const;

export type WorkspaceRole = keyof typeof workspaceRoleRank;

export function hasWorkspaceRole(
  currentRole: WorkspaceRole,
  requiredRole: WorkspaceRole
) {
  return workspaceRoleRank[currentRole] >= workspaceRoleRank[requiredRole];
}

export function canManageMembers(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "admin");
}

export function canManageWorkspace(role: WorkspaceRole) {
  return role === "owner";
}

export function canCreateProject(role: WorkspaceRole) {
  return hasWorkspaceRole(role, "admin");
}

export function canEditTask(
  role: WorkspaceRole,
  createdByUserId: string,
  currentUserId: string
) {
  return hasWorkspaceRole(role, "admin") || createdByUserId === currentUserId;
}
