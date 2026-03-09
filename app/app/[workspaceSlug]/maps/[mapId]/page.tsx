import { notFound } from "next/navigation";

import { MapWorkspace } from "@/features/maps/components/map-workspace";
import { getMapWorkspaceDetail } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";

type MapWorkspacePageProps = {
  params: Promise<{
    workspaceSlug: string;
    mapId: string;
  }>;
};

export default async function MapWorkspacePage({
  params,
}: MapWorkspacePageProps) {
  const { workspaceSlug, mapId } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const detail = await getMapWorkspaceDetail(mapId, access.workspace.id);

  if (!detail) {
    notFound();
  }

  return (
    <MapWorkspace
      workspaceSlug={workspaceSlug}
      workspaceRole={access.role}
      map={detail.map}
      availableMaps={detail.availableMaps}
      concepts={detail.concepts}
      links={detail.links}
      scenarios={detail.scenarios}
      runs={detail.runs}
    />
  );
}
