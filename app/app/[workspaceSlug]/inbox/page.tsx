import { z } from "zod";

import { InboxWorkbench } from "@/features/inbox/components/inbox-workbench";
import {
  getInboxItemDetailForUserQuery,
  listInboxItemsForUserQuery,
} from "@/features/inbox/queries";
import { listMapsForWorkspace } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";

// Hidden route by design: Inbox stays internal until review/apply becomes a
// workspace-visible workflow with queue semantics and role-aware review.
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
  const { user, access } = await requireWorkspaceAccess(workspaceSlug);
  const [items, availableMaps] = await Promise.all([
    listInboxItemsForUserQuery(user.id),
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
        detail = await getInboxItemDetailForUserQuery(user.id, selectedItemId);

        if (!detail) {
          selectionError =
            "The requested Inbox item does not exist or is not available to the current user.";
        }
      }
    }
  } else if (items[0]) {
    selectedItemId = items[0].id;
    detail = await getInboxItemDetailForUserQuery(user.id, items[0].id);
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
