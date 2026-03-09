import { z } from "zod";

export const createProjectSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  projectId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const archiveProjectSchema = z.object({
  workspaceSlug: z.string().trim().min(2).max(64),
  projectId: z.string().uuid(),
});
