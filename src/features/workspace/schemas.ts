import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(64).optional().or(z.literal("")),
});

export const switchWorkspaceSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
});

export const updateMemberRoleSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  userId: z.string().uuid(),
  role: z.enum(["viewer", "editor", "admin"]),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
