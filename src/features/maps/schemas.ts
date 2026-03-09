import { z } from "zod";

export const createMapSchema = z.object({
  workspaceSlug: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(80).optional().nullable(),
  subjectLabel: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const renameMapSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  subjectLabel: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const archiveMapSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
});
