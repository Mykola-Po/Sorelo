"use client";

import { useActionState } from "react";

import { createProjectAction } from "@/features/projects/actions";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
  TextInputField,
} from "@/shared/ui/components/form-controls";
import type { ActionState } from "@/shared/validation/action-state";

const initialState: ActionState<"name" | "slug" | "description"> = {
  status: "idle",
};

type CreateProjectFormProps = {
  workspaceSlug: string;
};

export function CreateProjectForm({ workspaceSlug }: CreateProjectFormProps) {
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <FormStack>
        <TextInputField
          label="Project name"
          error={state.fieldErrors?.name?.[0]}
          name="name"
          placeholder="Pilot onboarding"
          size="3"
        />
        <TextInputField
          label="Project slug"
          error={state.fieldErrors?.slug?.[0]}
          name="slug"
          placeholder="pilot-onboarding"
          size="3"
        />
        <TextAreaField
          label="Description"
          error={state.fieldErrors?.description?.[0]}
          name="description"
          placeholder="Scope, owners, and success markers."
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton loading={isPending}>
          Create project
        </SubmitButton>
      </FormStack>
    </form>
  );
}
