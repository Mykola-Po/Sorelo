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
  getInboxClarificationRequestForWorkspaceQuery,
  getInboxItemForWorkspaceQuery,
} from "@/features/inbox/queries";
import {
  inboxWorkbenchAnswerActionSchema,
  inboxWorkbenchCreateActionSchema,
  inboxWorkbenchProcessActionSchema,
} from "@/features/inbox/schemas";
import {
  buildInboxWorkbenchHref,
  normalizeInboxWorkbenchListState,
} from "@/features/inbox/workbench-state";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { workspaceInboxPath } from "@/shared/config/routes";
import {
  toActionError,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

type CreateInboxWorkbenchActionFields = "mapId" | "sourceType" | "rawText";
type ProcessInboxWorkbenchActionFields = "itemId";
type AnswerInboxWorkbenchActionFields = "answerText";

function readWorkbenchListState(formData: FormData) {
  return normalizeInboxWorkbenchListState({
    view: formData.get("listView")?.toString(),
    status: formData.get("listStatus")?.toString(),
    route: formData.get("listRoute")?.toString(),
    mapId: formData.get("listMapId")?.toString(),
    sort: formData.get("listSort")?.toString(),
    page: formData.get("listPage")?.toString(),
    pageSize: formData.get("listPageSize")?.toString(),
    item: formData.get("listItem")?.toString(),
  });
}

function buildWorkbenchItemHref(
  workspaceSlug: string,
  itemId: string,
  listState: ReturnType<typeof readWorkbenchListState>
) {
  return buildInboxWorkbenchHref(workspaceSlug, {
    ...listState,
    item: itemId,
  });
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
    return zodErrorToActionState<CreateInboxWorkbenchActionFields>(
      parsed.error
    );
  }
  const listState = readWorkbenchListState(formData);

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
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
    redirect(
      buildWorkbenchItemHref(
        parsed.data.workspaceSlug,
        result.item.id,
        listState
      )
    );
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
    return zodErrorToActionState<ProcessInboxWorkbenchActionFields>(
      parsed.error
    );
  }
  const listState = readWorkbenchListState(formData);

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const item = await getInboxItemForWorkspaceQuery(
      access.workspace.id,
      parsed.data.itemId
    );

    if (!item) {
      return toActionError<ProcessInboxWorkbenchActionFields>(
        "Inbox item not found."
      );
    }

    await processInboxItemCommand({
      workspaceId: access.workspace.id,
      itemId: item.id,
      actorUserId: user.id,
    });
    revalidatePath(workspaceInboxPath(parsed.data.workspaceSlug));
    redirect(
      buildWorkbenchItemHref(parsed.data.workspaceSlug, item.id, listState)
    );
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
    return zodErrorToActionState<AnswerInboxWorkbenchActionFields>(
      parsed.error
    );
  }
  const listState = readWorkbenchListState(formData);

  try {
    const { user, access } = await requireWorkspaceAccess(
      parsed.data.workspaceSlug
    );
    const request = await getInboxClarificationRequestForWorkspaceQuery(
      access.workspace.id,
      parsed.data.requestId
    );

    if (!request) {
      return toActionError<AnswerInboxWorkbenchActionFields>(
        "Clarification request not found."
      );
    }

    await answerInboxClarificationCommand({
      workspaceId: access.workspace.id,
      requestId: request.id,
      actorUserId: user.id,
      answerText: parsed.data.answerText,
    });
    revalidatePath(workspaceInboxPath(parsed.data.workspaceSlug));
    redirect(
      buildWorkbenchItemHref(
        parsed.data.workspaceSlug,
        request.itemId,
        listState
      )
    );
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
