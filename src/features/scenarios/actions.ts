"use server";

import { revalidatePath } from "next/cache";

import {
  createScenarioCommand,
  runScenarioCommand,
  upsertScenarioRunFeedbackCommand,
  upsertScenarioStepFeedbackCommand,
} from "@/features/scenarios/commands";
import {
  createScenarioSchema,
  runScenarioSchema,
  submitScenarioRunFeedbackSchema,
  submitScenarioStepFeedbackSchema,
} from "@/features/scenarios/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

export async function createScenarioAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<
      Record<"title" | "situation" | "seedConceptIds", string[]>
    >;
  },
  formData: FormData
) {
  const parsed = createScenarioSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    title: formData.get("title"),
    situation: formData.get("situation"),
    seedConceptIds: formData.getAll("seedConceptIds").map(String),
  });

  if (!parsed.success) {
    return zodErrorToActionState<"title" | "situation" | "seedConceptIds">(
      parsed.error
    );
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    await createScenarioCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      title: parsed.data.title || null,
      situation: parsed.data.situation,
      seedConceptIds: parsed.data.seedConceptIds,
    });

    revalidatePath(
      workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId)
    );
    return createIdleState<"title" | "situation" | "seedConceptIds">();
  } catch (error) {
    return toActionError<"title" | "situation" | "seedConceptIds">(
      error instanceof Error ? error.message : "Unable to create scenario."
    );
  }
}

export async function runScenarioAction(formData: FormData) {
  const parsed = runScenarioSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    scenarioId: formData.get("scenarioId"),
    triggerText: formData.get("triggerText"),
    seedConceptIds: formData.getAll("seedConceptIds").map(String),
  });

  if (!parsed.success) {
    throw new Error("Invalid scenario run payload.");
  }

  const { user, access } = await requireWorkspaceAccess(
    parsed.data.workspaceSlug
  );
  await runScenarioCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    scenarioId: parsed.data.scenarioId || null,
    triggerText: parsed.data.triggerText || null,
    seedConceptIds: parsed.data.seedConceptIds,
  });

  revalidatePath(
    workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId)
  );
}

type ScenarioRunFeedbackField = "overallScore" | "verdict" | "feedbackText";
type ScenarioStepFeedbackField =
  | "verdict"
  | "correctedExplanation"
  | "correctedScore";

export async function submitScenarioRunFeedbackAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<ScenarioRunFeedbackField, string[]>>;
  },
  formData: FormData
) {
  const parsed = submitScenarioRunFeedbackSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    scenarioRunId: formData.get("scenarioRunId"),
    overallScore: formData.get("overallScore"),
    verdict: formData.get("verdict"),
    feedbackText: formData.get("feedbackText"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<ScenarioRunFeedbackField>(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );

    await upsertScenarioRunFeedbackCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      scenarioRunId: parsed.data.scenarioRunId,
      overallScore: parsed.data.overallScore,
      verdict: parsed.data.verdict,
      feedbackText: parsed.data.feedbackText || null,
    });

    revalidatePath(
      workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId)
    );
    return createIdleState<ScenarioRunFeedbackField>();
  } catch (error) {
    return toActionError<ScenarioRunFeedbackField>(
      error instanceof Error ? error.message : "Unable to save run feedback."
    );
  }
}

export async function submitScenarioStepFeedbackAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<ScenarioStepFeedbackField, string[]>>;
  },
  formData: FormData
) {
  const parsed = submitScenarioStepFeedbackSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    scenarioRunId: formData.get("scenarioRunId"),
    scenarioRunStepId: formData.get("scenarioRunStepId"),
    verdict: formData.get("verdict"),
    correctedExplanation: formData.get("correctedExplanation"),
    correctedScore: formData.get("correctedScore"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<ScenarioStepFeedbackField>(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );

    await upsertScenarioStepFeedbackCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      scenarioRunId: parsed.data.scenarioRunId,
      scenarioRunStepId: parsed.data.scenarioRunStepId,
      verdict: parsed.data.verdict,
      correctedExplanation: parsed.data.correctedExplanation || null,
      correctedScore: parsed.data.correctedScore ?? null,
    });

    revalidatePath(
      workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId)
    );
    return createIdleState<ScenarioStepFeedbackField>();
  } catch (error) {
    return toActionError<ScenarioStepFeedbackField>(
      error instanceof Error ? error.message : "Unable to save step feedback."
    );
  }
}
