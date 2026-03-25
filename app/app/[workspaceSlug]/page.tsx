import { cookies } from "next/headers";

import { WorkspaceHome } from "@/features/maps/components/workspace-home";
import { getMapsHomeData } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { LOCALE_COOKIE, resolveSupportedLocale } from "@/shared/i18n/config";

type MapsHomePageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function MapsHomePage({ params }: MapsHomePageProps) {
  const { workspaceSlug } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const data = await getMapsHomeData(access.workspace.id);

  return (
    <WorkspaceHome
      locale={locale}
      workspaceSlug={workspaceSlug}
      workspaceName={access.workspace.name}
      workspaceRole={access.role}
      data={data}
    />
  );
}
