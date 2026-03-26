"use client";

import { useActionState } from "react";

import type { InboxWorkbenchListState } from "@/features/inbox/workbench-state";
import { toInboxWorkbenchHiddenFields } from "@/features/inbox/workbench-state";
import {
  processInboxWorkbenchItemAction,
} from "@/features/inbox/actions";
import {
  FormErrorMessage,
  SubmitButton,
} from "@/shared/ui/components/form-controls";
import { createIdleState } from "@/shared/validation/action-state";

type InboxWorkbenchProcessFormProps = {
  workspaceSlug: string;
  itemId: string;
  listState: InboxWorkbenchListState;
  label: string;
};

export function InboxWorkbenchProcessForm({
  workspaceSlug,
  itemId,
  listState,
  label,
}: InboxWorkbenchProcessFormProps) {
  const [state, formAction, isPending] = useActionState(
    processInboxWorkbenchItemAction,
    createIdleState<"itemId">()
  );

  return (
    <form action={formAction} className="sl-inbox-inline-form">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="itemId" value={itemId} />
      {Object.entries(toInboxWorkbenchHiddenFields(listState)).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <SubmitButton size="2" loading={isPending}>
        {label}
      </SubmitButton>
      <FormErrorMessage message={state.message} size="1" />
    </form>
  );
}
