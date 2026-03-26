import { z } from "zod";

import {
  inboxItemStatusSchema,
  inboxRouteSchema,
} from "@/features/inbox/schemas";
import { workspaceInboxPath } from "@/shared/config/routes";

const inboxWorkbenchQueueViewSchema = z.enum(["needs-attention", "all"]);
const inboxWorkbenchSortSchema = z.enum([
  "updated_desc",
  "updated_asc",
  "created_desc",
]);
const inboxWorkbenchPageSizeSchema = z.union([
  z.literal(25),
  z.literal(50),
  z.literal(100),
]);
const inboxWorkbenchItemSchema = z.string().uuid();
const inboxWorkbenchMapFilterSchema = z.union([
  z.literal("any"),
  z.string().uuid(),
]);
const inboxWorkbenchStatusFilterSchema = z.union([
  z.literal("any"),
  inboxItemStatusSchema,
]);
const inboxWorkbenchRouteFilterSchema = z.union([
  z.literal("any"),
  inboxRouteSchema,
]);

export type InboxWorkbenchQueueView = z.infer<
  typeof inboxWorkbenchQueueViewSchema
>;
export type InboxWorkbenchSort = z.infer<typeof inboxWorkbenchSortSchema>;
export type InboxWorkbenchPageSize = z.infer<
  typeof inboxWorkbenchPageSizeSchema
>;
export type InboxWorkbenchStatusFilter = z.infer<
  typeof inboxWorkbenchStatusFilterSchema
>;
export type InboxWorkbenchRouteFilter = z.infer<
  typeof inboxWorkbenchRouteFilterSchema
>;
export type InboxWorkbenchMapFilter = z.infer<
  typeof inboxWorkbenchMapFilterSchema
>;

export type InboxWorkbenchListState = {
  view: InboxWorkbenchQueueView;
  status: InboxWorkbenchStatusFilter;
  route: InboxWorkbenchRouteFilter;
  mapId: InboxWorkbenchMapFilter;
  sort: InboxWorkbenchSort;
  page: number;
  pageSize: InboxWorkbenchPageSize;
  item?: string;
};

export type InboxWorkbenchListStateInput = Partial<
  Record<keyof InboxWorkbenchListState, string | number | undefined | null>
>;

export const defaultInboxWorkbenchListState: InboxWorkbenchListState = {
  view: "needs-attention",
  status: "any",
  route: "any",
  mapId: "any",
  sort: "updated_desc",
  page: 1,
  pageSize: 25,
};

function parseField<T>(
  schema: z.ZodType<T>,
  value: string | number | undefined | null
) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function normalizeInboxWorkbenchListState(
  input: InboxWorkbenchListStateInput
): InboxWorkbenchListState {
  const page = parseField(z.coerce.number().int().min(1), input.page) ?? 1;
  const pageSize =
    parseField(inboxWorkbenchPageSizeSchema, input.pageSize) ?? 25;
  const item = parseField(inboxWorkbenchItemSchema, input.item);

  return {
    view:
      parseField(inboxWorkbenchQueueViewSchema, input.view) ??
      defaultInboxWorkbenchListState.view,
    status:
      parseField(inboxWorkbenchStatusFilterSchema, input.status) ??
      defaultInboxWorkbenchListState.status,
    route:
      parseField(inboxWorkbenchRouteFilterSchema, input.route) ??
      defaultInboxWorkbenchListState.route,
    mapId:
      parseField(inboxWorkbenchMapFilterSchema, input.mapId) ??
      defaultInboxWorkbenchListState.mapId,
    sort:
      parseField(inboxWorkbenchSortSchema, input.sort) ??
      defaultInboxWorkbenchListState.sort,
    page,
    pageSize,
    ...(item ? { item } : {}),
  };
}

export function buildInboxWorkbenchQueryParams(
  state: InboxWorkbenchListState
) {
  const params = new URLSearchParams();

  if (state.view !== defaultInboxWorkbenchListState.view) {
    params.set("view", state.view);
  }

  if (state.status !== defaultInboxWorkbenchListState.status) {
    params.set("status", state.status);
  }

  if (state.route !== defaultInboxWorkbenchListState.route) {
    params.set("route", state.route);
  }

  if (state.mapId !== defaultInboxWorkbenchListState.mapId) {
    params.set("mapId", state.mapId);
  }

  if (state.sort !== defaultInboxWorkbenchListState.sort) {
    params.set("sort", state.sort);
  }

  if (state.page !== defaultInboxWorkbenchListState.page) {
    params.set("page", state.page.toString());
  }

  if (state.pageSize !== defaultInboxWorkbenchListState.pageSize) {
    params.set("pageSize", state.pageSize.toString());
  }

  if (state.item) {
    params.set("item", state.item);
  }

  return params;
}

export function buildInboxWorkbenchHref(
  workspaceSlug: string,
  state: InboxWorkbenchListState
) {
  const params = buildInboxWorkbenchQueryParams(state);
  const basePath = workspaceInboxPath(workspaceSlug);

  return params.size > 0 ? `${basePath}?${params.toString()}` : basePath;
}

export function toInboxWorkbenchHiddenFields(
  state: InboxWorkbenchListState
) {
  return {
    listView: state.view,
    listStatus: state.status,
    listRoute: state.route,
    listMapId: state.mapId,
    listSort: state.sort,
    listPage: state.page.toString(),
    listPageSize: state.pageSize.toString(),
    ...(state.item ? { listItem: state.item } : {}),
  };
}
