import { z } from "zod";

import { InboxWorkbench } from "@/features/inbox/components/inbox-workbench";
import {
  getInboxItemDetailForWorkspaceQuery,
  listInboxItemsForWorkspaceQuery,
} from "@/features/inbox/queries";
import { listMapsForWorkspace } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";

// Inbox is a workspace-visible intake section in the current release.
// Review and canonical apply continue in the target map's Learning panel.
export const dynamic = "force-dynamic";

const searchParamsSchema = z.object({
  item: z.string().uuid().optional(),
});

type InboxWorkbenchPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
  searchParams: Promise<{
    item?: string | string[];
  }>;
};

export default async function InboxWorkbenchPage({
  params,
  searchParams,
}: InboxWorkbenchPageProps) {
  const { workspaceSlug } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const [items, availableMaps] = await Promise.all([
    listInboxItemsForWorkspaceQuery(access.workspace.id),
    listMapsForWorkspace(access.workspace.id),
  ]);
  const rawSearchParams = await searchParams;
  const requestedItem =
    typeof rawSearchParams.item === "string" ? rawSearchParams.item : undefined;
  const parsedSearchParams = searchParamsSchema.safeParse({
    item: requestedItem,
  });

  let detail = null;
  let selectedItemId: string | undefined;
  let selectionError: string | null = null;

  if (requestedItem) {
    if (!parsedSearchParams.success) {
      selectionError =
        "The requested Inbox item id is invalid. Pick an item from the list instead.";
    } else {
      selectedItemId = parsedSearchParams.data.item;
      if (!selectedItemId) {
        selectionError =
          "The requested Inbox item id is invalid. Pick an item from the list instead.";
      } else {
        detail = await getInboxItemDetailForWorkspaceQuery(
          access.workspace.id,
          selectedItemId
        );

        if (!detail) {
          selectionError =
            "The requested Inbox item does not exist or is not available in this workspace.";
        }
      }
    }
  } else if (items[0]) {
    selectedItemId = items[0].id;
    detail = await getInboxItemDetailForWorkspaceQuery(
      access.workspace.id,
      items[0].id
    );
  }

  return (
    <InboxWorkbench
      workspaceSlug={workspaceSlug}
      workspaceName={access.workspace.name}
      availableMaps={availableMaps}
      items={items}
      selectionError={selectionError}
      detail={detail}
      {...(selectedItemId ? { selectedItemId } : {})}
    />
  );
}
