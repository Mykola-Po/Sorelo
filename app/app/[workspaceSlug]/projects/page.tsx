import { redirect } from "next/navigation";

import { workspaceMapsPath } from "@/shared/config/routes";

type LegacyProjectsPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function LegacyProjectsPage({
  params,
}: LegacyProjectsPageProps) {
  const { workspaceSlug } = await params;
  redirect(workspaceMapsPath(workspaceSlug));
}
