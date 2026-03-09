"use server";

import { revalidatePath } from "next/cache";

import {
  createScenarioCommand,
  runScenarioCommand,
} from "@/features/scenarios/commands";
import {
  createScenarioSchema,
  runScenarioSchema,
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
    fieldErrors?: Partial<Record<"title" | "situation" | "seedConceptIds", string[]>>;
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
    const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
    await createScenarioCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      title: parsed.data.title || null,
      situation: parsed.data.situation,
      seedConceptIds: parsed.data.seedConceptIds,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
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

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await runScenarioCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    scenarioId: parsed.data.scenarioId || null,
    triggerText: parsed.data.triggerText || null,
    seedConceptIds: parsed.data.seedConceptIds,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}
