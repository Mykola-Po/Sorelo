import { z } from "zod";

import { conceptTypeEnum, relationTypeEnum } from "@/shared/db/schema";

const roundedCoordinateSchema = z
  .number()
  .finite()
  .min(0)
  .max(100000)
  .transform((value) => Math.round(value));

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
  x: roundedCoordinateSchema,
  y: roundedCoordinateSchema,
});

export const patchConceptPositionsRouteSchema = z.object({
  positions: z
    .array(
      z.object({
        conceptId: z.string().uuid(),
        x: roundedCoordinateSchema,
        y: roundedCoordinateSchema,
      })
    )
    .min(1)
    .max(250),
});

export const createLinkRouteSchema = z.object({
  sourceConceptId: z.string().uuid(),
  targetConceptId: z.string().uuid(),
  relationType: z.enum(relationTypeEnum.enumValues),
  strength: z.number().int().min(1).max(5),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateLinkRouteSchema = createLinkRouteSchema;
