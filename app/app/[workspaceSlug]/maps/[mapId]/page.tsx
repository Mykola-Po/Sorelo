import { z } from "zod";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MapWorkspace } from "@/features/maps/components/map-workspace";
import { getMapWorkspaceChromeData } from "@/features/maps/queries";
import type { InspectorSelection } from "@/features/inspector/types";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { LOCALE_COOKIE, resolveSupportedLocale } from "@/shared/i18n/config";

type MapWorkspacePageProps = {
  params: Promise<{
    workspaceSlug: string;
    mapId: string;
  }>;
  searchParams: Promise<{
    panel?: string | string[];
    conceptId?: string | string[];
    linkId?: string | string[];
  }>;
};

const searchParamsSchema = z.object({
  panel: z.enum(["learning", "inspector"]).optional(),
  conceptId: z.string().uuid().optional(),
  linkId: z.string().uuid().optional(),
});

function readSearchParam(value?: string | string[]) {
  return typeof value === "string" ? value : undefined;
}

function buildInspectorSelection(input: {
  conceptId?: string | undefined;
  linkId?: string | undefined;
}): InspectorSelection | null {
  if (input.conceptId) {
    return { kind: "concept", id: input.conceptId };
  }

  if (input.linkId) {
    return { kind: "link", id: input.linkId };
  }

  return null;
}

export default async function MapWorkspacePage({
  params,
  searchParams,
}: MapWorkspacePageProps) {
  const { workspaceSlug, mapId } = await params;
  const rawSearchParams = await searchParams;
  const parsedSearchParams = searchParamsSchema.safeParse({
    panel: readSearchParam(rawSearchParams.panel),
    conceptId: readSearchParam(rawSearchParams.conceptId),
    linkId: readSearchParam(rawSearchParams.linkId),
  });
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

  const initialInspectorSelection = parsedSearchParams.success
    ? buildInspectorSelection(parsedSearchParams.data)
    : null;
  const initialPanelTab =
    parsedSearchParams.success &&
    parsedSearchParams.data.panel === "learning"
      ? "learning"
      : initialInspectorSelection
        ? "inspector"
        : undefined;

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
      {...(initialPanelTab ? { initialPanelTab } : {})}
      {...(initialInspectorSelection
        ? { initialInspectorSelection }
        : {})}
    />
  );
}
