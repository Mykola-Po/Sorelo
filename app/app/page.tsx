import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getLastActiveWorkspaceForUser,
  listWorkspacesForUser,
} from "@/features/workspace/queries";
import { requireUser } from "@/shared/auth/session";
import {
  ACTIVE_WORKSPACE_COOKIE,
  workspaceRootPath,
} from "@/shared/config/routes";

export default async function AppRootPage() {
  const user = await requireUser();
  const workspaces = await listWorkspacesForUser(user.id);

  if (workspaces.length === 0) {
    redirect("/app/new-workspace");
  }

  const lastActiveWorkspace = await getLastActiveWorkspaceForUser(user.id);
  if (lastActiveWorkspace) {
    redirect(workspaceRootPath(lastActiveWorkspace.slug));
  }

  const cookieStore = await cookies();
  const preferredWorkspace = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const resolvedWorkspace =
    workspaces.find((workspace) => workspace.slug === preferredWorkspace) ??
    workspaces[0];

  if (!resolvedWorkspace) {
    redirect("/app/new-workspace");
  }

  redirect(workspaceRootPath(resolvedWorkspace.slug));
}
