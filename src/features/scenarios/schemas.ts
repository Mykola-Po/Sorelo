import { z } from "zod";

export const createScenarioSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  title: z.string().trim().max(160).optional().nullable(),
  situation: z.string().trim().min(3).max(2000),
  seedConceptIds: z.array(z.string().uuid()).default([]),
});

export const runScenarioSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  scenarioId: z.string().uuid().optional().nullable(),
  triggerText: z.string().trim().max(2000).optional().nullable(),
  seedConceptIds: z.array(z.string().uuid()).default([]),
});
