"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveSuggestionCommand } from "@/features/learning/commands";
import { getSuggestionWithResolution } from "@/features/learning/queries";
import { suggestionResolutionTypeSchema } from "@/features/learning/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  createIdleState,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

const resolveSuggestionActionSchema = z.object({
  workspaceSlug: z.string().trim().min(1),
  mapId: z.string().uuid(),
  suggestionId: z.string().uuid(),
  resolutionType: suggestionResolutionTypeSchema,
  reasonText: z.string().trim().max(4000).optional(),
});

type ResolveSuggestionField = "resolutionType" | "reasonText";

export async function resolveSuggestionAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<ResolveSuggestionField, string[]>>;
  },
  formData: FormData
) {
  const parsed = resolveSuggestionActionSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    suggestionId: formData.get("suggestionId"),
    resolutionType: formData.get("resolutionType"),
    reasonText: formData.get("reasonText"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<ResolveSuggestionField>(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const suggestionWithResolution = await getSuggestionWithResolution(
      access.workspace.id,
      parsed.data.suggestionId
    );

    if (!suggestionWithResolution) {
      throw new Error("Suggestion not found.");
    }

    const suggestionMapId = suggestionWithResolution.suggestion.mapId;
    if (suggestionMapId !== parsed.data.mapId) {
      throw new Error("Suggestion does not belong to this map.");
    }

    if (suggestionWithResolution.resolution) {
      throw new Error("Suggestion already resolved.");
    }

    await resolveSuggestionCommand({
      suggestionId: parsed.data.suggestionId,
      workspaceId: access.workspace.id,
      mapId: parsed.data.mapId,
      actorUserId: user.id,
      resolutionType: parsed.data.resolutionType,
      reasonText: parsed.data.reasonText || null,
    });

    revalidatePath(
      workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId)
    );
    return createIdleState<ResolveSuggestionField>();
  } catch (error) {
    return toActionError<ResolveSuggestionField>(
      error instanceof Error ? error.message : "Unable to resolve suggestion."
    );
  }
}
