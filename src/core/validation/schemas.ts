import { z } from "zod";
import { NODE_TYPES, RELATION_TYPES } from "@/core/domain/entities";

export const sorelaNodeSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  type: z.enum(NODE_TYPES),
  title: z.string().min(1).max(180),
  description: z.string().max(5000).default(""),
  x: z.number(),
  y: z.number(),
  intensity: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastConfirmedAt: z.string(),
  volatility: z.number().min(0).max(1),
  reviewDueAt: z.string(),
  archivedAt: z.string().nullable(),
  version: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown())
});

export const sorelaEdgeSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  relationType: z.enum(RELATION_TYPES),
  strength: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown())
});
