"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  answerInboxClarificationCommand,
  createInboxItemCommand,
  processInboxItemCommand,
} from "@/features/inbox/commands";
import {
  getInboxClarificationRequestForUserQuery,
  getInboxItemForUserQuery,
} from "@/features/inbox/queries";
import {
  inboxWorkbenchAnswerActionSchema,
  inboxWorkbenchCreateActionSchema,
  inboxWorkbenchProcessActionSchema,
} from "@/features/inbox/schemas";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceInboxPath } from "@/shared/config/routes";
import {
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

type CreateInboxWorkbenchActionFields = "mapId" | "sourceType" | "rawText";
type ProcessInboxWorkbenchActionFields = "itemId";
type AnswerInboxWorkbenchActionFields = "answerText";

function buildWorkbenchItemHref(workspaceSlug: string, itemId: string) {
  const params = new URLSearchParams({ item: itemId });
  return `${workspaceInboxPath(workspaceSlug)}?${params.toString()}`;
}

export async function createInboxWorkbenchItemAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<CreateInboxWorkbenchActionFields, string[]>>;
  },
  formData: FormData
) {
  const parsed = inboxWorkbenchCreateActionSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    mapId: formData.get("mapId"),
    sourceType: formData.get("sourceType") || undefined,
    rawText: formData.get("rawText"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<CreateInboxWorkbenchActionFields>(parsed.error);
  }

  try {
    const { user, access } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
    const result = await createInboxItemCommand({
      userId: user.id,
      workspaceId: access.workspace.id,
      mapId: parsed.data.mapId,
      sourceType: parsed.data.sourceType,
      rawText: parsed.data.rawText,
      sourceRef: null,
      idempotencyKey: `inbox-workbench-${randomUUID()}`,
    });

    revalidatePath(workspaceInboxPath(parsed.data.workspaceSlug));
    redirect(buildWorkbenchItemHref(parsed.data.workspaceSlug, result.item.id));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return toActionError<CreateInboxWorkbenchActionFields>(
      error instanceof Error ? error.message : "Unable to create inbox item."
    );
  }
}

export async function processInboxWorkbenchItemAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<ProcessInboxWorkbenchActionFields, string[]>>;
  },
  formData: FormData
) {
  const parsed = inboxWorkbenchProcessActionSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    itemId: formData.get("itemId"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<ProcessInboxWorkbenchActionFields>(parsed.error);
  }

  try {
    const { user } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
    const item = await getInboxItemForUserQuery(user.id, parsed.data.itemId);

    if (!item) {
      return toActionError<ProcessInboxWorkbenchActionFields>(
        "Inbox item not found."
      );
    }

    await processInboxItemCommand(item.id);
    revalidatePath(workspaceInboxPath(parsed.data.workspaceSlug));
    redirect(buildWorkbenchItemHref(parsed.data.workspaceSlug, item.id));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return toActionError<ProcessInboxWorkbenchActionFields>(
      error instanceof Error ? error.message : "Unable to process inbox item."
    );
  }
}

export async function answerInboxClarificationAction(
  _: {
    status: "idle" | "error";
    message?: string;
    fieldErrors?: Partial<Record<AnswerInboxWorkbenchActionFields, string[]>>;
  },
  formData: FormData
) {
  const parsed = inboxWorkbenchAnswerActionSchema.safeParse({
    workspaceSlug: formData.get("workspaceSlug"),
    requestId: formData.get("requestId"),
    answerText: formData.get("answerText"),
  });

  if (!parsed.success) {
    return zodErrorToActionState<AnswerInboxWorkbenchActionFields>(parsed.error);
  }

  try {
    const { user } = await requireWorkspaceAccess(parsed.data.workspaceSlug);
    const request = await getInboxClarificationRequestForUserQuery(
      user.id,
      parsed.data.requestId
    );

    if (!request) {
      return toActionError<AnswerInboxWorkbenchActionFields>(
        "Clarification request not found."
      );
    }

    await answerInboxClarificationCommand(request.id, parsed.data.answerText);
    revalidatePath(workspaceInboxPath(parsed.data.workspaceSlug));
    redirect(buildWorkbenchItemHref(parsed.data.workspaceSlug, request.itemId));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return toActionError<AnswerInboxWorkbenchActionFields>(
      error instanceof Error
        ? error.message
        : "Unable to answer clarification request."
    );
  }
}
