"use client";

import { useActionState } from "react";
import { Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";

import { createMapAction } from "@/features/maps/actions";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import type { ActionState } from "@/shared/validation/action-state";

const initialState: ActionState<
  "title" | "slug" | "subjectLabel" | "description"
> = {
  status: "idle",
};

type CreateMapFormProps = {
  workspaceSlug: string;
};

export function CreateMapForm({ workspaceSlug }: CreateMapFormProps) {
  const [state, formAction, isPending] = useActionState(
    createMapAction,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <Flex direction="column" gap="4">
        <InlineFormField label="Map title" error={state.fieldErrors?.title?.[0]}>
          <TextField.Root name="title" placeholder="Conflict reactions" size="3" />
        </InlineFormField>
        <InlineFormField
          label="Subject label"
          error={state.fieldErrors?.subjectLabel?.[0]}
        >
          <TextField.Root
            name="subjectLabel"
            placeholder="Alex"
            size="3"
          />
        </InlineFormField>
        <InlineFormField label="Slug" error={state.fieldErrors?.slug?.[0]}>
          <TextField.Root name="slug" placeholder="conflict-reactions" size="3" />
        </InlineFormField>
        <InlineFormField
          label="Description"
          error={state.fieldErrors?.description?.[0]}
        >
          <TextArea
            name="description"
            placeholder="What this map is trying to explain about the person."
          />
        </InlineFormField>
        {state.message ? (
          <Text color="red" size="2">
            {state.message}
          </Text>
        ) : null}
        <Button type="submit" loading={isPending}>
          Create map
        </Button>
      </Flex>
    </form>
  );
}
