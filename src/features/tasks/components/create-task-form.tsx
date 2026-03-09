"use client";

import { useActionState } from "react";
import { Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";

import { createTaskAction } from "@/features/tasks/actions";
import type { ActionState } from "@/shared/validation/action-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";

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
      <Flex direction="column" gap="4">
        <InlineFormField
          label="Task title"
          error={state.fieldErrors?.title?.[0]}
        >
          <TextField.Root
            name="title"
            placeholder="Call pilot customer"
            size="3"
          />
        </InlineFormField>
        <InlineFormField
          label="Description"
          error={state.fieldErrors?.description?.[0]}
        >
          <TextArea
            name="description"
            placeholder="Capture the exact next action with enough context to execute."
          />
        </InlineFormField>
        {state.message ? (
          <Text color="red" size="2">
            {state.message}
          </Text>
        ) : null}
        <Button type="submit" loading={isPending}>
          Add task
        </Button>
      </Flex>
    </form>
  );
}
