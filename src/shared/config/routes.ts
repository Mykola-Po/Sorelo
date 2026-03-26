export const ACTIVE_WORKSPACE_COOKIE = "sorela-active-workspace";
export const HANDBOOK_PATH = "/handbook" as const;

export function workspaceRootPath(workspaceSlug: string) {
  return `/app/${workspaceSlug}`;
}

export function workspaceMapsPath(workspaceSlug: string) {
  return `/app/${workspaceSlug}`;
}

export function workspaceMapPath(workspaceSlug: string, mapId: string) {
  return `/app/${workspaceSlug}/maps/${mapId}`;
}

export function workspaceInboxPath(workspaceSlug: string) {
  return `/app/${workspaceSlug}/inbox`;
}

export function workspaceMembersPath(workspaceSlug: string) {
  return `/app/${workspaceSlug}/settings/members`;
}

export function handbookPath() {
  return HANDBOOK_PATH;
}
