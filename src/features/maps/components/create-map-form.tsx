"use client";

import { useActionState } from "react";
import { Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";

import { createMapAction } from "@/features/maps/actions";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import type { ActionState } from "@/shared/validation/action-state";

const initialState: ActionState<
  "title" | "slug" | "subjectLabel" | "description"
> = {
  status: "idle",
};

type CreateMapFormProps = {
  workspaceSlug: string;
  locale: SupportedLocale;
};

export function CreateMapForm({ workspaceSlug, locale }: CreateMapFormProps) {
  const messages = getAppShellMessages(locale).createMapForm;
  const [state, formAction, isPending] = useActionState(
    createMapAction,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="locale" value={locale} />
      <Flex direction="column" gap="4">
        <InlineFormField
          label={messages.titleLabel}
          error={state.fieldErrors?.title?.[0]}
        >
          <TextField.Root
            name="title"
            placeholder={messages.titlePlaceholder}
            size="3"
          />
        </InlineFormField>
        <InlineFormField
          label={messages.subjectLabel}
          error={state.fieldErrors?.subjectLabel?.[0]}
        >
          <TextField.Root name="subjectLabel" placeholder={messages.subjectPlaceholder} size="3" />
        </InlineFormField>
        <InlineFormField label={messages.slugLabel} error={state.fieldErrors?.slug?.[0]}>
          <TextField.Root name="slug" placeholder={messages.slugPlaceholder} size="3" />
        </InlineFormField>
        <InlineFormField
          label={messages.descriptionLabel}
          error={state.fieldErrors?.description?.[0]}
        >
          <TextArea name="description" placeholder={messages.descriptionPlaceholder} />
        </InlineFormField>
        {state.message ? (
          <Text color="red" size="2">
            {state.message}
          </Text>
        ) : null}
        <Button type="submit" loading={isPending}>
          {messages.submit}
        </Button>
      </Flex>
    </form>
  );
}
