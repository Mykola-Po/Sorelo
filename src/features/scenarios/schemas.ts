import { z } from "zod";

import {
  scenarioRunFeedbackVerdictEnum,
  scenarioStepFeedbackVerdictEnum,
} from "@/shared/db/schema";

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

export const submitScenarioRunFeedbackSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  scenarioRunId: z.string().uuid(),
  overallScore: z.coerce.number().int().min(1).max(5),
  verdict: z.enum(scenarioRunFeedbackVerdictEnum.enumValues),
  feedbackText: z.string().trim().max(4000).optional().nullable(),
});

export const submitScenarioStepFeedbackSchema = z.object({
  workspaceSlug: z.string().min(1),
  mapId: z.string().uuid(),
  scenarioRunId: z.string().uuid(),
  scenarioRunStepId: z.string().uuid(),
  verdict: z.enum(scenarioStepFeedbackVerdictEnum.enumValues),
  correctedExplanation: z.string().trim().max(4000).optional().nullable(),
  correctedScore: z.coerce.number().int().min(1).max(100).optional().nullable(),
});

export const submitScenarioRunFeedbackRouteSchema = z.object({
  overallScore: z.number().int().min(1).max(5),
  verdict: z.enum(scenarioRunFeedbackVerdictEnum.enumValues),
  feedbackText: z.string().trim().max(4000).optional().nullable(),
});

export const submitScenarioStepFeedbackRouteSchema = z.object({
  verdict: z.enum(scenarioStepFeedbackVerdictEnum.enumValues),
  correctedExplanation: z.string().trim().max(4000).optional().nullable(),
  correctedScore: z.number().int().min(1).max(100).optional().nullable(),
});
