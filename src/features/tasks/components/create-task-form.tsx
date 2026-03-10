"use client";

import { useActionState } from "react";

import { createTaskAction } from "@/features/tasks/actions";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
  TextInputField,
} from "@/shared/ui/components/form-controls";
import type { ActionState } from "@/shared/validation/action-state";

const initialState: ActionState<"title" | "description"> = { status: "idle" };

type CreateTaskFormProps = {
  workspaceSlug: string;
  projectId: string;
};

export function CreateTaskForm({
  workspaceSlug,
  projectId,
}: CreateTaskFormProps) {
  const [state, formAction, isPending] = useActionState(
    createTaskAction,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="projectId" value={projectId} />
      <FormStack>
        <TextInputField
          label="Task title"
          error={state.fieldErrors?.title?.[0]}
          name="title"
          placeholder="Call pilot customer"
          size="3"
        />
        <TextAreaField
          label="Description"
          error={state.fieldErrors?.description?.[0]}
          name="description"
          placeholder="Capture the exact next action with enough context to execute."
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton loading={isPending}>
          Add task
        </SubmitButton>
      </FormStack>
    </form>
  );
}
