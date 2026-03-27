import { describe, expect, it } from "vitest";

import {
  canTransitionMemberRole,
  normalizeWorkspaceSlug,
} from "@/features/workspace/utils";

describe("workspace utils", () => {
  it("normalizes slugs into lowercase URL-safe identifiers", () => {
    expect(normalizeWorkspaceSlug(" Product Ops Team ")).toBe(
      "product-ops-team"
    );
  });

  it("prevents non-admin role transitions and owner rewrites", () => {
    expect(canTransitionMemberRole("viewer", "editor", "admin")).toBe(false);
    expect(canTransitionMemberRole("admin", "viewer", "editor")).toBe(true);
    expect(canTransitionMemberRole("owner", "owner", "editor")).toBe(false);
  });
});
