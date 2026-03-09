"use client";

import { useActionState } from "react";
import { Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";

import { createProjectAction } from "@/features/projects/actions";
import type { ActionState } from "@/shared/validation/action-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";

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
      <Flex direction="column" gap="4">
        <InlineFormField
          label="Project name"
          error={state.fieldErrors?.name?.[0]}
        >
          <TextField.Root name="name" placeholder="Pilot onboarding" size="3" />
        </InlineFormField>
        <InlineFormField
          label="Project slug"
          error={state.fieldErrors?.slug?.[0]}
        >
          <TextField.Root name="slug" placeholder="pilot-onboarding" size="3" />
        </InlineFormField>
        <InlineFormField
          label="Description"
          error={state.fieldErrors?.description?.[0]}
        >
          <TextArea
            name="description"
            placeholder="Scope, owners, and success markers."
          />
        </InlineFormField>
        {state.message ? (
          <Text color="red" size="2">
            {state.message}
          </Text>
        ) : null}
        <Button type="submit" loading={isPending}>
          Create project
        </Button>
      </Flex>
    </form>
  );
}
