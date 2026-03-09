"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";

import {
  createScenarioAction,
  runScenarioAction,
} from "@/features/scenarios/actions";
import type {
  ConceptSummary,
  LinkSummary,
  MapDetail,
  ScenarioRunSummary,
  ScenarioSummary,
} from "@/features/maps/types";
import { EmptyState } from "@/shared/ui/components/empty-state";
import { InlineFormField } from "@/shared/ui/components/inline-form-field";
import { StatusBadge } from "@/shared/ui/components/status-badge";
import type { ActionState } from "@/shared/validation/action-state";

const initialScenarioState: ActionState<
  "title" | "situation" | "seedConceptIds"
> = {
  status: "idle",
};

type ScenarioPanelProps = {
  workspaceSlug: string;
  map: MapDetail;
  concepts: ConceptSummary[];
  links: LinkSummary[];
  scenarios: ScenarioSummary[];
  runs: ScenarioRunSummary[];
};

type ScenarioSecondaryTab = "save" | "saved" | "runs";

export function ScenarioPanel({
  workspaceSlug,
  map,
  concepts,
  links,
  scenarios,
  runs,
}: ScenarioPanelProps) {
  const [state, formAction, isPending] = useActionState(
    createScenarioAction,
    initialScenarioState
  );
  const [draftSeeds, setDraftSeeds] = useState<string[]>([]);
  const [triggerText, setTriggerText] = useState("");
  const [secondaryTab, setSecondaryTab] = useState<ScenarioSecondaryTab>(() =>
    runs.length > 0 ? "runs" : scenarios.length > 0 ? "saved" : "save"
  );

  const conceptLookup = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts]
  );
  const linkLookup = useMemo(
    () => new Map(links.map((link) => [link.id, link])),
    [links]
  );
  const latestRun = runs[0] ?? null;
  const canRunScenario = concepts.length > 0 && triggerText.trim().length >= 3;

  const toggleSeed = (conceptId: string) => {
    setDraftSeeds((current) =>
      current.includes(conceptId)
        ? current.filter((value) => value !== conceptId)
        : [...current, conceptId]
    );
  };

  return (
    <Flex direction="column" gap="3" height="100%">
      <Card className="panel-card">
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Heading size="4">Run scenario</Heading>
            <Text color="gray" size="2">
              Test one situation against the map and inspect the ordered
              explanation path.
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
              <InlineFormField label="Situation">
                <TextArea
                  name="triggerText"
                  placeholder="A colleague questions the person's competence in a public meeting."
                  value={triggerText}
                  onChange={(event) => setTriggerText(event.target.value)}
                  rows={3}
                />
              </InlineFormField>
              <SeedConceptPicker
                concepts={concepts}
                selectedIds={draftSeeds}
                onToggle={toggleSeed}
              />
              <Button type="submit" size="2" disabled={!canRunScenario}>
                Run scenario
              </Button>
            </Flex>
          </form>

          {latestRun ? (
            <Card variant="surface" className="panel-surface-card">
              <Flex direction="column" gap="2">
                <Flex align="start" justify="between" gap="3">
                  <Flex direction="column" gap="1">
                    <Text weight="medium">Latest run</Text>
                    <Text size="2" color="gray">
                      {latestRun.scenario?.title ?? latestRun.triggerText}
                    </Text>
                  </Flex>
                  <StatusBadge status={latestRun.status} />
                </Flex>
                <Text size="2">{latestRun.summary ?? "No summary yet."}</Text>
                <Flex gap="2" wrap="wrap">
                  {latestRun.steps.slice(0, 2).map((step) => {
                    const concept = conceptLookup.get(step.conceptId);
                    return (
                      <Badge key={step.id} color="gray" variant="surface">
                        {step.stepOrder}. {concept?.title ?? "Unknown Concept"}
                      </Badge>
                    );
                  })}
                </Flex>
                <Button
                  type="button"
                  size="2"
                  variant="soft"
                  onClick={() => setSecondaryTab("runs")}
                >
                  Open recent runs
                </Button>
              </Flex>
            </Card>
          ) : null}
        </Flex>
      </Card>

      <Flex gap="2" wrap="wrap">
        <Button
          type="button"
          size="1"
          variant={secondaryTab === "save" ? "solid" : "surface"}
          onClick={() => setSecondaryTab("save")}
        >
          Save scenario
        </Button>
        <Button
          type="button"
          size="1"
          variant={secondaryTab === "saved" ? "solid" : "surface"}
          onClick={() => setSecondaryTab("saved")}
        >
          Saved scenarios
        </Button>
        <Button
          type="button"
          size="1"
          variant={secondaryTab === "runs" ? "solid" : "surface"}
          onClick={() => setSecondaryTab("runs")}
        >
          Recent runs
        </Button>
      </Flex>

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
              <Heading size="4">Save current scenario</Heading>
              <InlineFormField
                label="Title"
                error={state.fieldErrors?.title?.[0]}
              >
                <TextField.Root
                  name="title"
                  placeholder="Public disagreement"
                  size="2"
                />
              </InlineFormField>
              <InlineFormField
                label="Situation"
                error={state.fieldErrors?.situation?.[0]}
              >
                <TextArea
                  name="situation"
                  placeholder="Describe the situation you want to test against the map."
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
                Save scenario
              </Button>
            </Flex>
          </form>
        </Card>
      ) : null}

      {secondaryTab === "saved" ? (
        scenarios.length === 0 ? (
          <EmptyState
            title="No scenarios yet"
            description="Save a scenario once you find a situation worth re-running against the map."
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
                      {scenario.seedConceptIds.length} seeds
                    </Badge>
                  </Flex>
                  <Flex gap="2" wrap="wrap">
                    {scenario.seedConceptIds.map((seedId) => {
                      const concept = conceptLookup.get(seedId);
                      return concept ? (
                        <Badge
                          key={`${scenario.id}-${seedId}`}
                          color="gray"
                          variant="surface"
                        >
                          {concept.title}
                        </Badge>
                      ) : null;
                    })}
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
                    {scenario.seedConceptIds.map((seedId) => (
                      <input
                        key={`${scenario.id}-run-${seedId}`}
                        type="hidden"
                        name="seedConceptIds"
                        value={seedId}
                      />
                    ))}
                    <Button type="submit" size="2" variant="soft">
                      Run saved scenario
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
            title="No scenario runs yet"
            description="Run a situation to see which Concepts activate, which Links carry the logic, and what sequence becomes plausible."
          />
        ) : (
          <Flex direction="column" gap="3">
            {runs.map((run) => (
              <Card key={run.id} className="panel-card">
                <Flex direction="column" gap="3">
                  <Flex align="start" justify="between" gap="3">
                    <Flex direction="column" gap="1">
                      <Heading size="3">
                        {run.scenario?.title ?? run.triggerText}
                      </Heading>
                      <Text color="gray" size="2">
                        {run.summary ?? "No summary yet."}
                      </Text>
                      <Text color="gray" size="1">
                        {run.starter.fullName ?? run.starter.email} |{" "}
                        {run.createdAt.toLocaleString()}
                      </Text>
                    </Flex>
                    <StatusBadge status={run.status} />
                  </Flex>
                  <Flex direction="column" gap="2">
                    {run.steps.map((step) => {
                      const concept = conceptLookup.get(step.conceptId);
                      const link = step.viaLinkId
                        ? linkLookup.get(step.viaLinkId)
                        : null;

                      return (
                        <Flex
                          key={step.id}
                          direction="column"
                          gap="1"
                          className="scenario-step"
                        >
                          <Flex align="center" gap="2" wrap="wrap">
                            <Badge color="blue" radius="full" variant="soft">
                              Step {step.stepOrder}
                            </Badge>
                            <Text weight="medium">
                              {concept?.title ?? "Unknown Concept"}
                            </Text>
                            <Badge color="gray" variant="surface">
                              {step.effectType.replace(/_/g, " ")}
                            </Badge>
                            <Badge color="orange" variant="surface">
                              score {step.score}
                            </Badge>
                          </Flex>
                          {link ? (
                            <Text color="gray" size="2">
                              Via Link: {link.relationType.replace(/_/g, " ")}
                            </Text>
                          ) : null}
                          <Text size="2">{step.explanation}</Text>
                        </Flex>
                      );
                    })}
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )
      ) : null}
    </Flex>
  );
}

type SeedConceptPickerProps = {
  concepts: ConceptSummary[];
  selectedIds: string[];
  onToggle: (conceptId: string) => void;
};

function SeedConceptPicker({
  concepts,
  selectedIds,
  onToggle,
}: SeedConceptPickerProps) {
  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium">
        Seed Concepts
      </Text>
      {concepts.length === 0 ? (
        <Text color="gray" size="2">
          Add Concepts to the canvas before selecting scenario seeds.
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
