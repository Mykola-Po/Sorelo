import { describe, expect, it } from "vitest";

import {
  canEditMapGraph,
  canManageMapMetadata,
  canCreateProject,
  canEditTask,
  canManageMembers,
  canReviewLearning,
  canViewWorkspace,
  hasWorkspaceRole,
} from "@/shared/auth/policies";

describe("workspace policies", () => {
  it("compares roles by rank", () => {
    expect(hasWorkspaceRole("owner", "admin")).toBe(true);
    expect(hasWorkspaceRole("viewer", "admin")).toBe(false);
    expect(hasWorkspaceRole("editor", "viewer")).toBe(true);
  });

  it("grants project creation only to admin and owner", () => {
    expect(canCreateProject("owner")).toBe(true);
    expect(canCreateProject("admin")).toBe(true);
    expect(canCreateProject("editor")).toBe(false);
  });

  it("derives workspace capabilities from the new role matrix", () => {
    expect(canViewWorkspace("viewer")).toBe(true);
    expect(canEditMapGraph("viewer")).toBe(false);
    expect(canEditMapGraph("editor")).toBe(true);
    expect(canReviewLearning("editor")).toBe(true);
    expect(canManageMapMetadata("admin")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
  });

  it("allows task editing for admins or editable-role creators", () => {
    expect(canEditTask("admin", "created-by", "other-user")).toBe(true);
    expect(canEditTask("editor", "same-user", "same-user")).toBe(true);
    expect(canEditTask("viewer", "same-user", "same-user")).toBe(false);
    expect(canEditTask("editor", "created-by", "other-user")).toBe(false);
  });
});
