"use client";

import { useActionState } from "react";

import {
  answerInboxClarificationAction,
} from "@/features/inbox/actions";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
} from "@/shared/ui/components/form-controls";
import { createIdleState } from "@/shared/validation/action-state";

type InboxClarificationAnswerFormProps = {
  workspaceSlug: string;
  requestId: string;
};

export function InboxClarificationAnswerForm({
  workspaceSlug,
  requestId,
}: InboxClarificationAnswerFormProps) {
  const [state, formAction, isPending] = useActionState(
    answerInboxClarificationAction,
    createIdleState<"answerText">()
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="requestId" value={requestId} />
      <FormStack>
        <TextAreaField
          label="Answer clarification"
          error={state.fieldErrors?.answerText?.[0]}
          name="answerText"
          placeholder="Answer the pending clarification in plain language."
          rows={5}
          resize="vertical"
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton size="2" loading={isPending}>
          Submit clarification answer
        </SubmitButton>
      </FormStack>
    </form>
  );
}
