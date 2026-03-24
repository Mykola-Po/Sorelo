import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MapWorkspace } from "@/features/maps/components/map-workspace";
import { getMapWorkspaceChromeData } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { LOCALE_COOKIE, resolveSupportedLocale } from "@/shared/i18n/config";

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
  const { user, access } = await requireWorkspaceAccess(workspaceSlug);
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const detail = await getMapWorkspaceChromeData(
    mapId,
    access.workspace.id,
    user.id
  );

  if (!detail) {
    notFound();
  }

  return (
    <MapWorkspace
      locale={locale}
      workspaceSlug={workspaceSlug}
      workspaceRole={access.role}
      map={detail.map}
      availableMaps={detail.availableMaps}
      initialSnapshot={detail.initialSnapshot}
      graphMetrics={detail.graphMetrics}
      scenarios={detail.scenarios}
      runs={detail.runs}
      learningSuggestions={detail.learningSuggestions}
    />
  );
}
