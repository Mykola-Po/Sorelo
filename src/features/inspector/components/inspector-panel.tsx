"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import {
  archiveConceptAction,
  createConceptAction,
  updateConceptAction,
} from "@/features/concepts/actions";
import { archiveMapAction, renameMapAction } from "@/features/maps/actions";
import type {
  ConceptSummary,
  LinkSummary,
  MapDetail,
  ScenarioSummary,
} from "@/features/maps/types";
import { deleteLinkAction, updateLinkAction, createLinkAction } from "@/features/links/actions";
import type { InspectorSelection } from "@/features/inspector/types";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import { StatusBadge } from "@/shared/ui/components/status-badge";
import type { WorkspaceRole } from "@/shared/db/schema";
import type { ActionState } from "@/shared/validation/action-state";

const conceptTypeOptions = [
  "thought",
  "state",
  "belief",
  "experience",
  "fact",
  "trigger",
  "custom",
] as const;

const relationTypeOptions = [
  "causes",
  "strengthens",
  "weakens",
  "explains",
  "contradicts",
] as const;

const strengthOptions = [1, 2, 3, 4, 5] as const;

const conceptFormState: ActionState<
  "title" | "conceptType" | "summary" | "description"
> = { status: "idle" };

const linkFormState: ActionState<
  "sourceConceptId" | "targetConceptId" | "relationType" | "strength" | "description"
> = { status: "idle" };

const mapFormState: ActionState<"title" | "subjectLabel" | "description"> = {
  status: "idle",
};

type InspectorPanelProps = {
  workspaceSlug: string;
  workspaceRole: WorkspaceRole;
  map: MapDetail;
  concepts: ConceptSummary[];
  links: LinkSummary[];
  scenarios: ScenarioSummary[];
  selection: InspectorSelection;
  onSelect: (selection: InspectorSelection) => void;
};

export function InspectorPanel({
  workspaceSlug,
  workspaceRole,
  map,
  concepts,
  links,
  selection,
  onSelect,
}: InspectorPanelProps) {
  const conceptLookup = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts]
  );

  const link = selection.kind === "link"
    ? links.find((candidate) => candidate.id === selection.id) ?? null
    : null;
  const concept = selection.kind === "concept"
    ? concepts.find((candidate) => candidate.id === selection.id) ?? null
    : null;

  const incomingLinks = concept
    ? links.filter((candidate) => candidate.targetConceptId === concept.id)
    : [];
  const outgoingLinks = concept
    ? links.filter((candidate) => candidate.sourceConceptId === concept.id)
    : [];

  return (
    <Flex direction="column" gap="4" height="100%">
      <Card>
        <Flex direction="column" gap="2">
          <Heading size="4">Inspector</Heading>
          <Text color="gray" size="2">
            Open the selected Concept or Link, clarify its meaning, and keep
            the structure explainable.
          </Text>
        </Flex>
      </Card>

      {selection.kind === "none" ? (
        <EmptyState
          title="Nothing is selected"
          description="Select a Concept or Link on the canvas, or start by creating the first Concept for this map."
          action={
            <Flex gap="2" wrap="wrap">
              <Button
                type="button"
                onClick={() => onSelect({ kind: "create-concept" })}
              >
                New Concept
              </Button>
              <Button
                type="button"
                variant="soft"
                onClick={() => onSelect({ kind: "create-link" })}
              >
                Create Link
              </Button>
            </Flex>
          }
        />
      ) : null}

      {selection.kind === "create-concept" ? (
        <CreateConceptCard
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          conceptCount={concepts.length}
        />
      ) : null}

      {selection.kind === "create-link" ? (
        <CreateLinkCard
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          concepts={concepts}
        />
      ) : null}

      {selection.kind === "map-settings" ? (
        <MapSettingsCard
          workspaceSlug={workspaceSlug}
          workspaceRole={workspaceRole}
          map={map}
        />
      ) : null}

      {selection.kind === "concept" && concept ? (
        <ConceptInspectorCard
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          concept={concept}
          incomingLinks={incomingLinks}
          outgoingLinks={outgoingLinks}
          conceptLookup={conceptLookup}
          onSelect={onSelect}
        />
      ) : null}

      {selection.kind === "link" && link ? (
        <LinkInspectorCard
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          concepts={concepts}
          link={link}
          onSelect={onSelect}
        />
      ) : null}
    </Flex>
  );
}

type CreateConceptCardProps = {
  workspaceSlug: string;
  mapId: string;
  conceptCount: number;
};

function CreateConceptCard({
  workspaceSlug,
  mapId,
  conceptCount,
}: CreateConceptCardProps) {
  const [state, formAction, isPending] = useActionState(
    createConceptAction,
    conceptFormState
  );
  const [conceptType, setConceptType] = useState<(typeof conceptTypeOptions)[number]>(
    "custom"
  );
  const defaultX = 96 + (conceptCount % 4) * 220;
  const defaultY = 96 + Math.floor(conceptCount / 4) * 150;

  return (
    <Card>
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <input type="hidden" name="conceptType" value={conceptType} />
        <input type="hidden" name="x" value={defaultX} />
        <input type="hidden" name="y" value={defaultY} />
        <Flex direction="column" gap="4">
          <Heading size="4">New Concept</Heading>
          <InlineFormField label="Title" error={state.fieldErrors?.title?.[0]}>
            <TextField.Root
              name="title"
              placeholder="Fear of being misunderstood"
              size="3"
            />
          </InlineFormField>
          <InlineFormField
            label="Concept type"
            error={state.fieldErrors?.conceptType?.[0]}
          >
            <OptionPills
              options={conceptTypeOptions}
              value={conceptType}
              onChange={setConceptType}
            />
          </InlineFormField>
          <InlineFormField
            label="Summary"
            error={state.fieldErrors?.summary?.[0]}
          >
            <TextField.Root
              name="summary"
              placeholder="Short meaning visible directly on the canvas."
              size="3"
            />
          </InlineFormField>
          <InlineFormField
            label="Description"
            error={state.fieldErrors?.description?.[0]}
          >
            <TextArea
              name="description"
              placeholder="What this Concept represents, when it appears, and why it matters in the person's structure."
            />
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" loading={isPending}>
            Create Concept
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

type ConceptInspectorCardProps = {
  workspaceSlug: string;
  mapId: string;
  concept: ConceptSummary;
  incomingLinks: LinkSummary[];
  outgoingLinks: LinkSummary[];
  conceptLookup: Map<string, ConceptSummary>;
  onSelect: (selection: InspectorSelection) => void;
};

function ConceptInspectorCard({
  workspaceSlug,
  mapId,
  concept,
  incomingLinks,
  outgoingLinks,
  conceptLookup,
  onSelect,
}: ConceptInspectorCardProps) {
  const [state, formAction, isPending] = useActionState(
    updateConceptAction,
    conceptFormState
  );
  const [conceptType, setConceptType] = useState(concept.conceptType);

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex align="start" justify="between" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">{concept.title}</Heading>
            <StatusBadge status={concept.conceptType} />
          </Flex>
          <form action={archiveConceptAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={mapId} />
            <input type="hidden" name="conceptId" value={concept.id} />
            <Button type="submit" variant="soft" color="gray">
              Archive
            </Button>
          </form>
        </Flex>

        <form action={formAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="mapId" value={mapId} />
          <input type="hidden" name="conceptId" value={concept.id} />
          <input type="hidden" name="conceptType" value={conceptType} />
          <input type="hidden" name="x" value={concept.x} />
          <input type="hidden" name="y" value={concept.y} />
          <Flex direction="column" gap="4">
            <InlineFormField label="Title" error={state.fieldErrors?.title?.[0]}>
              <TextField.Root name="title" defaultValue={concept.title} size="3" />
            </InlineFormField>
            <InlineFormField
              label="Concept type"
              error={state.fieldErrors?.conceptType?.[0]}
            >
              <OptionPills
                options={conceptTypeOptions}
                value={conceptType}
                onChange={setConceptType}
              />
            </InlineFormField>
            <InlineFormField
              label="Summary"
              error={state.fieldErrors?.summary?.[0]}
            >
              <TextField.Root
                name="summary"
                defaultValue={concept.summary ?? ""}
                size="3"
              />
            </InlineFormField>
            <InlineFormField
              label="Description"
              error={state.fieldErrors?.description?.[0]}
            >
              <TextArea
                name="description"
                defaultValue={concept.description ?? ""}
              />
            </InlineFormField>
            {state.message ? (
              <Text color="red" size="2">
                {state.message}
              </Text>
            ) : null}
            <Button type="submit" loading={isPending}>
              Save Concept
            </Button>
          </Flex>
        </form>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Connected Links</Heading>
          {incomingLinks.length === 0 && outgoingLinks.length === 0 ? (
            <Text color="gray" size="2">
              This Concept is not linked yet. Create a Link to show what it
              causes, strengthens, weakens, explains, or contradicts.
            </Text>
          ) : (
            <>
              <LinkList
                label="Incoming"
                links={incomingLinks}
                conceptLookup={conceptLookup}
                direction="incoming"
                onSelect={onSelect}
              />
              <LinkList
                label="Outgoing"
                links={outgoingLinks}
                conceptLookup={conceptLookup}
                direction="outgoing"
                onSelect={onSelect}
              />
            </>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

type CreateLinkCardProps = {
  workspaceSlug: string;
  mapId: string;
  concepts: ConceptSummary[];
};

function CreateLinkCard({
  workspaceSlug,
  mapId,
  concepts,
}: CreateLinkCardProps) {
  const [state, formAction, isPending] = useActionState(
    createLinkAction,
    linkFormState
  );
  const [sourceConceptId, setSourceConceptId] = useState(concepts[0]?.id ?? "");
  const [targetConceptId, setTargetConceptId] = useState(concepts[1]?.id ?? "");
  const [relationType, setRelationType] = useState<(typeof relationTypeOptions)[number]>(
    "causes"
  );
  const [strength, setStrength] = useState<(typeof strengthOptions)[number]>(3);

  if (concepts.length < 2) {
    return (
      <EmptyState
        title="At least two Concepts are required"
        description="Create a second Concept before adding a Link. A Link only makes sense when one Concept can influence another."
      />
    );
  }

  return (
    <Card>
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <input type="hidden" name="sourceConceptId" value={sourceConceptId} />
        <input type="hidden" name="targetConceptId" value={targetConceptId} />
        <input type="hidden" name="relationType" value={relationType} />
        <input type="hidden" name="strength" value={strength} />
        <Flex direction="column" gap="4">
          <Heading size="4">Create Link</Heading>
          <InlineFormField
            label="Source Concept"
            error={state.fieldErrors?.sourceConceptId?.[0]}
          >
            <OptionPills
              options={concepts.map((concept) => ({
                value: concept.id,
                label: concept.title,
              }))}
              value={sourceConceptId}
              onChange={setSourceConceptId}
            />
          </InlineFormField>
          <InlineFormField
            label="Target Concept"
            error={state.fieldErrors?.targetConceptId?.[0]}
          >
            <OptionPills
              options={concepts
                .filter((concept) => concept.id !== sourceConceptId)
                .map((concept) => ({
                  value: concept.id,
                  label: concept.title,
                }))}
              value={targetConceptId}
              onChange={setTargetConceptId}
            />
          </InlineFormField>
          <InlineFormField
            label="Relation type"
            error={state.fieldErrors?.relationType?.[0]}
          >
            <OptionPills
              options={relationTypeOptions}
              value={relationType}
              onChange={setRelationType}
            />
          </InlineFormField>
          <InlineFormField
            label="Strength"
            error={state.fieldErrors?.strength?.[0]}
          >
            <OptionPills
              options={strengthOptions.map((value) => ({
                value: String(value),
                label: String(value),
              }))}
              value={String(strength)}
              onChange={(value) => setStrength(Number(value) as (typeof strengthOptions)[number])}
            />
          </InlineFormField>
          <InlineFormField
            label="Description"
            error={state.fieldErrors?.description?.[0]}
          >
            <TextArea
              name="description"
              placeholder="Explain why this Link exists and what kind of influence it represents."
            />
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" loading={isPending}>
            Create Link
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

type LinkInspectorCardProps = {
  workspaceSlug: string;
  mapId: string;
  concepts: ConceptSummary[];
  link: LinkSummary;
  onSelect: (selection: InspectorSelection) => void;
};

function LinkInspectorCard({
  workspaceSlug,
  mapId,
  concepts,
  link,
  onSelect,
}: LinkInspectorCardProps) {
  const [state, formAction, isPending] = useActionState(
    updateLinkAction,
    linkFormState
  );
  const [sourceConceptId, setSourceConceptId] = useState(link.sourceConceptId);
  const [targetConceptId, setTargetConceptId] = useState(link.targetConceptId);
  const [relationType, setRelationType] = useState(link.relationType);
  const [strength, setStrength] = useState(String(link.strength));
  const sourceConcept = concepts.find((concept) => concept.id === link.sourceConceptId);
  const targetConcept = concepts.find((concept) => concept.id === link.targetConceptId);

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex align="start" justify="between" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">Link</Heading>
            <Flex gap="2" wrap="wrap">
              <StatusBadge status={link.relationType} />
              <Badge color="orange" variant="surface">
                strength {link.strength}
              </Badge>
            </Flex>
          </Flex>
          <form action={deleteLinkAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={mapId} />
            <input type="hidden" name="linkId" value={link.id} />
            <Button type="submit" variant="soft" color="gray">
              Delete
            </Button>
          </form>
        </Flex>

        <Card variant="surface">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              Current direction
            </Text>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelect({ kind: "concept", id: link.sourceConceptId })}
            >
              {sourceConcept?.title ?? "Unknown Concept"}
            </Button>
            <Text size="2" color="gray">
              {link.relationType.replace(/_/g, " ")}
            </Text>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelect({ kind: "concept", id: link.targetConceptId })}
            >
              {targetConcept?.title ?? "Unknown Concept"}
            </Button>
          </Flex>
        </Card>

        <form action={formAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="mapId" value={mapId} />
          <input type="hidden" name="linkId" value={link.id} />
          <input type="hidden" name="sourceConceptId" value={sourceConceptId} />
          <input type="hidden" name="targetConceptId" value={targetConceptId} />
          <input type="hidden" name="relationType" value={relationType} />
          <input type="hidden" name="strength" value={strength} />
          <Flex direction="column" gap="4">
            <InlineFormField
              label="Source Concept"
              error={state.fieldErrors?.sourceConceptId?.[0]}
            >
              <OptionPills
                options={concepts.map((concept) => ({
                  value: concept.id,
                  label: concept.title,
                }))}
                value={sourceConceptId}
                onChange={setSourceConceptId}
              />
            </InlineFormField>
            <InlineFormField
              label="Target Concept"
              error={state.fieldErrors?.targetConceptId?.[0]}
            >
              <OptionPills
                options={concepts
                  .filter((concept) => concept.id !== sourceConceptId)
                  .map((concept) => ({
                    value: concept.id,
                    label: concept.title,
                  }))}
                value={targetConceptId}
                onChange={setTargetConceptId}
              />
            </InlineFormField>
            <InlineFormField
              label="Relation type"
              error={state.fieldErrors?.relationType?.[0]}
            >
              <OptionPills
                options={relationTypeOptions}
                value={relationType}
                onChange={setRelationType}
              />
            </InlineFormField>
            <InlineFormField
              label="Strength"
              error={state.fieldErrors?.strength?.[0]}
            >
              <OptionPills
                options={strengthOptions.map((value) => ({
                  value: String(value),
                  label: String(value),
                }))}
                value={strength}
                onChange={setStrength}
              />
            </InlineFormField>
            <InlineFormField
              label="Description"
              error={state.fieldErrors?.description?.[0]}
            >
              <TextArea
                name="description"
                defaultValue={link.description ?? ""}
              />
            </InlineFormField>
            {state.message ? (
              <Text color="red" size="2">
                {state.message}
              </Text>
            ) : null}
            <Button type="submit" loading={isPending}>
              Save Link
            </Button>
          </Flex>
        </form>
      </Flex>
    </Card>
  );
}

type OptionChoice<TValue extends OptionPillsValue> =
  | TValue
  | {
      value: TValue;
      label: string;
    };

type OptionPillsValue = string;

type OptionPillsProps<TValue extends OptionPillsValue> = {
  options: readonly OptionChoice<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
};

function OptionPills<TValue extends OptionPillsValue>({
  options,
  value,
  onChange,
}: OptionPillsProps<TValue>) {
  const normalized = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option.replace(/_/g, " ") }
      : option
  );

  return (
    <Flex gap="2" wrap="wrap">
      {normalized.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={option.value === value ? "solid" : "surface"}
          color={option.value === value ? "blue" : "gray"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </Flex>
  );
}
type MapSettingsCardProps = {
  workspaceSlug: string;
  workspaceRole: WorkspaceRole;
  map: MapDetail;
};

function MapSettingsCard({
  workspaceSlug,
  workspaceRole,
  map,
}: MapSettingsCardProps) {
  const [state, formAction, isPending] = useActionState(
    renameMapAction,
    mapFormState
  );

  return (
    <Card>
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={map.id} />
        <Flex direction="column" gap="4">
          <Heading size="4">Map settings</Heading>
          <InlineFormField label="Title" error={state.fieldErrors?.title?.[0]}>
            <TextField.Root name="title" defaultValue={map.title} size="3" />
          </InlineFormField>
          <InlineFormField
            label="Subject label"
            error={state.fieldErrors?.subjectLabel?.[0]}
          >
            <TextField.Root
              name="subjectLabel"
              defaultValue={map.subjectLabel}
              size="3"
            />
          </InlineFormField>
          <InlineFormField
            label="Description"
            error={state.fieldErrors?.description?.[0]}
          >
            <TextArea
              name="description"
              defaultValue={map.description ?? ""}
            />
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" loading={isPending}>
            Save map
          </Button>
        </Flex>
      </form>

      {workspaceRole !== "member" ? (
        <>
          <Separator size="4" my="4" />
          <form action={archiveMapAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={map.id} />
            <Button type="submit" variant="soft" color="gray">
              Archive map
            </Button>
          </form>
        </>
      ) : null}
    </Card>
  );
}

type LinkListProps = {
  label: string;
  links: LinkSummary[];
  conceptLookup: Map<string, ConceptSummary>;
  direction: "incoming" | "outgoing";
  onSelect: (selection: InspectorSelection) => void;
};

function LinkList({
  label,
  links,
  conceptLookup,
  direction,
  onSelect,
}: LinkListProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium">
        {label}
      </Text>
      {links.map((link) => {
        const relatedConceptId =
          direction === "incoming" ? link.sourceConceptId : link.targetConceptId;
        const relatedConcept = conceptLookup.get(relatedConceptId);

        return (
          <Card key={`${label}-${link.id}`} variant="surface">
            <Flex align="center" justify="between" gap="3" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text weight="medium">
                  {relatedConcept?.title ?? "Unknown Concept"}
                </Text>
                <Text color="gray" size="2">
                  {link.relationType.replace(/_/g, " ")} · strength {link.strength}
                </Text>
              </Flex>
              <Button
                type="button"
                variant="soft"
                onClick={() => onSelect({ kind: "link", id: link.id })}
              >
                Open Link
              </Button>
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}
