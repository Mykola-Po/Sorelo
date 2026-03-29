"use server";

import { revalidatePath } from "next/cache";

import {
  archiveConceptCommand,
  createConceptCommand,
  repositionConceptCommand,
  updateConceptCommand,
} from "@/features/concepts/commands";
import {
  archiveConceptSchema,
  createConceptSchema,
  repositionConceptSchema,
  updateConceptSchema,
} from "@/features/concepts/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  type FieldErrors,
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

type ConceptFormField = "title" | "conceptType" | "summary" | "description";
type ConceptMutation = "created" | "updated";

export type ConceptMutationPayload = {
  conceptId: string;
  mutation: ConceptMutation;
  eventId: string;
};

export type ConceptActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors<ConceptFormField>;
  payload?: ConceptMutationPayload;
};

export async function createConceptAction(
  _: ConceptActionState,
  formData: FormData
): Promise<ConceptActionState> {
  const parsed = createConceptSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    expectedRevision: formData.get("expectedRevision"),
    title: formData.get("title"),
    conceptType: formData.get("conceptType"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    x: formData.get("x"),
    y: formData.get("y"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "title" | "conceptType" | "summary" | "description"
    >(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const concept = await createConceptCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      expectedRevision: parsed.data.expectedRevision,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary || null,
      description: parsed.data.description || null,
      x: parsed.data.x ?? null,
      y: parsed.data.y ?? null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    const eventId = crypto.randomUUID();
    return {
      status: "success",
      payload: {
        conceptId: concept.id,
        mutation: "created",
        eventId,
      },
    };
  } catch (error) {
    return toActionError<ConceptFormField>(
      error instanceof Error ? error.message : "Unable to create concept."
    );
  }
}

export async function updateConceptAction(
  _: ConceptActionState,
  formData: FormData
): Promise<ConceptActionState> {
  const parsed = updateConceptSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    conceptId: formData.get("conceptId"),
    expectedContentRevision: formData.get("expectedContentRevision"),
    title: formData.get("title"),
    conceptType: formData.get("conceptType"),
    summary: formData.get("summary"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<
      "title" | "conceptType" | "summary" | "description"
    >(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const concept = await updateConceptCommand({
      workspaceId: access.workspace.id,
      actorUserId: user.id,
      mapId: parsed.data.mapId,
      expectedContentRevision: parsed.data.expectedContentRevision,
      conceptId: parsed.data.conceptId,
      title: parsed.data.title,
      conceptType: parsed.data.conceptType,
      summary: parsed.data.summary || null,
      description: parsed.data.description || null,
    });

    revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
    const eventId = crypto.randomUUID();
    return {
      status: "success",
      payload: {
        conceptId: concept.id,
        mutation: "updated",
        eventId,
      },
    };
  } catch (error) {
    return toActionError<ConceptFormField>(
      error instanceof Error ? error.message : "Unable to update concept."
    );
  }
}

export async function repositionConceptAction(input: {
  workspaceSlug: string;
  mapId: string;
  expectedRevision: number;
  conceptId: string;
  x: number;
  y: number;
}) {
  const parsed = repositionConceptSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid concept reposition payload.");
  }

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await repositionConceptCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    expectedRevision: parsed.data.expectedRevision,
    conceptId: parsed.data.conceptId,
    x: parsed.data.x,
    y: parsed.data.y,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}

export async function archiveConceptAction(formData: FormData) {
  const parsed = archiveConceptSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    expectedRevision: formData.get("expectedRevision"),
    conceptId: formData.get("conceptId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid concept archive payload.");
  }

  const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
  await archiveConceptCommand({
    workspaceId: access.workspace.id,
    actorUserId: user.id,
    mapId: parsed.data.mapId,
    expectedRevision: parsed.data.expectedRevision,
    conceptId: parsed.data.conceptId,
  });

  revalidatePath(workspaceMapPath(parsed.data.workspaceSlug, parsed.data.mapId));
}
