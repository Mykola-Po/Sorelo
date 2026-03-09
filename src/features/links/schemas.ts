import { z } from "zod";

export const createLinkSchema = z
  .object({
    workspaceSlug: z.string().min(1),
    mapId: z.string().uuid(),
    sourceConceptId: z.string().uuid(),
    targetConceptId: z.string().uuid(),
    relationType: z.enum([
      "causes",
      "strengthens",
      "weakens",
      "explains",
      "contradicts",
    ]),
    strength: z.coerce.number().int().min(1).max(5),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((value) => value.sourceConceptId !== value.targetConceptId, {
    path: ["targetConceptId"],
    message: "Choose a different target Concept.",
  });

export const updateLinkSchema = z
  .object({
    workspaceSlug: z.string().min(1),
    mapId: z.string().uuid(),
    linkId: z.string().uuid(),
    sourceConceptId: z.string().uuid(),
    targetConceptId: z.string().uuid(),
    relationType: z.enum([
      "causes",
      "strengthens",
      "weakens",
      "explains",
      "contradicts",
    ]),
    strength: z.coerce.number().int().min(1).max(5),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((value) => value.sourceConceptId !== value.targetConceptId, {
    path: ["targetConceptId"],
    message: "Choose a different target Concept.",
  });

export const deleteLinkSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  linkId: z.string().uuid(),
});
