"use client";

import { useActionState } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";

import { createWorkspaceAction } from "@/features/workspace/actions";
import type { ActionState } from "@/shared/validation/action-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";

const initialState: ActionState<"name" | "slug"> = { status: "idle" };

export function CreateWorkspaceForm() {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    initialState
  );

  return (
    <form action={formAction}>
      <Flex direction="column" gap="4">
        <InlineFormField
          label="Workspace name"
          error={state.fieldErrors?.name?.[0]}
        >
          <TextField.Root
            name="name"
            placeholder="Product Operations"
            size="3"
          />
        </InlineFormField>
        <InlineFormField
          label="Workspace slug"
          error={state.fieldErrors?.slug?.[0]}
        >
          <TextField.Root
            name="slug"
            placeholder="product-operations"
            size="3"
          />
        </InlineFormField>
        {state.message ? (
          <Text color="red" size="2">
            {state.message}
          </Text>
        ) : null}
        <Button type="submit" size="3" loading={isPending}>
          Create workspace
        </Button>
      </Flex>
    </form>
  );
}
