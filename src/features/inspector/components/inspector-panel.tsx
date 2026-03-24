"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
  type ConceptActionState,
  updateConceptAction,
} from "@/features/concepts/actions";
import { InspectorProvenanceSection } from "@/features/inspector/components/inspector-provenance";
import { useInspectorPayload } from "@/features/map-runtime/hooks/use-inspector-payload";
import type { ConceptCatalogEntry } from "@/features/map-runtime/types";
import {
  createLinkAction,
  deleteLinkAction,
  type LinkActionState,
  updateLinkAction,
} from "@/features/links/actions";
import type {
  InspectorConceptPayload,
  InspectorLinkPayload,
  InspectorMutationFeedback,
  InspectorSelection,
} from "@/features/inspector/types";
import { archiveMapAction, renameMapAction } from "@/features/maps/actions";
import {
  getDefaultConceptPosition,
  type CanvasInteractionMode,
  type GuidedOnboardingStep,
} from "@/features/maps/workspace-state";
import type { MapDetail } from "@/features/maps/types";
import type { WorkspaceRole } from "@/shared/db/schema";
import type { SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";
import { ConfirmDialog } from "@/shared/ui/components/confirm-dialog";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import { StatusBadge } from "@/shared/ui/components/status-badge";
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

const conceptFormState: ConceptActionState = { status: "idle" };
const linkFormState: LinkActionState = { status: "idle" };
const mapFormState: ActionState<"title" | "subjectLabel" | "description"> = {
  status: "idle",
};

type InspectorPanelProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  workspaceRole: WorkspaceRole;
  map: MapDetail;
  conceptCount: number;
  conceptCatalog: ConceptCatalogEntry[];
  conceptCatalogLoading: boolean;
  conceptCatalogError: string | null;
  selection: InspectorSelection;
  guidedStep: GuidedOnboardingStep;
  interactionMode: CanvasInteractionMode;
  linkingSourceConceptTitle: string | null;
  onSelect: (selection: InspectorSelection) => void;
  onMutationFeedback: (feedback: InspectorMutationFeedback) => void;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
  onOpenScenario: () => void;
  onCancelInteraction: () => void;
};

export function InspectorPanel({
  locale,
  workspaceSlug,
  workspaceRole,
  map,
  conceptCount,
  conceptCatalog,
  conceptCatalogLoading,
  conceptCatalogError,
  selection,
  guidedStep,
  interactionMode,
  linkingSourceConceptTitle,
  onSelect,
  onMutationFeedback,
  onStartCreateConcept,
  onStartCreateLink,
  onOpenScenario,
  onCancelInteraction,
}: InspectorPanelProps) {
  const { payload, isLoading, error } = useInspectorPayload(map.id, selection);

  return (
    <Flex direction="column" gap="3">
      {selection.kind === "none" ? (
        <GuidedInspectorState
          locale={locale}
          guidedStep={guidedStep}
          interactionMode={interactionMode}
          linkingSourceConceptTitle={linkingSourceConceptTitle}
          conceptCount={conceptCount}
          onStartCreateConcept={onStartCreateConcept}
          onStartCreateLink={onStartCreateLink}
          onOpenScenario={onOpenScenario}
          onCancelInteraction={onCancelInteraction}
        />
      ) : null}

      {selection.kind === "create-concept" ? (
        <CreateConceptCard
          locale={locale}
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          conceptCount={conceptCount}
          initialX={selection.x}
          initialY={selection.y}
          onSelect={onSelect}
          onMutationFeedback={onMutationFeedback}
        />
      ) : null}

      {selection.kind === "create-link" ? (
        <CreateLinkCard
          locale={locale}
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          conceptCatalog={conceptCatalog}
          conceptCatalogLoading={conceptCatalogLoading}
          conceptCatalogError={conceptCatalogError}
          initialSourceConceptId={selection.sourceConceptId}
          initialTargetConceptId={selection.targetConceptId}
          initialRelationType={selection.relationType}
          initialStrength={selection.strength}
          onSelect={onSelect}
          onMutationFeedback={onMutationFeedback}
        />
      ) : null}

      {selection.kind === "map-settings" ? (
        <MapSettingsCard
          locale={locale}
          workspaceSlug={workspaceSlug}
          workspaceRole={workspaceRole}
          map={map}
        />
      ) : null}

      {selection.kind !== "none" &&
      selection.kind !== "create-concept" &&
      selection.kind !== "create-link" &&
      selection.kind !== "map-settings" &&
      isLoading ? (
        <LoadingCard locale={locale} />
      ) : null}
      {selection.kind !== "none" &&
      selection.kind !== "create-concept" &&
      selection.kind !== "create-link" &&
      selection.kind !== "map-settings" &&
      error ? (
        <ErrorCard locale={locale} message={error} />
      ) : null}

      {selection.kind === "concept" && payload?.kind === "concept" ? (
        <ConceptInspectorCard
          locale={locale}
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          payload={payload}
          onSelect={onSelect}
          onMutationFeedback={onMutationFeedback}
        />
      ) : null}

      {selection.kind === "link" && payload?.kind === "link" ? (
        <LinkInspectorCard
          locale={locale}
          workspaceSlug={workspaceSlug}
          mapId={map.id}
          conceptCatalog={conceptCatalog}
          conceptCatalogLoading={conceptCatalogLoading}
          conceptCatalogError={conceptCatalogError}
          payload={payload}
          onSelect={onSelect}
          onMutationFeedback={onMutationFeedback}
        />
      ) : null}
    </Flex>
  );
}

type GuidedInspectorStateProps = {
  locale: SupportedLocale;
  guidedStep: GuidedOnboardingStep;
  interactionMode: CanvasInteractionMode;
  linkingSourceConceptTitle: string | null;
  conceptCount: number;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
  onOpenScenario: () => void;
  onCancelInteraction: () => void;
};

function GuidedInspectorState({
  locale,
  guidedStep,
  interactionMode,
  linkingSourceConceptTitle,
  conceptCount,
  onStartCreateConcept,
  onStartCreateLink,
  onOpenScenario,
  onCancelInteraction,
}: GuidedInspectorStateProps) {
  const messages = getMapWorkspaceMessages(locale);
  const stepBadge =
    guidedStep === "done"
      ? messages.mapReadyBadge
      : messages.stepLabel(
          messages.guided[guidedStep].stepNumber,
          messages.guided[guidedStep].totalSteps
        );

  if (interactionMode === "placeConcept") {
    return (
      <EmptyState
        eyebrow={
          <Flex
            gap="2"
            wrap="wrap"
            align="center"
            className="inspector-empty-eyebrow-group"
          >
            <Badge color="blue" radius="full" variant="soft">
              {messages.canvas.placeConceptBadge}
            </Badge>
          </Flex>
        }
        title={messages.inspector.placeConceptTitle}
        description={messages.inspector.placeConceptDescription}
        action={
          <Button type="button" variant="soft" onClick={onCancelInteraction}>
            {messages.inspector.cancel}
          </Button>
        }
        className="inspector-empty-state is-mode-state"
      />
    );
  }

  if (interactionMode === "connectLink") {
    return (
      <EmptyState
        eyebrow={
          <Flex
            gap="2"
            wrap="wrap"
            align="center"
            className="inspector-empty-eyebrow-group"
          >
            <Badge color="blue" radius="full" variant="soft">
              {messages.canvas.createLinkBadge}
            </Badge>
            {linkingSourceConceptTitle ? (
              <Badge color="gray" radius="full" variant="surface">
                {linkingSourceConceptTitle}
              </Badge>
            ) : null}
          </Flex>
        }
        title={
          linkingSourceConceptTitle
            ? messages.inspector.connectLinkTargetTitle(
                linkingSourceConceptTitle
              )
            : messages.inspector.connectLinkSourceTitle
        }
        description={
          linkingSourceConceptTitle
            ? messages.inspector.connectLinkTargetDescription
            : messages.inspector.connectLinkSourceDescription
        }
        action={
          <Button type="button" variant="soft" onClick={onCancelInteraction}>
            {messages.inspector.cancel}
          </Button>
        }
        className="inspector-empty-state is-mode-state"
      />
    );
  }

  const guidedCopy = messages.guided[guidedStep];
  const primaryAction =
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
    ) : (
      <>
        <Button type="button" onClick={onStartCreateConcept}>
          {messages.topBar.newConcept}
        </Button>
        <Button type="button" variant="surface" onClick={onStartCreateLink}>
          {messages.topBar.createLink}
        </Button>
        <Button type="button" variant="soft" onClick={onOpenScenario}>
          {messages.topBar.runScenario}
        </Button>
      </>
    );

  return (
    <Flex direction="column" gap="3">
      <EmptyState
        eyebrow={
          <Flex
            gap="2"
            wrap="wrap"
            align="center"
            className="inspector-empty-eyebrow-group"
          >
            <Badge
              color={guidedStep === "done" ? "green" : "blue"}
              radius="full"
              variant="soft"
            >
              {stepBadge}
            </Badge>
          </Flex>
        }
        title={guidedCopy.title}
        description={guidedCopy.description}
        action={primaryAction}
        className={
          guidedStep === "done"
            ? "inspector-empty-state is-ready-state"
            : "inspector-empty-state"
        }
      />
      {guidedStep === "done" && (
        <Card className="panel-card">
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" color="gray">
              {locale === "uk"
                ? "Статистика карти"
                : locale === "ru"
                  ? "Статистика карты"
                  : "Map statistics"}
            </Text>
            <Flex gap="3" wrap="wrap">
              <Badge variant="surface" radius="full" size="2">
                {locale === "uk"
                  ? `${conceptCount} Концептів`
                  : locale === "ru"
                    ? `${conceptCount} Концептов`
                    : `${conceptCount} Concepts`}
              </Badge>
            </Flex>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}

type CreateConceptCardProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  conceptCount: number;
  initialX: number | undefined;
  initialY: number | undefined;
  onSelect: (selection: InspectorSelection) => void;
  onMutationFeedback: (feedback: InspectorMutationFeedback) => void;
};

function CreateConceptCard({
  locale,
  workspaceSlug,
  mapId,
  conceptCount,
  initialX,
  initialY,
  onSelect,
  onMutationFeedback,
}: CreateConceptCardProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [state, formAction, isPending] = useActionState(
    createConceptAction,
    conceptFormState
  );
  const [conceptType, setConceptType] =
    useState<(typeof conceptTypeOptions)[number]>("custom");
  const fallbackPosition = getDefaultConceptPosition(conceptCount);
  const x = initialX ?? fallbackPosition.x;
  const y = initialY ?? fallbackPosition.y;

  useEffect(() => {
    if (state.status !== "success" || !state.payload) {
      return;
    }

    onSelect({ kind: "concept", id: state.payload.conceptId });
    onMutationFeedback({
      kind: "concept",
      id: state.payload.conceptId,
      eventId: state.payload.eventId,
      message: messages.inspector.conceptCreatedFeedback,
    });
  }, [
    messages.inspector.conceptCreatedFeedback,
    onMutationFeedback,
    onSelect,
    state.payload,
    state.status,
  ]);

  return (
    <Card className="panel-card">
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <input type="hidden" name="x" value={x} />
        <input type="hidden" name="y" value={y} />
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">{messages.inspector.newConcept}</Heading>
            <Text size="2" color="gray">
              {messages.inspector.positionLabel}: {Math.round(x)} |{" "}
              {Math.round(y)}
            </Text>
          </Flex>
          <InlineFormField
            label={messages.inspector.titleLabel}
            error={state.fieldErrors?.title?.[0]}
          >
            {({ controlProps }) => (
              <TextField.Root
                {...controlProps}
                name="title"
                placeholder={messages.inspector.createConceptTitlePlaceholder}
                size="2"
              />
            )}
          </InlineFormField>
          <InlineFormField
            label={messages.inspector.conceptTypeLabel}
            error={state.fieldErrors?.conceptType?.[0]}
            association="labelledby"
          >
            {({ triggerProps }) => (
              <Select.Root
                name="conceptType"
                value={conceptType}
                onValueChange={(value) =>
                  setConceptType(value as (typeof conceptTypeOptions)[number])
                }
              >
                <Select.Trigger {...triggerProps} />
                <Select.Content>
                  {conceptTypeOptions.map((option) => (
                    <Select.Item key={option} value={option}>
                      {messages.labels.conceptTypes[option]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          </InlineFormField>
          <InlineFormField
            label={messages.inspector.summaryLabel}
            error={state.fieldErrors?.summary?.[0]}
          >
            {({ controlProps }) => (
              <TextField.Root
                {...controlProps}
                name="summary"
                placeholder={messages.inspector.createConceptSummaryPlaceholder}
                size="2"
              />
            )}
          </InlineFormField>
          <InlineFormField
            label={messages.inspector.descriptionLabel}
            error={state.fieldErrors?.description?.[0]}
          >
            {({ controlProps }) => (
              <TextArea
                {...controlProps}
                name="description"
                placeholder={
                  messages.inspector.createConceptDescriptionPlaceholder
                }
                rows={3}
              />
            )}
          </InlineFormField>
          {state.status === "error" && state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" size="2" loading={isPending}>
            {messages.inspector.createConceptCta}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

type ConceptInspectorCardProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  payload: InspectorConceptPayload;
  onSelect: (selection: InspectorSelection) => void;
  onMutationFeedback: (feedback: InspectorMutationFeedback) => void;
};

function ConceptInspectorCard({
  locale,
  workspaceSlug,
  mapId,
  payload,
  onSelect,
  onMutationFeedback,
}: ConceptInspectorCardProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [state, formAction, isPending] = useActionState(
    updateConceptAction,
    conceptFormState
  );
  const [conceptType, setConceptType] = useState(payload.concept.conceptType);

  useEffect(() => {
    if (state.status !== "success" || !state.payload) {
      return;
    }

    onMutationFeedback({
      kind: "concept",
      id: state.payload.conceptId,
      eventId: state.payload.eventId,
      message: messages.inspector.conceptUpdatedFeedback,
    });
  }, [
    messages.inspector.conceptUpdatedFeedback,
    onMutationFeedback,
    state.payload,
    state.status,
  ]);

  return (
    <Card className="panel-card">
      <Flex direction="column" gap="3">
        <Flex align="start" justify="between" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">{payload.concept.title}</Heading>
            <StatusBadge
              status={payload.concept.conceptType}
              label={messages.labels.conceptTypes[payload.concept.conceptType]}
            />
          </Flex>
          <ConfirmDialog
            triggerLabel={messages.inspector.conceptArchive}
            triggerButtonProps={{ size: "2", variant: "soft", color: "gray" }}
            title={messages.inspector.archiveConceptConfirmTitle}
            description={messages.inspector.archiveConceptConfirmDescription}
            confirmLabel={messages.inspector.conceptArchive}
            cancelLabel={messages.inspector.cancel}
            action={archiveConceptAction}
          >
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={mapId} />
            <input type="hidden" name="conceptId" value={payload.concept.id} />
          </ConfirmDialog>
        </Flex>

        <form action={formAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="mapId" value={mapId} />
          <input type="hidden" name="conceptId" value={payload.concept.id} />
          <input type="hidden" name="x" value={payload.concept.x} />
          <input type="hidden" name="y" value={payload.concept.y} />
          <Flex direction="column" gap="3">
            <InlineFormField
              label={messages.inspector.titleLabel}
              error={state.fieldErrors?.title?.[0]}
            >
              {({ controlProps }) => (
                <TextField.Root
                  {...controlProps}
                  name="title"
                  defaultValue={payload.concept.title}
                  size="2"
                />
              )}
            </InlineFormField>
            <InlineFormField
              label={messages.inspector.conceptTypeLabel}
              error={state.fieldErrors?.conceptType?.[0]}
              association="labelledby"
            >
              {({ triggerProps }) => (
                <Select.Root
                  name="conceptType"
                  value={conceptType}
                  onValueChange={(value) =>
                    setConceptType(value as (typeof conceptTypeOptions)[number])
                  }
                >
                  <Select.Trigger {...triggerProps} />
                  <Select.Content>
                    {conceptTypeOptions.map((option) => (
                      <Select.Item key={option} value={option}>
                        {messages.labels.conceptTypes[option]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            </InlineFormField>
            <InlineFormField
              label={messages.inspector.summaryLabel}
              error={state.fieldErrors?.summary?.[0]}
            >
              {({ controlProps }) => (
                <TextField.Root
                  {...controlProps}
                  name="summary"
                  defaultValue={payload.concept.summary ?? ""}
                  size="2"
                />
              )}
            </InlineFormField>
            <InlineFormField
              label={messages.inspector.descriptionLabel}
              error={state.fieldErrors?.description?.[0]}
            >
              {({ controlProps }) => (
                <TextArea
                  {...controlProps}
                  name="description"
                  defaultValue={payload.concept.description ?? ""}
                  rows={4}
                />
              )}
            </InlineFormField>
            {state.status === "error" && state.message ? (
              <Text color="red" size="2">
                {state.message}
              </Text>
            ) : null}
            {state.status === "success" ? (
              <Text color="green" size="2">
                {messages.inspector.conceptUpdatedFeedback}
              </Text>
            ) : null}
            <Button type="submit" size="2" loading={isPending}>
              {messages.inspector.conceptSave}
            </Button>
          </Flex>
        </form>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="3">{messages.inspector.connectedLinksTitle}</Heading>
          {payload.incoming.length === 0 && payload.outgoing.length === 0 ? (
            <Text color="gray" size="2">
              {messages.inspector.connectedLinksEmpty}
            </Text>
          ) : (
            <>
              <LinkList
                locale={locale}
                label={messages.inspector.incoming}
                links={payload.incoming}
                onSelect={onSelect}
              />
              <LinkList
                locale={locale}
                label={messages.inspector.outgoing}
                links={payload.outgoing}
                onSelect={onSelect}
              />
            </>
          )}
        </Flex>

        <Separator size="4" />

        <InspectorProvenanceSection
          locale={locale}
          workspaceSlug={workspaceSlug}
          provenance={payload.provenance}
        />
      </Flex>
    </Card>
  );
}

type CreateLinkCardProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  conceptCatalog: ConceptCatalogEntry[];
  conceptCatalogLoading: boolean;
  conceptCatalogError: string | null;
  initialSourceConceptId: string | undefined;
  initialTargetConceptId: string | undefined;
  initialRelationType: (typeof relationTypeOptions)[number] | undefined;
  initialStrength: number | undefined;
  onSelect: (selection: InspectorSelection) => void;
  onMutationFeedback: (feedback: InspectorMutationFeedback) => void;
};

function CreateLinkCard({
  locale,
  workspaceSlug,
  mapId,
  conceptCatalog,
  conceptCatalogLoading,
  conceptCatalogError,
  initialSourceConceptId,
  initialTargetConceptId,
  initialRelationType,
  initialStrength,
  onSelect,
  onMutationFeedback,
}: CreateLinkCardProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [state, formAction, isPending] = useActionState(
    createLinkAction,
    linkFormState
  );
  const [sourceConceptId, setSourceConceptId] = useState(
    initialSourceConceptId ?? conceptCatalog[0]?.id ?? ""
  );
  const [targetConceptId, setTargetConceptId] = useState(
    initialTargetConceptId ??
      conceptCatalog.find((concept) => concept.id !== sourceConceptId)?.id ??
      ""
  );
  const [relationType, setRelationType] = useState<
    (typeof relationTypeOptions)[number]
  >(initialRelationType ?? "causes");
  const [strength, setStrength] = useState(String(initialStrength ?? 3));

  useEffect(() => {
    if (state.status !== "success" || !state.payload) {
      return;
    }

    onSelect({ kind: "link", id: state.payload.linkId });
    onMutationFeedback({
      kind: "link",
      id: state.payload.linkId,
      eventId: state.payload.eventId,
      message: messages.inspector.linkCreatedFeedback,
    });
  }, [
    messages.inspector.linkCreatedFeedback,
    onMutationFeedback,
    onSelect,
    state.payload,
    state.status,
  ]);

  if (conceptCatalogLoading) {
    return <LoadingCard locale={locale} />;
  }

  if (conceptCatalogError) {
    return <ErrorCard locale={locale} message={conceptCatalogError} />;
  }

  if (conceptCatalog.length < 2) {
    return (
      <EmptyState
        title={messages.inspector.atLeastTwoConceptsTitle}
        description={messages.inspector.atLeastTwoConceptsDescription}
      />
    );
  }

  return (
    <Card className="panel-card">
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <Flex direction="column" gap="3">
          <Heading size="4">{messages.inspector.createLink}</Heading>
          <InlineFormField
            label={messages.inspector.sourceConceptLabel}
            error={state.fieldErrors?.sourceConceptId?.[0]}
            association="labelledby"
          >
            {({ triggerProps }) => (
              <Select.Root
                name="sourceConceptId"
                value={sourceConceptId}
                onValueChange={(value) => {
                  setSourceConceptId(value);
                  if (value === targetConceptId) {
                    const nextTarget = conceptCatalog.find(
                      (concept) => concept.id !== value
                    );
                    setTargetConceptId(nextTarget?.id ?? "");
                  }
                }}
              >
                <Select.Trigger {...triggerProps} />
                <Select.Content>
                  {conceptCatalog.map((concept) => (
                    <Select.Item key={concept.id} value={concept.id}>
                      {concept.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          </InlineFormField>
          <InlineFormField
            label={messages.inspector.targetConceptLabel}
            error={state.fieldErrors?.targetConceptId?.[0]}
            association="labelledby"
          >
            {({ triggerProps }) => (
              <Select.Root
                name="targetConceptId"
                value={targetConceptId}
                onValueChange={setTargetConceptId}
              >
                <Select.Trigger {...triggerProps} />
                <Select.Content>
                  {conceptCatalog
                    .filter((concept) => concept.id !== sourceConceptId)
                    .map((concept) => (
                      <Select.Item key={concept.id} value={concept.id}>
                        {concept.title}
                      </Select.Item>
                    ))}
                </Select.Content>
              </Select.Root>
            )}
          </InlineFormField>
          <Flex gap="3" wrap="wrap">
            <InlineFormField
              label={messages.inspector.relationTypeLabel}
              error={state.fieldErrors?.relationType?.[0]}
              association="labelledby"
            >
              {({ triggerProps }) => (
                <Select.Root
                  name="relationType"
                  value={relationType}
                  onValueChange={(value) =>
                    setRelationType(
                      value as (typeof relationTypeOptions)[number]
                    )
                  }
                >
                  <Select.Trigger {...triggerProps} />
                  <Select.Content>
                    {relationTypeOptions.map((option) => (
                      <Select.Item key={option} value={option}>
                        {messages.labels.relationTypes[option]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            </InlineFormField>
            <InlineFormField
              label={messages.inspector.strengthLabel}
              error={state.fieldErrors?.strength?.[0]}
              association="labelledby"
            >
              {({ triggerProps }) => (
                <Select.Root
                  name="strength"
                  value={strength}
                  onValueChange={setStrength}
                >
                  <Select.Trigger {...triggerProps} />
                  <Select.Content>
                    {strengthOptions.map((value) => (
                      <Select.Item key={value} value={String(value)}>
                        {String(value)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            </InlineFormField>
          </Flex>
          <InlineFormField
            label={messages.inspector.descriptionLabel}
            error={state.fieldErrors?.description?.[0]}
          >
            {({ controlProps }) => (
              <TextArea
                {...controlProps}
                name="description"
                placeholder={messages.inspector.linkDescriptionPlaceholder}
                rows={3}
              />
            )}
          </InlineFormField>
          {state.status === "error" && state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" size="2" loading={isPending}>
            {messages.inspector.createLinkCta}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

type LinkInspectorCardProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  conceptCatalog: ConceptCatalogEntry[];
  conceptCatalogLoading: boolean;
  conceptCatalogError: string | null;
  payload: InspectorLinkPayload;
  onSelect: (selection: InspectorSelection) => void;
  onMutationFeedback: (feedback: InspectorMutationFeedback) => void;
};

function LinkInspectorCard({
  locale,
  workspaceSlug,
  mapId,
  conceptCatalog,
  conceptCatalogLoading,
  conceptCatalogError,
  payload,
  onSelect,
  onMutationFeedback,
}: LinkInspectorCardProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [state, formAction, isPending] = useActionState(
    updateLinkAction,
    linkFormState
  );
  const [sourceConceptId, setSourceConceptId] = useState(
    payload.link.sourceConceptId
  );
  const [targetConceptId, setTargetConceptId] = useState(
    payload.link.targetConceptId
  );
  const [relationType, setRelationType] = useState(payload.link.relationType);
  const [strength, setStrength] = useState(String(payload.link.strength));
  const catalogById = useMemo(
    () => new Map(conceptCatalog.map((concept) => [concept.id, concept.title])),
    [conceptCatalog]
  );

  useEffect(() => {
    if (state.status !== "success" || !state.payload) {
      return;
    }

    onMutationFeedback({
      kind: "link",
      id: state.payload.linkId,
      eventId: state.payload.eventId,
      message: messages.inspector.linkUpdatedFeedback,
    });
  }, [
    messages.inspector.linkUpdatedFeedback,
    onMutationFeedback,
    state.payload,
    state.status,
  ]);

  if (conceptCatalogLoading) {
    return <LoadingCard locale={locale} />;
  }

  if (conceptCatalogError) {
    return <ErrorCard locale={locale} message={conceptCatalogError} />;
  }

  const sourceTitle =
    catalogById.get(sourceConceptId) ?? messages.inspector.unknownConcept;
  const targetTitle =
    catalogById.get(targetConceptId) ?? messages.inspector.unknownConcept;

  return (
    <Card className="panel-card">
      <Flex direction="column" gap="3">
        <Flex align="start" justify="between" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">{messages.inspector.linkTitle}</Heading>
            <Flex gap="2" wrap="wrap">
              <StatusBadge
                status={payload.link.relationType}
                label={messages.labels.relationTypes[payload.link.relationType]}
              />
              <Badge color="orange" variant="surface">
                {messages.inspector.strengthValue(payload.link.strength)}
              </Badge>
            </Flex>
          </Flex>
          <ConfirmDialog
            triggerLabel={messages.inspector.linkDelete}
            triggerButtonProps={{ size: "2", variant: "soft", color: "gray" }}
            title={messages.inspector.deleteLinkConfirmTitle}
            description={messages.inspector.deleteLinkConfirmDescription}
            confirmLabel={messages.inspector.linkDelete}
            cancelLabel={messages.inspector.cancel}
            action={deleteLinkAction}
          >
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={mapId} />
            <input type="hidden" name="linkId" value={payload.link.id} />
          </ConfirmDialog>
        </Flex>

        <Card variant="surface" className="panel-surface-card">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              {messages.inspector.currentDirection}
            </Text>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onSelect({ kind: "concept", id: payload.link.sourceConceptId })
              }
            >
              {sourceTitle}
            </Button>
            <Text size="2" color="gray">
              {messages.labels.relationTypes[payload.link.relationType]}
            </Text>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onSelect({ kind: "concept", id: payload.link.targetConceptId })
              }
            >
              {targetTitle}
            </Button>
          </Flex>
        </Card>

        <form action={formAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="mapId" value={mapId} />
          <input type="hidden" name="linkId" value={payload.link.id} />
          <Flex direction="column" gap="3">
            <InlineFormField
              label={messages.inspector.sourceConceptLabel}
              error={state.fieldErrors?.sourceConceptId?.[0]}
              association="labelledby"
            >
              {({ triggerProps }) => (
                <Select.Root
                  name="sourceConceptId"
                  value={sourceConceptId}
                  onValueChange={(value) => {
                    setSourceConceptId(value);
                    if (value === targetConceptId) {
                      const nextTarget = conceptCatalog.find(
                        (concept) => concept.id !== value
                      );
                      setTargetConceptId(nextTarget?.id ?? "");
                    }
                  }}
                >
                  <Select.Trigger {...triggerProps} />
                  <Select.Content>
                    {conceptCatalog.map((concept) => (
                      <Select.Item key={concept.id} value={concept.id}>
                        {concept.title}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            </InlineFormField>
            <InlineFormField
              label={messages.inspector.targetConceptLabel}
              error={state.fieldErrors?.targetConceptId?.[0]}
              association="labelledby"
            >
              {({ triggerProps }) => (
                <Select.Root
                  name="targetConceptId"
                  value={targetConceptId}
                  onValueChange={setTargetConceptId}
                >
                  <Select.Trigger {...triggerProps} />
                  <Select.Content>
                    {conceptCatalog
                      .filter((concept) => concept.id !== sourceConceptId)
                      .map((concept) => (
                        <Select.Item key={concept.id} value={concept.id}>
                          {concept.title}
                        </Select.Item>
                      ))}
                  </Select.Content>
                </Select.Root>
              )}
            </InlineFormField>
            <Flex gap="3" wrap="wrap">
              <InlineFormField
                label={messages.inspector.relationTypeLabel}
                error={state.fieldErrors?.relationType?.[0]}
                association="labelledby"
              >
                {({ triggerProps }) => (
                  <Select.Root
                    name="relationType"
                    value={relationType}
                    onValueChange={(value) =>
                      setRelationType(
                        value as (typeof relationTypeOptions)[number]
                      )
                    }
                  >
                    <Select.Trigger {...triggerProps} />
                    <Select.Content>
                      {relationTypeOptions.map((option) => (
                        <Select.Item key={option} value={option}>
                          {messages.labels.relationTypes[option]}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </InlineFormField>
              <InlineFormField
                label={messages.inspector.strengthLabel}
                error={state.fieldErrors?.strength?.[0]}
                association="labelledby"
              >
                {({ triggerProps }) => (
                  <Select.Root
                    name="strength"
                    value={strength}
                    onValueChange={setStrength}
                  >
                    <Select.Trigger {...triggerProps} />
                    <Select.Content>
                      {strengthOptions.map((value) => (
                        <Select.Item key={value} value={String(value)}>
                          {String(value)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </InlineFormField>
            </Flex>
            <InlineFormField
              label={messages.inspector.descriptionLabel}
              error={state.fieldErrors?.description?.[0]}
            >
              {({ controlProps }) => (
                <TextArea
                  {...controlProps}
                  name="description"
                  defaultValue={payload.link.description ?? ""}
                  rows={3}
                />
              )}
            </InlineFormField>
            {state.status === "error" && state.message ? (
              <Text color="red" size="2">
                {state.message}
              </Text>
            ) : null}
            {state.status === "success" ? (
              <Text color="green" size="2">
                {messages.inspector.linkUpdatedFeedback}
              </Text>
            ) : null}
            <Button type="submit" size="2" loading={isPending}>
              {messages.inspector.saveLink}
            </Button>
          </Flex>
        </form>

        <Separator size="4" />

        <InspectorProvenanceSection
          locale={locale}
          workspaceSlug={workspaceSlug}
          provenance={payload.provenance}
        />
      </Flex>
    </Card>
  );
}

type MapSettingsCardProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  workspaceRole: WorkspaceRole;
  map: MapDetail;
};

function MapSettingsCard({
  locale,
  workspaceSlug,
  workspaceRole,
  map,
}: MapSettingsCardProps) {
  const messages = getMapWorkspaceMessages(locale);
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
          <Heading size="4">{messages.inspector.mapSettings}</Heading>
          <Flex gap="3" wrap="wrap">
            <div className="panel-field-half">
              <InlineFormField
                label={messages.inspector.titleLabel}
                error={state.fieldErrors?.title?.[0]}
              >
                {({ controlProps }) => (
                  <TextField.Root
                    {...controlProps}
                    name="title"
                    defaultValue={map.title}
                    size="2"
                  />
                )}
              </InlineFormField>
            </div>
            <div className="panel-field-half">
              <InlineFormField
                label={messages.inspector.subjectLabel}
                error={state.fieldErrors?.subjectLabel?.[0]}
              >
                {({ controlProps }) => (
                  <TextField.Root
                    {...controlProps}
                    name="subjectLabel"
                    defaultValue={map.subjectLabel}
                    size="2"
                  />
                )}
              </InlineFormField>
            </div>
          </Flex>
          <InlineFormField
            label={messages.inspector.descriptionLabel}
            error={state.fieldErrors?.description?.[0]}
          >
            {({ controlProps }) => (
              <TextArea
                {...controlProps}
                name="description"
                defaultValue={map.description ?? ""}
                rows={3}
              />
            )}
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="2">
              {state.message}
            </Text>
          ) : null}
          <Button type="submit" size="2" loading={isPending}>
            {messages.inspector.saveMap}
          </Button>
        </Flex>
      </form>
      {workspaceRole !== "member" ? (
        <>
          <Separator size="4" my="4" />
          <ConfirmDialog
            triggerLabel={messages.inspector.archiveMap}
            triggerButtonProps={{ size: "2", variant: "soft", color: "gray" }}
            title={messages.inspector.archiveMapConfirmTitle}
            description={messages.inspector.archiveMapConfirmDescription}
            confirmLabel={messages.inspector.archiveMap}
            cancelLabel={messages.inspector.cancel}
            action={archiveMapAction}
          >
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={map.id} />
          </ConfirmDialog>
        </>
      ) : null}
    </Card>
  );
}

type LinkListProps = {
  locale: SupportedLocale;
  label: string;
  links: InspectorConceptPayload["incoming"];
  onSelect: (selection: InspectorSelection) => void;
};

function LinkList({ locale, label, links, onSelect }: LinkListProps) {
  const messages = getMapWorkspaceMessages(locale);
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
        ? links.map((link) => (
            <Card
              key={`${label}-${link.id}`}
              variant="surface"
              className="panel-surface-card"
            >
              <Flex align="center" justify="between" gap="3" wrap="wrap">
                <Flex direction="column" gap="1">
                  <Text weight="medium">{link.relatedConceptTitle}</Text>
                  <Text color="gray" size="2">
                    {messages.labels.relationTypes[link.relationType]} |{" "}
                    {messages.inspector.strengthValue(link.strength)}
                  </Text>
                </Flex>
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => onSelect({ kind: "link", id: link.id })}
                >
                  {messages.inspector.openLink}
                </Button>
              </Flex>
            </Card>
          ))
        : null}
    </Flex>
  );
}

function LoadingCard({ locale }: { locale: SupportedLocale }) {
  const message =
    locale === "uk"
      ? "Завантажуємо деталі..."
      : locale === "ru"
        ? "Загружаем детали..."
        : "Loading details...";
  return (
    <Card className="panel-card">
      <Text size="2" color="gray">
        {message}
      </Text>
    </Card>
  );
}

function ErrorCard({
  locale,
  message,
}: {
  locale: SupportedLocale;
  message: string;
}) {
  const title =
    locale === "uk"
      ? "Не вдалося завантажити цю поверхню."
      : locale === "ru"
        ? "Не удалось загрузить эту поверхность."
        : "Unable to load this panel.";
  return (
    <Card className="panel-card">
      <Flex direction="column" gap="2">
        <Heading size="3">{title}</Heading>
        <Text size="2" color="gray">
          {message}
        </Text>
      </Flex>
    </Card>
  );
}
