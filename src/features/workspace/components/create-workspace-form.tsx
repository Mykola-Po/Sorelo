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

export function CreateWorkspaceForm() {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    initialState
  );

  return (
    <form action={formAction}>
      <FormStack>
        <TextInputField
          label="Workspace name"
          error={state.fieldErrors?.name?.[0]}
          name="name"
          placeholder="Product Operations"
          size="3"
        />
        <TextInputField
          label="Workspace slug"
          error={state.fieldErrors?.slug?.[0]}
          name="slug"
          placeholder="product-operations"
          size="3"
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton size="3" loading={isPending}>
          Create workspace
        </SubmitButton>
      </FormStack>
    </form>
  );
}
