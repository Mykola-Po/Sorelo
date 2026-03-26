"use client";

import { useActionState } from "react";

import { createInboxWorkbenchItemAction } from "@/features/inbox/actions";
import type { InboxWorkbenchListState } from "@/features/inbox/workbench-state";
import { toInboxWorkbenchHiddenFields } from "@/features/inbox/workbench-state";
import type { MapSummary } from "@/features/maps/types";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getInboxWorkbenchMessages } from "@/shared/i18n/messages/inbox-workbench";
import { createIdleState } from "@/shared/validation/action-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
} from "@/shared/ui/components/form-controls";

type InboxWorkbenchComposerProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  availableMaps: MapSummary[];
  listState: InboxWorkbenchListState;
};

export function InboxWorkbenchComposer({
  locale,
  workspaceSlug,
  availableMaps,
  listState,
}: InboxWorkbenchComposerProps) {
  const messages = getInboxWorkbenchMessages(locale);
  const [state, formAction, isPending] = useActionState(
    createInboxWorkbenchItemAction,
    createIdleState<"mapId" | "sourceType" | "rawText">()
  );
  const defaultMapId = availableMaps[0]?.id ?? "";

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      {Object.entries(toInboxWorkbenchHiddenFields(listState)).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <FormStack>
        <InlineFormField
          label={messages.composerMapLabel}
          error={state.fieldErrors?.mapId?.[0]}
        >
          {({ controlProps }) => (
            <select
              {...controlProps}
              name="mapId"
              defaultValue={defaultMapId}
              className="sl-inbox-select"
              disabled={availableMaps.length === 0}
            >
              {availableMaps.length === 0 ? (
                <option value="">{messages.composerNoMaps}</option>
              ) : null}
              {availableMaps.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.title}
                </option>
              ))}
            </select>
          )}
        </InlineFormField>
        <InlineFormField
          label={messages.composerSourceLabel}
          error={state.fieldErrors?.sourceType?.[0]}
        >
          {({ controlProps }) => (
            <select
              {...controlProps}
              name="sourceType"
              defaultValue="manual_note"
              className="sl-inbox-select"
            >
              <option value="manual_note">
                {messages.sourceLabels.manual_note}
              </option>
              <option value="transcript">
                {messages.sourceLabels.transcript}
              </option>
              <option value="chat">{messages.sourceLabels.chat}</option>
              <option value="upload">{messages.sourceLabels.upload}</option>
              <option value="import">{messages.sourceLabels.import}</option>
            </select>
          )}
        </InlineFormField>
        <TextAreaField
          label={messages.composerRawInputLabel}
          error={state.fieldErrors?.rawText?.[0]}
          name="rawText"
          placeholder={messages.composerRawInputPlaceholder}
          rows={8}
          resize="vertical"
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton
          size="3"
          loading={isPending}
          disabled={availableMaps.length === 0}
        >
          {messages.composerCreate}
        </SubmitButton>
      </FormStack>
    </form>
  );
}
