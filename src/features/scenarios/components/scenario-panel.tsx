"use client";

import { useActionState, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextArea,
  TextField,
  Tabs,
} from "@radix-ui/themes";

import {
  createScenarioAction,
  runScenarioAction,
  submitScenarioRunFeedbackAction,
  submitScenarioStepFeedbackAction,
} from "@/features/scenarios/actions";
import type {
  MapDetail,
  ScenarioRunSummary,
  ScenarioSummary,
} from "@/features/maps/types";
import { getIntlLocale, type SupportedLocale } from "@/shared/i18n/config";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import { StatusBadge } from "@/shared/ui/components/status-badge";
import type { ActionState } from "@/shared/validation/action-state";

const initialScenarioState: ActionState<
  "title" | "situation" | "seedConceptIds"
> = { status: "idle" };
const initialRunFeedbackState: ActionState<
  "overallScore" | "verdict" | "feedbackText"
> = { status: "idle" };
const initialStepFeedbackState: ActionState<
  "verdict" | "correctedExplanation" | "correctedScore"
> = { status: "idle" };

type ScenarioPanelProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  map: MapDetail;
  conceptCatalog?: Array<{ id: string; title: string }>;
  conceptCatalogLoading?: boolean;
  conceptCatalogError?: string | null;
  scenarios: ScenarioSummary[];
  runs: ScenarioRunSummary[];
};

type ScenarioSecondaryTab = "save" | "saved" | "runs";

export function ScenarioPanel({
  locale,
  workspaceSlug,
  map,
  conceptCatalog: preloadedCatalog,
  conceptCatalogLoading: preloadedLoading,
  conceptCatalogError: preloadedError,
  scenarios,
  runs,
}: ScenarioPanelProps) {
  const messages = getMapWorkspaceMessages(locale);
  const intlLocale = getIntlLocale(locale);
  const conceptCatalog = preloadedCatalog ?? [];
  const conceptCatalogLoading = preloadedLoading ?? false;
  const conceptCatalogError = preloadedError ?? null;
  const [state, formAction, isPending] = useActionState(
    createScenarioAction,
    initialScenarioState
  );
  const [draftSeeds, setDraftSeeds] = useState<string[]>([]);
  const [triggerText, setTriggerText] = useState("");
  const [secondaryTab, setSecondaryTab] = useState<ScenarioSecondaryTab>(() =>
    scenarios.length > 0 ? "saved" : "save"
  );
  const [reviewingRunId, setReviewingRunId] = useState<string | null>(null);

  const latestRun = runs[0] ?? null;
  const canRunScenario =
    conceptCatalog.length > 0 && triggerText.trim().length >= 3;
  const openRunReview = (runId: string) => {
    setSecondaryTab("runs");
    setReviewingRunId(runId);
  };

  const toggleSeed = (conceptId: string) => {
    setDraftSeeds((current) =>
      current.includes(conceptId)
        ? current.filter((value) => value !== conceptId)
        : [...current, conceptId]
    );
  };

  return (
    <Flex
      direction="column"
      gap="4"
    >
      <Card className="panel-card">
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">{messages.scenario.runTitle}</Heading>
            <Text color="gray" size="2">
              {messages.scenario.runDescription}
            </Text>
          </Flex>
          <form action={runScenarioAction}>
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="mapId" value={map.id} />
            {draftSeeds.map((seedId) => (
              <input
                key={`ad-hoc-run-${seedId}`}
                type="hidden"
                name="seedConceptIds"
                value={seedId}
              />
            ))}
            <Flex direction="column" gap="3">
              <InlineFormField label={messages.scenario.situationLabel}>
                <TextArea
                  name="triggerText"
                  placeholder={messages.scenario.situationPlaceholder}
                  value={triggerText}
                  onChange={(event) => setTriggerText(event.target.value)}
                  rows={3}
                />
              </InlineFormField>
              <SeedConceptPicker
                locale={locale}
                concepts={conceptCatalog}
                isLoading={conceptCatalogLoading}
                error={conceptCatalogError}
                selectedIds={draftSeeds}
                onToggle={toggleSeed}
              />
              <Button type="submit" size="2" disabled={!canRunScenario}>
                {messages.scenario.runCta}
              </Button>
            </Flex>
          </form>

          {latestRun ? (
            <Card variant="surface" className="panel-surface-card">
              <Flex direction="column" gap="2">
                <Flex align="start" justify="between" gap="3">
                  <Flex direction="column" gap="1">
                    <Text weight="medium">{messages.scenario.latestRun}</Text>
                    <Text size="2" color="gray">
                      {latestRun.scenario?.title ?? latestRun.triggerText}
                    </Text>
                  </Flex>
                  <StatusBadge
                    status={latestRun.status}
                    label={messages.labels.scenarioStatuses[latestRun.status]}
                  />
                </Flex>
                <Text size="2">
                  {latestRun.summary ?? messages.scenario.noSummaryYet}
                </Text>
                <Flex gap="2" wrap="wrap">
                  {latestRun.steps.slice(0, 2).map((step) => (
                    <Badge key={step.id} color="gray" variant="surface">
                      {step.stepOrder}. {step.conceptTitle}
                    </Badge>
                  ))}
                </Flex>
                <Button
                  type="button"
                  size="2"
                  variant="soft"
                  onClick={() => openRunReview(latestRun.id)}
                >
                  {messages.scenario.openRecentRuns}
                </Button>
              </Flex>
            </Card>
          ) : null}
        </Flex>
      </Card>

      <Tabs.Root value={secondaryTab} onValueChange={(value) => setSecondaryTab(value as ScenarioSecondaryTab)}>
        <Tabs.List size="2">
          <Tabs.Trigger value="save">{messages.scenario.saveTab}</Tabs.Trigger>
          <Tabs.Trigger value="saved">{messages.scenario.savedTab}</Tabs.Trigger>
          <Tabs.Trigger value="runs">{messages.scenario.runsTab}</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <Flex direction="column" gap="3" mt="2">
        {secondaryTab === "save" ? (
          <Card className="panel-card">
            <form action={formAction}>
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="mapId" value={map.id} />
              {draftSeeds.map((seedId) => (
                <input
                  key={`draft-scenario-${seedId}`}
                  type="hidden"
                  name="seedConceptIds"
                  value={seedId}
                />
              ))}
              <Flex direction="column" gap="3">
                <Heading size="4">{messages.scenario.saveTitle}</Heading>
                <InlineFormField
                  label={messages.inspector.titleLabel}
                  error={state.fieldErrors?.title?.[0]}
                >
                  <TextField.Root
                    name="title"
                    placeholder={messages.scenario.saveTitlePlaceholder}
                    size="2"
                  />
                </InlineFormField>
                <InlineFormField
                  label={messages.scenario.situationLabel}
                  error={state.fieldErrors?.situation?.[0]}
                >
                  <TextArea
                    name="situation"
                    placeholder={messages.scenario.saveSituationPlaceholder}
                    defaultValue={triggerText}
                    rows={3}
                  />
                </InlineFormField>
                {state.message ? (
                  <Text color="red" size="2">
                    {state.message}
                  </Text>
                ) : null}
                <Button type="submit" size="2" loading={isPending}>
                  {messages.scenario.saveCta}
                </Button>
              </Flex>
            </form>
          </Card>
        ) : null}

        {secondaryTab === "saved" ? (
          scenarios.length === 0 ? (
            <EmptyState
              title={messages.scenario.noScenariosTitle}
              description={messages.scenario.noScenariosDescription}
            />
          ) : (
            <Flex direction="column" gap="3">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} className="panel-card">
                  <Flex direction="column" gap="3">
                    <Flex align="start" justify="between" gap="3">
                      <Flex direction="column" gap="1">
                        <Heading size="3">{scenario.title}</Heading>
                        <Text color="gray" size="2">
                          {scenario.situation}
                        </Text>
                      </Flex>
                      <Badge color="blue" radius="full" variant="soft">
                        {messages.scenario.savedSeeds(
                          scenario.seedConcepts.length
                        )}
                      </Badge>
                    </Flex>
                    <Flex gap="2" wrap="wrap">
                      {scenario.seedConcepts.map((seed) => (
                        <Badge
                          key={`${scenario.id}-${seed.id}`}
                          color="gray"
                          variant="surface"
                        >
                          {seed.title}
                        </Badge>
                      ))}
                    </Flex>
                    <form action={runScenarioAction}>
                      <input
                        type="hidden"
                        name="workspaceSlug"
                        value={workspaceSlug}
                      />
                      <input type="hidden" name="mapId" value={map.id} />
                      <input
                        type="hidden"
                        name="scenarioId"
                        value={scenario.id}
                      />
                      <input
                        type="hidden"
                        name="triggerText"
                        value={scenario.situation}
                      />
                      {scenario.seedConcepts.map((seed) => (
                        <input
                          key={`${scenario.id}-run-${seed.id}`}
                          type="hidden"
                          name="seedConceptIds"
                          value={seed.id}
                        />
                      ))}
                      <Button type="submit" size="2" variant="soft">
                        {messages.scenario.runSavedScenario}
                      </Button>
                    </form>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )
        ) : null}

        {secondaryTab === "runs" ? (
          runs.length === 0 ? (
            <EmptyState
              title={messages.scenario.noRunsTitle}
              description={messages.scenario.noRunsDescription}
            />
          ) : (
            <Flex direction="column" gap="3">
              {runs.map((run) => {
                const isReviewing = reviewingRunId === run.id;
                return (
                  <Card key={run.id} className="panel-card">
                    <Flex direction="column" gap="3">
                      <Flex align="start" justify="between" gap="3">
                        <Flex direction="column" gap="1">
                          <Heading size="3">
                            {run.scenario?.title ?? run.triggerText}
                          </Heading>
                          <Text color="gray" size="2">
                            {run.summary ?? messages.scenario.noSummaryYet}
                          </Text>
                          <Text color="gray" size="1">
                            {run.starter.fullName ?? run.starter.email} |{" "}
                            {new Date(run.createdAt).toLocaleString(intlLocale)}
                          </Text>
                        </Flex>
                        <StatusBadge
                          status={run.status}
                          label={messages.labels.scenarioStatuses[run.status]}
                        />
                      </Flex>
                      <Flex gap="2" wrap="wrap">
                        {run.steps.slice(0, 2).map((step) => (
                          <Badge key={`${run.id}-${step.id}`} color="gray" variant="surface">
                            {step.stepOrder}. {step.conceptTitle}
                          </Badge>
                        ))}
                      </Flex>
                      <Button
                        type="button"
                        size="2"
                        variant={isReviewing ? "solid" : "soft"}
                        onClick={() =>
                          setReviewingRunId((current) =>
                            current === run.id ? null : run.id
                          )
                        }
                      >
                        {isReviewing
                          ? messages.scenario.hideReviewCta
                          : messages.scenario.reviewRunCta}
                      </Button>
                      {isReviewing ? (
                        <>
                          <Flex direction="column" gap="2">
                            {run.steps.map((step) => (
                              <Flex
                                key={step.id}
                                direction="column"
                                gap="1"
                                className="scenario-step"
                              >
                                <Flex align="center" gap="2" wrap="wrap">
                                  <Badge color="blue" radius="full" variant="soft">
                                    {messages.scenario.step(step.stepOrder)}
                                  </Badge>
                                  <Text weight="medium">{step.conceptTitle}</Text>
                                  <Badge color="gray" variant="surface">
                                    {messages.labels.effectTypes[step.effectType] ??
                                      step.effectType.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge color="orange" variant="surface">
                                    {messages.scenario.score(step.score)}
                                  </Badge>
                                </Flex>
                                {step.viaLinkRelationType ? (
                                  <Text color="gray" size="2">
                                    {messages.scenario.viaLink}:{" "}
                                    {
                                      messages.labels.relationTypes[
                                        step.viaLinkRelationType
                                      ]
                                    }
                                  </Text>
                                ) : null}
                                <Text size="2">{step.explanation}</Text>
                                <StepFeedbackForm
                                  locale={locale}
                                  workspaceSlug={workspaceSlug}
                                  mapId={map.id}
                                  run={run}
                                  step={step}
                                />
                              </Flex>
                            ))}
                          </Flex>
                          <RunFeedbackForm
                            locale={locale}
                            workspaceSlug={workspaceSlug}
                            mapId={map.id}
                            run={run}
                          />
                        </>
                      ) : null}
                    </Flex>
                  </Card>
                );
              })}
            </Flex>
          )
        ) : null}
      </Flex>
    </Flex>
  );
}

type RunFeedbackFormProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  run: ScenarioRunSummary;
};

function RunFeedbackForm({
  locale,
  workspaceSlug,
  mapId,
  run,
}: RunFeedbackFormProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [state, formAction, isPending] = useActionState(
    submitScenarioRunFeedbackAction,
    initialRunFeedbackState
  );

  return (
    <Card
      variant="surface"
      className="panel-surface-card sl-scenario-feedback-block"
    >
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <input type="hidden" name="scenarioRunId" value={run.id} />
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            {messages.scenario.runFeedbackTitle}
          </Text>
          <Flex gap="2" wrap="wrap">
            <div className="panel-field-half">
              <InlineFormField
                label={messages.scenario.runFeedbackVerdictLabel}
                error={state.fieldErrors?.verdict?.[0]}
              >
                <select
                  name="verdict"
                  defaultValue={run.feedback?.verdict ?? "partly_useful"}
                  className="sl-scenario-feedback-select"
                >
                  <option value="useful">
                    {messages.scenario.runFeedbackVerdictUseful}
                  </option>
                  <option value="partly_useful">
                    {messages.scenario.runFeedbackVerdictPartlyUseful}
                  </option>
                  <option value="wrong">
                    {messages.scenario.runFeedbackVerdictWrong}
                  </option>
                </select>
              </InlineFormField>
            </div>
            <div className="panel-field-half">
              <InlineFormField
                label={messages.scenario.runFeedbackScoreLabel}
                error={state.fieldErrors?.overallScore?.[0]}
              >
                <TextField.Root
                  type="number"
                  name="overallScore"
                  min={1}
                  max={5}
                  defaultValue={String(run.feedback?.overallScore ?? 3)}
                  size="2"
                />
              </InlineFormField>
            </div>
          </Flex>
          <InlineFormField
            label={messages.scenario.runFeedbackCommentLabel}
            error={state.fieldErrors?.feedbackText?.[0]}
          >
            <TextArea
              name="feedbackText"
              rows={2}
              placeholder={messages.scenario.runFeedbackCommentPlaceholder}
              defaultValue={run.feedback?.feedbackText ?? ""}
            />
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="1">
              {state.message}
            </Text>
          ) : null}
          <Button
            type="submit"
            size="1"
            loading={isPending}
            className="sl-scenario-feedback-submit"
          >
            {messages.scenario.saveFeedbackCta}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

type StepFeedbackFormProps = {
  locale: SupportedLocale;
  workspaceSlug: string;
  mapId: string;
  run: ScenarioRunSummary;
  step: ScenarioRunSummary["steps"][number];
};

function StepFeedbackForm({
  locale,
  workspaceSlug,
  mapId,
  run,
  step,
}: StepFeedbackFormProps) {
  const messages = getMapWorkspaceMessages(locale);
  const [state, formAction, isPending] = useActionState(
    submitScenarioStepFeedbackAction,
    initialStepFeedbackState
  );

  return (
    <Card
      variant="surface"
      className="panel-surface-card sl-scenario-step-feedback"
    >
      <form action={formAction}>
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="mapId" value={mapId} />
        <input type="hidden" name="scenarioRunId" value={run.id} />
        <input type="hidden" name="scenarioRunStepId" value={step.id} />
        <Flex direction="column" gap="2">
          <InlineFormField
            label={messages.scenario.stepFeedbackVerdictLabel}
            error={state.fieldErrors?.verdict?.[0]}
          >
            <select
              name="verdict"
              defaultValue={step.feedback?.verdict ?? "correct"}
              className="sl-scenario-feedback-select"
            >
              <option value="correct">
                {messages.scenario.stepFeedbackVerdictCorrect}
              </option>
              <option value="overstated">
                {messages.scenario.stepFeedbackVerdictOverstated}
              </option>
              <option value="wrong_link">
                {messages.scenario.stepFeedbackVerdictWrongLink}
              </option>
              <option value="missing_context">
                {messages.scenario.stepFeedbackVerdictMissingContext}
              </option>
              <option value="wrong_effect">
                {messages.scenario.stepFeedbackVerdictWrongEffect}
              </option>
            </select>
          </InlineFormField>
          <Flex gap="2" wrap="wrap">
            <div className="panel-field-half">
              <InlineFormField
                label={messages.scenario.stepFeedbackCorrectedScoreLabel}
                error={state.fieldErrors?.correctedScore?.[0]}
              >
                <TextField.Root
                  type="number"
                  name="correctedScore"
                  min={1}
                  max={100}
                  defaultValue={step.feedback?.correctedScore?.toString() ?? ""}
                  placeholder={String(step.score)}
                  size="1"
                />
              </InlineFormField>
            </div>
          </Flex>
          <InlineFormField
            label={messages.scenario.stepFeedbackCorrectedExplanationLabel}
            error={state.fieldErrors?.correctedExplanation?.[0]}
          >
            <TextArea
              name="correctedExplanation"
              rows={2}
              placeholder={
                messages.scenario.stepFeedbackCorrectedExplanationPlaceholder
              }
              defaultValue={step.feedback?.correctedExplanation ?? ""}
            />
          </InlineFormField>
          {state.message ? (
            <Text color="red" size="1">
              {state.message}
            </Text>
          ) : null}
          <Button
            type="submit"
            size="1"
            variant="soft"
            loading={isPending}
            className="sl-scenario-feedback-submit"
          >
            {messages.scenario.saveStepFeedbackCta}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

type SeedConceptPickerProps = {
  locale: SupportedLocale;
  concepts: Array<{ id: string; title: string }>;
  isLoading: boolean;
  error: string | null;
  selectedIds: string[];
  onToggle: (conceptId: string) => void;
};

function SeedConceptPicker({
  locale,
  concepts,
  isLoading,
  error,
  selectedIds,
  onToggle,
}: SeedConceptPickerProps) {
  const messages = getMapWorkspaceMessages(locale);

  if (isLoading) {
    return (
      <Text color="gray" size="2">
        {locale === "uk"
          ? "Завантажуємо Концепти..."
          : locale === "ru"
            ? "Загружаем Концепты..."
            : "Loading Concepts..."}
      </Text>
    );
  }

  if (error) {
    return (
      <Text color="red" size="2">
        {error}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium">
        {messages.scenario.seedConceptsLabel}
      </Text>
      {concepts.length === 0 ? (
        <Text color="gray" size="2">
          {messages.scenario.seedConceptsEmpty}
        </Text>
      ) : (
        <Flex gap="2" wrap="wrap">
          {concepts.map((concept) => {
            const selected = selectedIds.includes(concept.id);
            return (
              <Button
                key={concept.id}
                type="button"
                size="2"
                variant={selected ? "solid" : "surface"}
                color={selected ? "blue" : "gray"}
                onClick={() => onToggle(concept.id)}
              >
                {concept.title}
              </Button>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}
