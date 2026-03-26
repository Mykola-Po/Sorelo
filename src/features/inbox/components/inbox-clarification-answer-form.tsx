"use client";

import { useActionState } from "react";

import type { InboxWorkbenchListState } from "@/features/inbox/workbench-state";
import { toInboxWorkbenchHiddenFields } from "@/features/inbox/workbench-state";
import {
  answerInboxClarificationAction,
} from "@/features/inbox/actions";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getInboxWorkbenchMessages } from "@/shared/i18n/messages/inbox-workbench";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
} from "@/shared/ui/components/form-controls";
import { createIdleState } from "@/shared/validation/action-state";

type InboxClarificationAnswerFormProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  requestId: string;
  listState: InboxWorkbenchListState;
};

export function InboxClarificationAnswerForm({
  locale,
  workspaceSlug,
  requestId,
  listState,
}: InboxClarificationAnswerFormProps) {
  const messages = getInboxWorkbenchMessages(locale);
  const [state, formAction, isPending] = useActionState(
    answerInboxClarificationAction,
    createIdleState<"answerText">()
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="requestId" value={requestId} />
      {Object.entries(toInboxWorkbenchHiddenFields(listState)).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <FormStack>
        <TextAreaField
          label={messages.detailActionAnswer}
          error={state.fieldErrors?.answerText?.[0]}
          name="answerText"
          placeholder={messages.detailClarificationPendingDescription}
          rows={5}
          resize="vertical"
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton size="2" loading={isPending}>
          {messages.detailActionAnswer}
        </SubmitButton>
      </FormStack>
    </form>
  );
}
