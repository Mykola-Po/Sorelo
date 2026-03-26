import { cookies } from "next/headers";

import { InboxWorkbench } from "@/features/inbox/components/inbox-workbench";
import {
  getInboxItemDetailForWorkspaceQuery,
  listInboxItemsForWorkspaceQuery,
} from "@/features/inbox/queries";
import { normalizeInboxWorkbenchListState } from "@/features/inbox/workbench-state";
import { listMapsForWorkspace } from "@/features/maps/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { LOCALE_COOKIE, resolveSupportedLocale } from "@/shared/i18n/config";
import { getInboxWorkbenchMessages } from "@/shared/i18n/messages/inbox-workbench";

// Inbox is a workspace-visible intake section in the current release.
// Review and canonical apply continue in the target map's Learning panel.
export const dynamic = "force-dynamic";

type InboxWorkbenchPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
  searchParams: Promise<{
    view?: string | string[];
    status?: string | string[];
    route?: string | string[];
    mapId?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    item?: string | string[];
  }>;
};

export default async function InboxWorkbenchPage({
  params,
  searchParams,
}: InboxWorkbenchPageProps) {
  const { workspaceSlug } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const messages = getInboxWorkbenchMessages(locale);
  const rawSearchParams = await searchParams;
  const requestedState = normalizeInboxWorkbenchListState({
    view: typeof rawSearchParams.view === "string" ? rawSearchParams.view : undefined,
    status:
      typeof rawSearchParams.status === "string"
        ? rawSearchParams.status
        : undefined,
    route:
      typeof rawSearchParams.route === "string" ? rawSearchParams.route : undefined,
    mapId:
      typeof rawSearchParams.mapId === "string" ? rawSearchParams.mapId : undefined,
    sort: typeof rawSearchParams.sort === "string" ? rawSearchParams.sort : undefined,
    page: typeof rawSearchParams.page === "string" ? rawSearchParams.page : undefined,
    pageSize:
      typeof rawSearchParams.pageSize === "string"
        ? rawSearchParams.pageSize
        : undefined,
    item: typeof rawSearchParams.item === "string" ? rawSearchParams.item : undefined,
  });
  const [listPage, availableMaps] = await Promise.all([
    listInboxItemsForWorkspaceQuery({
      workspaceId: access.workspace.id,
      workspaceSlug,
      listState: requestedState,
    }),
    listMapsForWorkspace(access.workspace.id),
  ]);
  const listState = {
    ...requestedState,
    page: listPage.page,
    pageSize: listPage.pageSize,
  };

  let detail = null;
  const selectedItemId = listState.item;
  let selectionError: string | null = null;

  if (selectedItemId) {
    detail = await getInboxItemDetailForWorkspaceQuery(
      access.workspace.id,
      selectedItemId
    );

    if (!detail) {
      selectionError = messages.selectionUnavailableDescription;
    }
  }

  const selectedItemVisibleInList = Boolean(
    selectedItemId &&
      listPage.items.some((item) => item.id === selectedItemId)
  );

  return (
    <InboxWorkbench
      locale={locale}
      workspaceSlug={workspaceSlug}
      workspaceName={access.workspace.name}
      availableMaps={availableMaps}
      listPage={listPage}
      listState={listState}
      selectionError={selectionError}
      detail={detail}
      selectedItemVisibleInList={selectedItemVisibleInList}
      {...(selectedItemId ? { selectedItemId } : {})}
    />
  );
}
