"use client";

import { useActionState } from "react";

import { createMapAction } from "@/features/maps/actions";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
  TextInputField,
} from "@/shared/ui/components/form-controls";
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
      <FormStack>
        <TextInputField
          label={messages.titleLabel}
          error={state.fieldErrors?.title?.[0]}
          name="title"
          placeholder={messages.titlePlaceholder}
          size="3"
        />
        <TextInputField
          label={messages.subjectLabel}
          error={state.fieldErrors?.subjectLabel?.[0]}
          name="subjectLabel"
          placeholder={messages.subjectPlaceholder}
          size="3"
        />
        <TextInputField
          label={messages.slugLabel}
          error={state.fieldErrors?.slug?.[0]}
          name="slug"
          placeholder={messages.slugPlaceholder}
          size="3"
        />
        <TextAreaField
          label={messages.descriptionLabel}
          error={state.fieldErrors?.description?.[0]}
          name="description"
          placeholder={messages.descriptionPlaceholder}
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton loading={isPending}>
          {messages.submit}
        </SubmitButton>
      </FormStack>
    </form>
  );
}
