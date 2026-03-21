"use client";

import { useActionState } from "react";

import {
  createInboxWorkbenchItemAction,
} from "@/features/inbox/actions";
import { createIdleState } from "@/shared/validation/action-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
} from "@/shared/ui/components/form-controls";

type InboxWorkbenchComposerProps = {
  workspaceSlug: string;
};

export function InboxWorkbenchComposer({
  workspaceSlug,
}: InboxWorkbenchComposerProps) {
  const [state, formAction, isPending] = useActionState(
    createInboxWorkbenchItemAction,
    createIdleState<"sourceType" | "rawText">()
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <FormStack>
        <InlineFormField
          label="Source type"
          error={state.fieldErrors?.sourceType?.[0]}
        >
          <select
            name="sourceType"
            defaultValue="manual_note"
            className="sl-inbox-select"
          >
            <option value="manual_note">manual_note</option>
            <option value="transcript">transcript</option>
            <option value="chat">chat</option>
            <option value="upload">upload</option>
            <option value="import">import</option>
          </select>
        </InlineFormField>
        <TextAreaField
          label="Raw input"
          error={state.fieldErrors?.rawText?.[0]}
          name="rawText"
          placeholder="Paste a raw note, transcript snippet, or observation."
          rows={8}
          resize="vertical"
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton size="3" loading={isPending}>
          Create inbox item
        </SubmitButton>
      </FormStack>
    </form>
  );
}
