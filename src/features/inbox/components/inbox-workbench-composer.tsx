"use client";

import { useActionState } from "react";

import { createInboxWorkbenchItemAction } from "@/features/inbox/actions";
import type { MapSummary } from "@/features/maps/types";
import { createIdleState } from "@/shared/validation/action-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import {
  FormErrorMessage,
  FormStack,
  SubmitButton,
  TextAreaField,
} from "@/shared/ui/components/form-controls";

type InboxWorkbenchComposerProps = {
  workspaceSlug: string;
  availableMaps: MapSummary[];
};

export function InboxWorkbenchComposer({
  workspaceSlug,
  availableMaps,
}: InboxWorkbenchComposerProps) {
  const [state, formAction, isPending] = useActionState(
    createInboxWorkbenchItemAction,
    createIdleState<"mapId" | "sourceType" | "rawText">()
  );
  const defaultMapId = availableMaps[0]?.id ?? "";

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <FormStack>
        <InlineFormField
          label="Target Map"
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
                <option value="">Create a Map first</option>
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
          label="Source type"
          error={state.fieldErrors?.sourceType?.[0]}
        >
          {({ controlProps }) => (
            <select
              {...controlProps}
              name="sourceType"
              defaultValue="manual_note"
              className="sl-inbox-select"
            >
              <option value="manual_note">manual_note</option>
              <option value="transcript">transcript</option>
              <option value="chat">chat</option>
              <option value="upload">upload</option>
              <option value="import">import</option>
            </select>
          )}
        </InlineFormField>
        <TextAreaField
          label="Raw input"
          error={state.fieldErrors?.rawText?.[0]}
          name="rawText"
          placeholder="Paste a raw note, transcript snippet, or observation."
          rows={8}
          resize="vertical"
        />
        <FormErrorMessage message={state.message} />
        <SubmitButton
          size="3"
          loading={isPending}
          disabled={availableMaps.length === 0}
        >
          Create inbox item
        </SubmitButton>
      </FormStack>
    </form>
  );
}
