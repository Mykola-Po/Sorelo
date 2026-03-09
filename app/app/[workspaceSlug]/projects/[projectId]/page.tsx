import { redirect } from "next/navigation";

import { workspaceMapsPath } from "@/shared/config/routes";

type LegacyProjectDetailPageProps = {
  params: Promise<{
    workspaceSlug: string;
    projectId: string;
  }>;
};

export default async function LegacyProjectDetailPage({
  params,
}: LegacyProjectDetailPageProps) {
  const { workspaceSlug } = await params;
  redirect(workspaceMapsPath(workspaceSlug));
}
