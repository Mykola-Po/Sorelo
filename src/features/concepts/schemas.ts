import { z } from "zod";

const coordinateSchema = z.coerce.number().int().min(-2000).max(4000);

export const createConceptSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  conceptType: z.enum([
    "thought",
    "state",
    "belief",
    "experience",
    "fact",
    "trigger",
    "custom",
  ]),
  summary: z.string().trim().max(280).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  x: coordinateSchema.optional().nullable(),
  y: coordinateSchema.optional().nullable(),
});

export const updateConceptSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  conceptId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  conceptType: z.enum([
    "thought",
    "state",
    "belief",
    "experience",
    "fact",
    "trigger",
    "custom",
  ]),
  summary: z.string().trim().max(280).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  x: coordinateSchema,
  y: coordinateSchema,
});

export const repositionConceptSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  conceptId: z.string().uuid(),
  x: coordinateSchema,
  y: coordinateSchema,
});

export const archiveConceptSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  conceptId: z.string().uuid(),
});
