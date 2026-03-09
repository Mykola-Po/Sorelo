import { describe, expect, it } from "vitest";

import {
  canCreateProject,
  canEditTask,
  canManageMembers,
  hasWorkspaceRole,
} from "@/shared/auth/policies";

describe("workspace policies", () => {
  it("compares roles by rank", () => {
    expect(hasWorkspaceRole("owner", "admin")).toBe(true);
    expect(hasWorkspaceRole("member", "admin")).toBe(false);
  });

  it("grants project creation only to admin and owner", () => {
    expect(canCreateProject("owner")).toBe(true);
    expect(canCreateProject("admin")).toBe(true);
    expect(canCreateProject("member")).toBe(false);
  });

  it("allows task editing for admins or task creators", () => {
    expect(canEditTask("admin", "created-by", "other-user")).toBe(true);
    expect(canEditTask("member", "same-user", "same-user")).toBe(true);
    expect(canEditTask("member", "created-by", "other-user")).toBe(false);
    expect(canManageMembers("admin")).toBe(true);
  });
});
