"use client";

import { useActionState, useState } from "react";

import { createMapAction } from "@/features/maps/actions";
import { createMapSchema } from "@/features/maps/schemas";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
  TextInputField,
} from "@/shared/ui/components/form-controls";
import {
  type ActionState,
  zodErrorToActionState,
} from "@/shared/validation/action-state";

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
  const [clientState, setClientState] = useState(initialState);
  const effectiveState = clientState.status === "error" ? clientState : state;

  return (
    <form
      action={formAction}
      onInputCapture={() => {
        if (clientState.status === "error") {
          setClientState(initialState);
        }
      }}
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const parsed = createMapSchema.safeParse({
          workspaceSlug,
          title: formData.get("title"),
          slug: formData.get("slug"),
          subjectLabel: formData.get("subjectLabel"),
          description: formData.get("description"),
        });

        if (!parsed.success) {
          event.preventDefault();
          setClientState(
            zodErrorToActionState<
              "title" | "slug" | "subjectLabel" | "description"
            >(parsed.error, messages.reviewFields)
          );
          return;
        }
      }}
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="locale" value={locale} />
      <FormStack>
        <TextInputField
          label={messages.titleLabel}
          error={effectiveState.fieldErrors?.title?.[0]}
          name="title"
          placeholder={messages.titlePlaceholder}
          size="3"
        />
        <TextInputField
          label={messages.subjectLabel}
          error={effectiveState.fieldErrors?.subjectLabel?.[0]}
          name="subjectLabel"
          placeholder={messages.subjectPlaceholder}
          size="3"
        />
        <details
          className="sl-form-advanced"
          open={Boolean(effectiveState.fieldErrors?.slug?.[0])}
        >
          <summary>{messages.advancedLabel}</summary>
          <div className="sl-form-advanced-fields">
            <TextInputField
              label={messages.slugLabel}
              error={effectiveState.fieldErrors?.slug?.[0]}
              name="slug"
              placeholder={messages.slugPlaceholder}
              size="3"
            />
          </div>
        </details>
        <TextAreaField
          label={messages.descriptionLabel}
          error={effectiveState.fieldErrors?.description?.[0]}
          name="description"
          placeholder={messages.descriptionPlaceholder}
        />
        <FormErrorMessage message={effectiveState.message} />
        <SubmitButton loading={isPending}>
          {messages.submit}
        </SubmitButton>
      </FormStack>
    </form>
  );
}
