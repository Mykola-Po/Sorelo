import { redirect } from "next/navigation";

import { listMapsForWorkspace } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath, workspaceMapsPath } from "@/shared/config/routes";

type WorkspaceMapsCompatPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspaceMapsCompatPage({
  params,
}: WorkspaceMapsCompatPageProps) {
  const { workspaceSlug } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const maps = await listMapsForWorkspace(access.workspace.id);
  const firstMapId = maps[0]?.id;

  if (!firstMapId) {
    redirect(workspaceMapsPath(workspaceSlug));
  }

  redirect(workspaceMapPath(workspaceSlug, firstMapId));
}
