"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Select,
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
import {
  deleteLinkAction,
  createLinkAction,
  updateLinkAction,
} from "@/features/links/actions";
import type { InspectorSelection } from "@/features/inspector/types";
import { archiveMapAction, renameMapAction } from "@/features/maps/actions";
import {
  getDefaultConceptPosition,
  getGuidedOnboardingCopy,
  type CanvasInteractionMode,
  type GuidedOnboardingStep,
} from "@/features/maps/workspace-state";
import type {
  ConceptSummary,
  LinkSummary,
  MapDetail,
} from "@/features/maps/types";
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
  | "sourceConceptId"
  | "targetConceptId"
  | "relationType"
  | "strength"
  | "description"
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
  selection: InspectorSelection;
  guidedStep: GuidedOnboardingStep;
  interactionMode: CanvasInteractionMode;
  linkingSourceConcept: ConceptSummary | null;
  onSelect: (selection: InspectorSelection) => void;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
  onOpenScenario: () => void;
  onCancelInteraction: () => void;
};

export function InspectorPanel({
  workspaceSlug,
  workspaceRole,
  map,
  concepts,
  links,
  selection,
  guidedStep,
  interactionMode,
  linkingSourceConcept,
  onSelect,
  onStartCreateConcept,
  onStartCreateLink,
  onOpenScenario,
  onCancelInteraction,
}: InspectorPanelProps) {
  const conceptLookup = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts]
  );

  const link =
    selection.kind === "link"
      ? (links.find((candidate) => candidate.id === selection.id) ?? null)
      : null;
  const concept =
    selection.kind === "concept"
      ? (concepts.find((candidate) => candidate.id === selection.id) ?? null)
      : null;

  const incomingLinks = concept
    ? links.filter((candidate) => candidate.targetConceptId === concept.id)
    : [];
  const outgoingLinks = concept
    ? links.filter((candidate) => candidate.sourceConceptId === concept.id)
    : [];

  return (
    <Flex direction="column" gap="3" height="100%">
      {selection.kind === "none" ? (
        <GuidedInspectorState
          guidedStep={guidedStep}
          interactionMode={interactionMode}
          linkingSourceConcept={linkingSourceConcept}
          onStartCreateConcept={onStartCreateConcept}
          onStartCreateLink={onStartCreateLink}
          onOpenScenario={onOpenScenario}
          onCancelInteraction={onCancelInteraction}
        />
      ) : null}

      {selection.kind === "create-concept" ? (
        <CreateConceptCard
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          conceptCount={concepts.length}
          initialX={selection.x}
          initialY={selection.y}
        />
      ) : null}

      {selection.kind === "create-link" ? (
        <CreateLinkCard
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          concepts={concepts}
          initialSourceConceptId={selection.sourceConceptId}
          initialTargetConceptId={selection.targetConceptId}
          initialRelationType={selection.relationType}
          initialStrength={selection.strength}
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

type GuidedInspectorStateProps = {
  guidedStep: GuidedOnboardingStep;
  interactionMode: CanvasInteractionMode;
  linkingSourceConcept: ConceptSummary | null;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
  onOpenScenario: () => void;
  onCancelInteraction: () => void;
};

function GuidedInspectorState({
  guidedStep,
  interactionMode,
  linkingSourceConcept,
  onStartCreateConcept,
  onStartCreateLink,
  onOpenScenario,
  onCancelInteraction,
}: GuidedInspectorStateProps) {
  if (interactionMode === "placeConcept") {
    return (
      <EmptyState
        title="Click on the canvas to place the Concept"
        description="The next click sets the position, then the Inspector opens a short Concept form."
        action={
          <Button type="button" variant="soft" onClick={onCancelInteraction}>
            Cancel
          </Button>
        }
      />
    );
  }

  if (interactionMode === "connectLink") {
    return (
      <EmptyState
        title={
          linkingSourceConcept
            ? `Choose a target for \"${linkingSourceConcept.title}\"`
            : "Select the source Concept"
        }
        description={
          linkingSourceConcept
            ? "Click a different Concept on the canvas. The Link form will open already filled in."
            : "The first click chooses where the influence starts."
        }
        action={
          <Button type="button" variant="soft" onClick={onCancelInteraction}>
            Cancel
          </Button>
        }
      />
    );
  }

  const guidedCopy = getGuidedOnboardingCopy(guidedStep);

  return (
    <EmptyState
      title={guidedCopy.title}
      description={guidedCopy.description}
      action={
        guidedStep === "no_concepts" || guidedStep === "one_concept_no_link" ? (
          <Button type="button" onClick={onStartCreateConcept}>
            {guidedCopy.actionLabel}
          </Button>
        ) : guidedStep === "multiple_concepts_no_link" ? (
          <Button type="button" onClick={onStartCreateLink}>
            {guidedCopy.actionLabel}
          </Button>
        ) : guidedStep === "has_links_no_run" ? (
          <Button type="button" onClick={onOpenScenario}>
            {guidedCopy.actionLabel}
          </Button>
        ) : undefined
      }
    />
  );
}

type CreateConceptCardProps = {
  workspaceSlug: string;
  mapId: string;
  conceptCount: number;
  initialX: number | undefined;
  initialY: number | undefined;
};

function CreateConceptCard({
  workspaceSlug,
  mapId,
  conceptCount,
  initialX,
  initialY,
}: CreateConceptCardProps) {
  const [state, formAction, isPending] = useActionState(
    createConceptAction,
    conceptFormState
  );
  const [conceptType, setConceptType] =
    useState<(typeof conceptTypeOptions)[number]>("custom");
  const fallbackPosition = getDefaultConceptPosition(conceptCount);
  const x = initialX ?? fallbackPosition.x;
  const y = initialY ?? fallbackPosition.y;

  return (
    <Card className="panel-card">
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <input type="hidden" name="x" value={x} />
        <input type="hidden" name="y" value={y} />
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">New Concept</Heading>
            <Text size="2" color="gray">
              Position: {Math.round(x)} | {Math.round(y)}
            </Text>
          </Flex>

          <InlineFormField label="Title" error={state.fieldErrors?.title?.[0]}>
            <TextField.Root
              name="title"
              placeholder="Fear of being misunderstood"
              size="2"
            />
          </InlineFormField>

          <InlineFormField
            label="Concept type"
            error={state.fieldErrors?.conceptType?.[0]}
          >
            <Select.Root
              name="conceptType"
              value={conceptType}
              onValueChange={(value) =>
                setConceptType(value as (typeof conceptTypeOptions)[number])
              }
            >
              <Select.Trigger />
              <Select.Content>
                {conceptTypeOptions.map((option) => (
                  <Select.Item key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </InlineFormField>

          <InlineFormField
            label="Summary"
            error={state.fieldErrors?.summary?.[0]}
          >
            <TextField.Root
              name="summary"
              placeholder="What should be visible on the canvas."
              size="2"
            />
          </InlineFormField>

          <InlineFormField
            label="Description"
            error={state.fieldErrors?.description?.[0]}
          >
            <TextArea
              name="description"
              placeholder="Why this Concept matters in the person's structure."
              rows={3}
            />
          </InlineFormField>

          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}

          <Button type="submit" size="2" loading={isPending}>
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
    <Card className="panel-card">
      <Flex direction="column" gap="3">
        <Flex align="start" justify="between" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">{concept.title}</Heading>
            <StatusBadge status={concept.conceptType} />
          </Flex>
          <form action={archiveConceptAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={mapId} />
            <input type="hidden" name="conceptId" value={concept.id} />
            <Button type="submit" size="2" variant="soft" color="gray">
              Archive
            </Button>
          </form>
        </Flex>

        <form action={formAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="mapId" value={mapId} />
          <input type="hidden" name="conceptId" value={concept.id} />
          <input type="hidden" name="x" value={concept.x} />
          <input type="hidden" name="y" value={concept.y} />
          <Flex direction="column" gap="3">
            <InlineFormField
              label="Title"
              error={state.fieldErrors?.title?.[0]}
            >
              <TextField.Root
                name="title"
                defaultValue={concept.title}
                size="2"
              />
            </InlineFormField>
            <InlineFormField
              label="Concept type"
              error={state.fieldErrors?.conceptType?.[0]}
            >
              <Select.Root
                name="conceptType"
                value={conceptType}
                onValueChange={(value) =>
                  setConceptType(value as (typeof conceptTypeOptions)[number])
                }
              >
                <Select.Trigger />
                <Select.Content>
                  {conceptTypeOptions.map((option) => (
                    <Select.Item key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InlineFormField>
            <InlineFormField
              label="Summary"
              error={state.fieldErrors?.summary?.[0]}
            >
              <TextField.Root
                name="summary"
                defaultValue={concept.summary ?? ""}
                size="2"
              />
            </InlineFormField>
            <InlineFormField
              label="Description"
              error={state.fieldErrors?.description?.[0]}
            >
              <TextArea
                name="description"
                defaultValue={concept.description ?? ""}
                rows={4}
              />
            </InlineFormField>
            {state.message ? (
              <Text color="red" size="2">
                {state.message}
              </Text>
            ) : null}
            <Button type="submit" size="2" loading={isPending}>
              Save Concept
            </Button>
          </Flex>
        </form>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="3">Connected Links</Heading>
          {incomingLinks.length === 0 && outgoingLinks.length === 0 ? (
            <Text color="gray" size="2">
              This Concept is not linked yet. Add a Link so the structure
              becomes explainable.
            </Text>
          ) : (
            <>
              <LinkList
                key={`incoming-${concept.id}`}
                label="Incoming"
                links={incomingLinks}
                conceptLookup={conceptLookup}
                direction="incoming"
                onSelect={onSelect}
              />
              <LinkList
                key={`outgoing-${concept.id}`}
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
  initialSourceConceptId: string | undefined;
  initialTargetConceptId: string | undefined;
  initialRelationType: (typeof relationTypeOptions)[number] | undefined;
  initialStrength: number | undefined;
};

function CreateLinkCard({
  workspaceSlug,
  mapId,
  concepts,
  initialSourceConceptId,
  initialTargetConceptId,
  initialRelationType,
  initialStrength,
}: CreateLinkCardProps) {
  const [state, formAction, isPending] = useActionState(
    createLinkAction,
    linkFormState
  );
  const [sourceConceptId, setSourceConceptId] = useState(
    initialSourceConceptId ?? concepts[0]?.id ?? ""
  );
  const targetOptions = concepts.filter(
    (concept) => concept.id !== sourceConceptId
  );
  const [targetConceptId, setTargetConceptId] = useState(
    initialTargetConceptId ??
      targetOptions.find((concept) => concept.id !== sourceConceptId)?.id ??
      ""
  );
  const [relationType, setRelationType] = useState<
    (typeof relationTypeOptions)[number]
  >(initialRelationType ?? "causes");
  const [strength, setStrength] = useState(String(initialStrength ?? 3));

  if (concepts.length < 2) {
    return (
      <EmptyState
        title="At least two Concepts are required"
        description="Create a second Concept before adding a Link. A Link only makes sense when one Concept can influence another."
      />
    );
  }

  return (
    <Card className="panel-card">
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <Flex direction="column" gap="3">
          <Heading size="4">Create Link</Heading>

          <InlineFormField
            label="Source Concept"
            error={state.fieldErrors?.sourceConceptId?.[0]}
          >
            <Select.Root
              name="sourceConceptId"
              value={sourceConceptId}
              onValueChange={(value) => {
                setSourceConceptId(value);
                if (value === targetConceptId) {
                  const nextTarget = concepts.find(
                    (concept) => concept.id !== value
                  );
                  setTargetConceptId(nextTarget?.id ?? "");
                }
              }}
            >
              <Select.Trigger />
              <Select.Content>
                {concepts.map((concept) => (
                  <Select.Item key={concept.id} value={concept.id}>
                    {concept.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </InlineFormField>

          <InlineFormField
            label="Target Concept"
            error={state.fieldErrors?.targetConceptId?.[0]}
          >
            <Select.Root
              name="targetConceptId"
              value={targetConceptId}
              onValueChange={setTargetConceptId}
            >
              <Select.Trigger />
              <Select.Content>
                {concepts
                  .filter((concept) => concept.id !== sourceConceptId)
                  .map((concept) => (
                    <Select.Item key={concept.id} value={concept.id}>
                      {concept.title}
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select.Root>
          </InlineFormField>

          <Flex gap="3" wrap="wrap">
            <InlineFormField
              label="Relation type"
              error={state.fieldErrors?.relationType?.[0]}
            >
              <Select.Root
                name="relationType"
                value={relationType}
                onValueChange={(value) =>
                  setRelationType(value as (typeof relationTypeOptions)[number])
                }
              >
                <Select.Trigger />
                <Select.Content>
                  {relationTypeOptions.map((option) => (
                    <Select.Item key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InlineFormField>

            <InlineFormField
              label="Strength"
              error={state.fieldErrors?.strength?.[0]}
            >
              <Select.Root
                name="strength"
                value={strength}
                onValueChange={setStrength}
              >
                <Select.Trigger />
                <Select.Content>
                  {strengthOptions.map((value) => (
                    <Select.Item key={value} value={String(value)}>
                      {String(value)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InlineFormField>
          </Flex>

          <InlineFormField
            label="Description"
            error={state.fieldErrors?.description?.[0]}
          >
            <TextArea
              name="description"
              placeholder="Why does this influence exist?"
              rows={3}
            />
          </InlineFormField>

          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}

          <Button type="submit" size="2" loading={isPending}>
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
  const sourceConcept = concepts.find(
    (concept) => concept.id === sourceConceptId
  );
  const targetConcept = concepts.find(
    (concept) => concept.id === targetConceptId
  );

  return (
    <Card className="panel-card">
      <Flex direction="column" gap="3">
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
            <Button type="submit" size="2" variant="soft" color="gray">
              Delete
            </Button>
          </form>
        </Flex>

        <Card variant="surface" className="panel-surface-card">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              Current direction
            </Text>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onSelect({ kind: "concept", id: link.sourceConceptId })
              }
            >
              {sourceConcept?.title ?? "Unknown Concept"}
            </Button>
            <Text size="2" color="gray">
              {link.relationType.replace(/_/g, " ")}
            </Text>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onSelect({ kind: "concept", id: link.targetConceptId })
              }
            >
              {targetConcept?.title ?? "Unknown Concept"}
            </Button>
          </Flex>
        </Card>

        <form action={formAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="mapId" value={mapId} />
          <input type="hidden" name="linkId" value={link.id} />
          <Flex direction="column" gap="3">
            <InlineFormField
              label="Source Concept"
              error={state.fieldErrors?.sourceConceptId?.[0]}
            >
              <Select.Root
                name="sourceConceptId"
                value={sourceConceptId}
                onValueChange={(value) => {
                  setSourceConceptId(value);
                  if (value === targetConceptId) {
                    const nextTarget = concepts.find(
                      (concept) => concept.id !== value
                    );
                    setTargetConceptId(nextTarget?.id ?? "");
                  }
                }}
              >
                <Select.Trigger />
                <Select.Content>
                  {concepts.map((concept) => (
                    <Select.Item key={concept.id} value={concept.id}>
                      {concept.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </InlineFormField>
            <InlineFormField
              label="Target Concept"
              error={state.fieldErrors?.targetConceptId?.[0]}
            >
              <Select.Root
                name="targetConceptId"
                value={targetConceptId}
                onValueChange={setTargetConceptId}
              >
                <Select.Trigger />
                <Select.Content>
                  {concepts
                    .filter((concept) => concept.id !== sourceConceptId)
                    .map((concept) => (
                      <Select.Item key={concept.id} value={concept.id}>
                        {concept.title}
                      </Select.Item>
                    ))}
                </Select.Content>
              </Select.Root>
            </InlineFormField>
            <Flex gap="3" wrap="wrap">
              <InlineFormField
                label="Relation type"
                error={state.fieldErrors?.relationType?.[0]}
              >
                <Select.Root
                  name="relationType"
                  value={relationType}
                  onValueChange={(value) =>
                    setRelationType(
                      value as (typeof relationTypeOptions)[number]
                    )
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    {relationTypeOptions.map((option) => (
                      <Select.Item key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </InlineFormField>
              <InlineFormField
                label="Strength"
                error={state.fieldErrors?.strength?.[0]}
              >
                <Select.Root
                  name="strength"
                  value={strength}
                  onValueChange={setStrength}
                >
                  <Select.Trigger />
                  <Select.Content>
                    {strengthOptions.map((value) => (
                      <Select.Item key={value} value={String(value)}>
                        {String(value)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </InlineFormField>
            </Flex>
            <InlineFormField
              label="Description"
              error={state.fieldErrors?.description?.[0]}
            >
              <TextArea
                name="description"
                defaultValue={link.description ?? ""}
                rows={3}
              />
            </InlineFormField>
            {state.message ? (
              <Text color="red" size="2">
                {state.message}
              </Text>
            ) : null}
            <Button type="submit" size="2" loading={isPending}>
              Save Link
            </Button>
          </Flex>
        </form>
      </Flex>
    </Card>
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
    <Card className="panel-card">
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={map.id} />
        <Flex direction="column" gap="3">
          <Heading size="4">Map settings</Heading>
          <Flex gap="3" wrap="wrap">
            <div className="panel-field-half">
              <InlineFormField
                label="Title"
                error={state.fieldErrors?.title?.[0]}
              >
                <TextField.Root
                  name="title"
                  defaultValue={map.title}
                  size="2"
                />
              </InlineFormField>
            </div>
            <div className="panel-field-half">
              <InlineFormField
                label="Subject label"
                error={state.fieldErrors?.subjectLabel?.[0]}
              >
                <TextField.Root
                  name="subjectLabel"
                  defaultValue={map.subjectLabel}
                  size="2"
                />
              </InlineFormField>
            </div>
          </Flex>
          <InlineFormField
            label="Description"
            error={state.fieldErrors?.description?.[0]}
          >
            <TextArea
              name="description"
              defaultValue={map.description ?? ""}
              rows={3}
            />
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" size="2" loading={isPending}>
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
            <Button type="submit" size="2" variant="soft" color="gray">
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
  const [isOpen, setIsOpen] = useState(links.length <= 2);

  if (links.length === 0) {
    return null;
  }

  return (
    <Flex direction="column" gap="2">
      <Button
        type="button"
        size="1"
        variant="ghost"
        color="gray"
        className="panel-section-toggle"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {label} ({links.length})
      </Button>
      {isOpen
        ? links.map((link) => {
            const relatedConceptId =
              direction === "incoming"
                ? link.sourceConceptId
                : link.targetConceptId;
            const relatedConcept = conceptLookup.get(relatedConceptId);

            return (
              <Card
                key={`${label}-${link.id}`}
                variant="surface"
                className="panel-surface-card"
              >
                <Flex align="center" justify="between" gap="3" wrap="wrap">
                  <Flex direction="column" gap="1">
                    <Text weight="medium">
                      {relatedConcept?.title ?? "Unknown Concept"}
                    </Text>
                    <Text color="gray" size="2">
                      {link.relationType.replace(/_/g, " ")} | strength{" "}
                      {link.strength}
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
          })
        : null}
    </Flex>
  );
}
