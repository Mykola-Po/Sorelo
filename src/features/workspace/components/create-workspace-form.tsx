"use client";

import { useActionState } from "react";

import { createWorkspaceAction } from "@/features/workspace/actions";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextInputField,
} from "@/shared/ui/components/form-controls";
import type { ActionState } from "@/shared/validation/action-state";

const initialState: ActionState<"name" | "slug"> = { status: "idle" };

type CreateWorkspaceFormMessages = {
  nameLabel: string;
  namePlaceholder: string;
  advancedLabel: string;
  slugLabel: string;
  slugPlaceholder: string;
  submit: string;
};

type CreateWorkspaceFormProps = {
  messages: CreateWorkspaceFormMessages;
};

export function CreateWorkspaceForm({ messages }: CreateWorkspaceFormProps) {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    initialState
  );

  return (
    <form action={formAction}>
      <FormStack>
        <TextInputField
          label={messages.nameLabel}
          error={state.fieldErrors?.name?.[0]}
          name="name"
          placeholder={messages.namePlaceholder}
          size="3"
        />
        <details
          className="sl-form-advanced"
          open={Boolean(state.fieldErrors?.slug?.[0])}
        >
          <summary>{messages.advancedLabel}</summary>
          <div className="sl-form-advanced-fields">
            <TextInputField
              label={messages.slugLabel}
              error={state.fieldErrors?.slug?.[0]}
              name="slug"
              placeholder={messages.slugPlaceholder}
              size="3"
            />
          </div>
        </details>
        <FormErrorMessage message={state.message} />
        <SubmitButton size="3" loading={isPending}>
          {messages.submit}
        </SubmitButton>
      </FormStack>
    </form>
  );
}
