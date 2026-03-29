import { z } from "zod";

import { conceptTypeEnum, relationTypeEnum } from "@/shared/db/schema";

const roundedCoordinateSchema = z
  .number()
  .finite()
  .min(0)
  .max(100000)
  .transform((value) => Math.round(value));

const graphOperationClientSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientMutationId: z.string().uuid().optional(),
});

const createConceptRouteFieldsSchema = z.object({
  expectedRevision: z.coerce.number().int().min(0),
  title: z.string().trim().min(2).max(160),
  conceptType: z.enum(conceptTypeEnum.enumValues),
  summary: z.string().trim().max(280).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  x: z.number().int().min(0).max(100000),
  y: z.number().int().min(0).max(100000),
});

export const createConceptRouteSchema = createConceptRouteFieldsSchema.merge(
  graphOperationClientSchema
);

export const updateConceptRouteSchema = z.object({
  expectedContentRevision: z.coerce.number().int().min(0),
  title: z.string().trim().min(2).max(160),
  conceptType: z.enum(conceptTypeEnum.enumValues),
  summary: z.string().trim().max(280).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const patchConceptPositionRouteSchema = z
  .object({
    expectedRevision: z.coerce.number().int().min(0),
    x: roundedCoordinateSchema,
    y: roundedCoordinateSchema,
  })
  .merge(graphOperationClientSchema);

export const patchConceptPositionsRouteSchema = z
  .object({
    expectedRevision: z.coerce.number().int().min(0),
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
  })
  .merge(graphOperationClientSchema);

export const mapGraphOpsQuerySchema = z.object({
  afterSeq: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const createLinkRouteFieldsSchema = z.object({
  expectedRevision: z.coerce.number().int().min(0),
  sourceConceptId: z.string().uuid(),
  targetConceptId: z.string().uuid(),
  relationType: z.enum(relationTypeEnum.enumValues),
  strength: z.number().int().min(1).max(5),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const createLinkRouteSchema = createLinkRouteFieldsSchema.merge(
  graphOperationClientSchema
);

export const updateLinkRouteSchema = z.object({
  expectedContentRevision: z.coerce.number().int().min(0),
  sourceConceptId: z.string().uuid(),
  targetConceptId: z.string().uuid(),
  relationType: z.enum(relationTypeEnum.enumValues),
  strength: z.number().int().min(1).max(5),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const deleteLinkRouteSchema = z
  .object({
    expectedRevision: z.coerce.number().int().min(0),
  })
  .merge(graphOperationClientSchema);
