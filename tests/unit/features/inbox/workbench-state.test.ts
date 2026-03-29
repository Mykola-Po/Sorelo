import { describe, expect, it } from "vitest";

import {
  buildInboxWorkbenchHref,
  defaultInboxWorkbenchListState,
  normalizeInboxWorkbenchListState,
  toInboxWorkbenchHiddenFields,
} from "@/features/inbox/workbench-state";

describe("inbox workbench state helpers", () => {
  it("normalizes invalid list state values back to safe defaults", () => {
    const state = normalizeInboxWorkbenchListState({
      view: "invalid",
      status: "invalid",
      route: "invalid",
      mapId: "not-a-uuid",
      sort: "invalid",
      page: "0",
      pageSize: "999",
      item: "also-invalid",
    });

    expect(state).toEqual(defaultInboxWorkbenchListState);
  });

  it("preserves list state in query params and hidden fields", () => {
    const state = normalizeInboxWorkbenchListState({
      view: "all",
      status: "clarification_requested",
      route: "clarify",
      mapId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      sort: "created_desc",
      page: "3",
      pageSize: 50,
      item: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(buildInboxWorkbenchHref("demo-workspace", state)).toBe(
      "/app/demo-workspace/inbox?view=all&status=clarification_requested&route=clarify&mapId=eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee&sort=created_desc&page=3&pageSize=50&item=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    );
    expect(toInboxWorkbenchHiddenFields(state)).toEqual({
      listView: "all",
      listStatus: "clarification_requested",
      listRoute: "clarify",
      listMapId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      listSort: "created_desc",
      listPage: "3",
      listPageSize: "50",
      listItem: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
  });
});
