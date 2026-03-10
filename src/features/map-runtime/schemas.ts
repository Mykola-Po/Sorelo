import { z } from "zod";

import { conceptTypeEnum, relationTypeEnum } from "@/shared/db/schema";

export const graphViewportSchema = z.object({
  x: z.coerce.number().min(0),
  y: z.coerce.number().min(0),
  width: z.coerce.number().min(1),
  height: z.coerce.number().min(1),
  overscan: z.coerce.number().min(0).max(2000).default(240),
});

export const createConceptRouteSchema = z.object({
  title: z.string().trim().min(2).max(160),
  conceptType: z.enum(conceptTypeEnum.enumValues),
  summary: z.string().trim().max(280).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  x: z.number().int().min(0).max(100000),
  y: z.number().int().min(0).max(100000),
});

export const updateConceptRouteSchema = createConceptRouteSchema;

export const patchConceptPositionRouteSchema = z.object({
  x: z.number().int().min(0).max(100000),
  y: z.number().int().min(0).max(100000),
});

export const createLinkRouteSchema = z.object({
  sourceConceptId: z.string().uuid(),
  targetConceptId: z.string().uuid(),
  relationType: z.enum(relationTypeEnum.enumValues),
  strength: z.number().int().min(1).max(5),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateLinkRouteSchema = createLinkRouteSchema;
