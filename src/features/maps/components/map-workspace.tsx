"use client";

import { type ReactNode, useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  Cross2Icon,
  LightningBoltIcon,
  Link2Icon,
  PlusIcon,
  ReaderIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Button,
  Flex,
  Heading,
  IconButton,
  Select,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import type {
  InspectorMutationFeedback,
  InspectorSelection,
} from "@/features/inspector/types";
import dynamic from "next/dynamic";

const GraphCanvasRuntime = dynamic(
  () =>
    import("@/features/map-runtime/components/graph-canvas-runtime").then(
      (mod) => mod.GraphCanvasRuntime
    ),
  { ssr: false }
);
import { MapStoreProvider, useMapStore } from "@/features/map-runtime/store/map-store-provider";
import { useConceptCatalog } from "@/features/map-runtime/hooks/use-concept-catalog";
import {
  deriveLodThresholds,
  deriveZoomBounds,
  type CanvasZoomState,
} from "@/features/map-runtime/renderers/zoom-policy";
import {
  canEditMapGraph,
  canManageMapMetadata,
} from "@/shared/auth/policies";
import { useCoreLoopTelemetry } from "@/features/maps/hooks/use-core-loop-telemetry";
import {
  buildLinkDraftDefaults,
  deriveGuidedOnboardingStep,
  type CanvasInteractionMode,
} from "@/features/maps/workspace-state";
import type { MapWorkspaceProps } from "@/features/maps/types";
import { ScenarioPanel } from "@/features/scenarios/components/scenario-panel";
import { LearningPanel } from "@/features/learning/components/learning-panel";
import { workspaceMapPath, workspaceMapsPath } from "@/shared/config/routes";
import {
  getMapWorkspaceMessages,
  type MapWorkspaceMessages,
} from "@/shared/i18n/messages/map-workspace";

type PanelTab = "inspector" | "scenario" | "learning";
type MapWorkspaceViewProps = MapWorkspaceProps & {
  initialPanelTab?: PanelTab;
  initialInspectorSelection?: InspectorSelection | null;
};

type MapWorkspaceSignal = {
  title: string;
  description: string;
  stateLabel: string | null;
};

export function MapWorkspace(props: MapWorkspaceViewProps) {
  return (
    <MapStoreProvider
      key={props.map.id}
      mapId={props.map.id}
      initialSnapshot={props.initialSnapshot}
    >
      <MapWorkspaceContent {...props} />
    </MapStoreProvider>
  );
}

function MapWorkspaceContent({
  locale,
  workspaceSlug,
  workspaceRole,
  map,
  availableMaps,
  graphMetrics,
  scenarios,
  runs,
  learningSuggestions,
  initialPanelTab,
  initialInspectorSelection,
}: MapWorkspaceViewProps) {
  const router = useRouter();
  const messages = getMapWorkspaceMessages(locale);
  const learningMessages = messages.learning;
  const canEditGraph = canEditMapGraph(workspaceRole);
  const canManageMapMetadataAccess = canManageMapMetadata(workspaceRole);
  const isMobileViewport = useIsMobileViewport();
  const [panelTab, setPanelTab] = useState<PanelTab>(
    () => initialPanelTab ?? "inspector"
  );
  const [mutationFeedback, setMutationFeedback] =
    useState<InspectorMutationFeedback | null>(null);
  const selection = useMapStore((state) => state.selection);
  const snapshot = useMapStore((state) => state.snapshot);
  const ghostConcepts = useMapStore((state) => state.ghosts);
  const setSelection = useMapStore((state) => state.setSelection);
  const interactionMode = useMapStore((state) => state.interactionMode);
  const setInteractionMode = useMapStore((state) => state.setInteractionMode);
  const connectLinkSourceId = useMapStore((state) => state.connectLinkSourceId);
  const setConnectLinkSourceId = useMapStore(
    (state) => state.setConnectLinkSourceId
  );
  const isGravityEnabled = useMapStore((state) => state.isGravityEnabled);
  const toggleGravity = useMapStore((state) => state.toggleGravity);
  const [zoomState, setZoomState] = useState<CanvasZoomState>(() => {
    const { minRatio, maxRatio } = deriveZoomBounds(1);
    const { dotEnterRatio, dotExitRatio } = deriveLodThresholds(
      minRatio,
      maxRatio
    );

    return {
      ratio: 1,
      minRatio,
      maxRatio,
      dotEnterRatio,
      dotExitRatio,
    };
  });
  const [panelOpen, setPanelOpen] = useState(
    () =>
      initialPanelTab !== undefined ||
      initialInspectorSelection != null ||
      (graphMetrics.conceptCount === 0 &&
        graphMetrics.linkCount === 0 &&
        runs.length === 0)
  );
  const {
    catalog: conceptCatalog,
    isLoading: isConceptCatalogLoading,
    error: conceptCatalogError,
  } = useConceptCatalog(map.id);

  const liveGraphMetrics = useMemo(
    () => ({
      revision: snapshot?.revision ?? graphMetrics.revision,
      conceptCount: snapshot?.counts.conceptCount ?? graphMetrics.conceptCount,
      linkCount: snapshot?.counts.linkCount ?? graphMetrics.linkCount,
    }),
    [graphMetrics, snapshot]
  );
  const currentGraphRevision = liveGraphMetrics.revision;

  const liveConceptCatalog = useMemo(() => {
    const titleById = new Map<string, string>();

    for (const concept of conceptCatalog) {
      titleById.set(concept.id, concept.title);
    }

    for (const concept of snapshot?.concepts ?? []) {
      titleById.set(concept.id, concept.title);
    }

    return Array.from(titleById, ([id, title]) => ({
      id,
      title,
    })).sort((left, right) => left.title.localeCompare(right.title));
  }, [conceptCatalog, snapshot]);
  const liveConceptCatalogLoading = isConceptCatalogLoading && !snapshot;
  const liveConceptCatalogError = snapshot ? null : conceptCatalogError;

  const conceptTitleById = useMemo(() => {
    const titles = new Map<string, string>();

    for (const concept of liveConceptCatalog) {
      titles.set(concept.id, concept.title);
    }

    for (const concept of ghostConcepts) {
      titles.set(concept.id, concept.title);
    }

    return titles;
  }, [ghostConcepts, liveConceptCatalog]);

  useEffect(() => {
    if (!initialInspectorSelection) {
      return;
    }

    setSelection(initialInspectorSelection);
  }, [initialInspectorSelection, setSelection]);

  const guidedStep = deriveGuidedOnboardingStep({
    conceptCount: liveGraphMetrics.conceptCount,
    linkCount: liveGraphMetrics.linkCount,
    scenarioRunCount: runs.length,
  });
  const guidedCopy = messages.guided[guidedStep];

  useCoreLoopTelemetry({
    mapId: map.id,
    guidedStep,
    conceptCount: liveGraphMetrics.conceptCount,
    linkCount: liveGraphMetrics.linkCount,
  });

  const linkingSourceConceptTitle = connectLinkSourceId
    ? conceptTitleById.get(connectLinkSourceId) ?? null
    : null;
  const isInspectorPanelOpen = panelOpen && panelTab === "inspector";
  const isScenarioPanelOpen = panelOpen && panelTab === "scenario";
  const isLearningPanelOpen = panelOpen && panelTab === "learning";
  const handleZoomStateChange = useCallback((nextState: CanvasZoomState) => {
    if (!Number.isFinite(nextState.ratio)) {
      return;
    }

    setZoomState((prevState) => {
      const sameRatio = Math.abs(prevState.ratio - nextState.ratio) < 0.01;
      const sameMin = Math.abs(prevState.minRatio - nextState.minRatio) < 0.0001;
      const sameMax = Math.abs(prevState.maxRatio - nextState.maxRatio) < 0.0001;
      const sameEnter =
        Math.abs(prevState.dotEnterRatio - nextState.dotEnterRatio) < 0.0001;
      const sameExit =
        Math.abs(prevState.dotExitRatio - nextState.dotExitRatio) < 0.0001;

      return sameRatio && sameMin && sameMax && sameEnter && sameExit
        ? prevState
        : nextState;
    });
  }, []);

  const isInteractionGuidanceActive =
    panelTab === "inspector" && interactionMode !== "inspect";
  const dialogOpen = panelOpen || isInteractionGuidanceActive;

  const handlePanelOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isInteractionGuidanceActive) {
        return;
      }

      setPanelOpen(nextOpen);
    },
    [isInteractionGuidanceActive]
  );

  const openInspectorPanel = () => {
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const openScenarioPanel = () => {
    setPanelTab("scenario");
    setInteractionMode("inspect");
    setSelection({ kind: "none" });
    setConnectLinkSourceId(null);
    setPanelOpen(true);
  };

  const openLearningPanel = () => {
    setPanelTab("learning");
    setInteractionMode("inspect");
    setSelection({ kind: "none" });
    setConnectLinkSourceId(null);
    setPanelOpen(true);
  };

  const openMapSettings = () => {
    if (!canManageMapMetadataAccess) {
      return;
    }

    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "map-settings" });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const beginPlaceConcept = () => {
    if (!canEditGraph) {
      return;
    }

    setInteractionMode("placeConcept");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setPanelOpen(false);
  };

  const beginConnectLink = () => {
    if (!canEditGraph) {
      return;
    }

    if (liveGraphMetrics.conceptCount < 2) {
      setInteractionMode("inspect");
      setConnectLinkSourceId(null);
      setSelection({ kind: "create-link" });
      setPanelTab("inspector");
      setPanelOpen(true);
      return;
    }

    setInteractionMode("connectLink");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const openConceptInspector = (conceptId: string) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "concept", id: conceptId });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const openLinkInspector = (linkId: string) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "link", id: linkId });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const openCreateConceptAt = (x: number, y: number) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "create-concept", x, y });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const openCreateLinkDraft = (
    sourceConceptId: string,
    targetConceptId: string
  ) => {
    const defaults = buildLinkDraftDefaults();
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({
      kind: "create-link",
      sourceConceptId,
      targetConceptId,
      relationType: defaults.relationType,
      strength: defaults.strength,
    });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const cancelInteraction = () => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
  };

  const clearCanvasSelection = () => {
    cancelInteraction();
    setSelection({ kind: "none" });
    if (panelTab === "inspector") {
      setPanelOpen(false);
    }
  };

  const renderPanelContent = () => {
    if (panelTab === "inspector") {
      return (
        <InspectorPanel
          locale={locale}
          workspaceSlug={workspaceSlug}
          workspaceRole={workspaceRole}
          canEditGraph={canEditGraph}
          canManageMapMetadata={canManageMapMetadataAccess}
          map={map}
          graphRevision={currentGraphRevision}
          conceptCount={liveGraphMetrics.conceptCount}
          conceptCatalog={liveConceptCatalog}
          conceptCatalogError={liveConceptCatalogError}
          conceptCatalogLoading={liveConceptCatalogLoading}
          selection={selection}
          guidedStep={guidedStep}
          interactionMode={interactionMode}
          linkingSourceConceptTitle={linkingSourceConceptTitle}
          onSelect={setSelection}
          onMutationFeedback={setMutationFeedback}
          onStartCreateConcept={beginPlaceConcept}
          onStartCreateLink={beginConnectLink}
          onOpenScenario={openScenarioPanel}
          onCancelInteraction={cancelInteraction}
        />
      );
    }

    if (panelTab === "scenario") {
      return (
        <ScenarioPanel
          locale={locale}
          workspaceSlug={workspaceSlug}
          workspaceRole={workspaceRole}
          map={map}
          conceptCatalog={liveConceptCatalog}
          conceptCatalogError={liveConceptCatalogError}
          conceptCatalogLoading={liveConceptCatalogLoading}
          scenarios={scenarios}
          runs={runs}
        />
      );
    }

    return (
      <LearningPanel
        locale={locale}
        workspaceSlug={workspaceSlug}
        workspaceRole={workspaceRole}
        mapId={map.id}
        suggestions={learningSuggestions}
      />
    );
  };

  const dialogDescription =
    panelTab === "inspector"
      ? messages.scenario.mobileInspectorDescription
      : panelTab === "scenario"
      ? messages.scenario.mobileScenarioDescription
      : learningMessages.mobileDescription;
  const panelTitleId = useId();
  const panelDescriptionId = useId();
  const activePanelLabel =
    dialogOpen && panelTab === "scenario"
      ? messages.topBar.scenario
      : dialogOpen && panelTab === "learning"
      ? learningMessages.tabLabel
      : null;
  const workspaceSignal = deriveMapWorkspaceSignal({
    messages,
    learningLabel: learningMessages.tabLabel,
    selection,
    interactionMode,
    linkingSourceConceptTitle,
    guidedTitle: guidedCopy.title,
    guidedDescription: guidedCopy.description,
    panelTab,
    panelOpen: dialogOpen,
    conceptTitleById,
  });

  return (
    <div
      className="map-screen"
      data-surface-mode="canvas"
      data-panel-open={dialogOpen ? "true" : "false"}
      data-panel-tab={dialogOpen ? panelTab : "none"}
      data-selection-kind={selection.kind}
      data-interaction-mode={interactionMode}
      data-has-selection={selection.kind !== "none" ? "true" : "false"}
    >
      <div className="page-stack map-screen-stack">
        <div className="map-canvas-layer">
          <GraphCanvasRuntime
            locale={locale}
            map={map}
            graphMetrics={liveGraphMetrics}
            canEditGraph={canEditGraph}
            selection={selection}
            interactionMode={interactionMode}
            connectLinkSourceId={connectLinkSourceId}
            mutationFeedback={mutationFeedback}
            onClearSelection={clearCanvasSelection}
            onOpenCreateConcept={openCreateConceptAt}
            onOpenConceptInspector={openConceptInspector}
            onOpenLinkInspector={openLinkInspector}
            onPickConnectSource={(conceptId) => {
              setConnectLinkSourceId(conceptId);
              setSelection({ kind: "none" });
              setPanelTab("inspector");
            }}
            onCompleteConnectLink={openCreateLinkDraft}
            onZoomStateChange={handleZoomStateChange}
          />
        </div>

        {interactionMode !== "inspect" && !dialogOpen && (
          <div className="canvas-guidance-banner">
            <Flex align="center" gap="3">
              <Text size="2" weight="medium">
                {interactionMode === "placeConcept"
                  ? messages.canvas.placeConceptTitle
                  : messages.canvas.createLinkSourceTitle}
              </Text>
              <Button
                type="button"
                size="1"
                variant="soft"
                onClick={cancelInteraction}
              >
                {messages.inspector.cancel}
              </Button>
            </Flex>
          </div>
        )}

        <div className="map-overlay-layer">
          <div className="map-overlay-top">
            <MapTopStrip
              messages={messages}
              mapId={map.id}
              availableMaps={availableMaps}
              focusTitle={workspaceSignal.title}
              focusDescription={workspaceSignal.description}
              stateLabel={workspaceSignal.stateLabel}
              activePanelLabel={activePanelLabel}
              stepBadgeLabel={
                guidedStep === "done"
                  ? messages.mapReadyBadge
                  : messages.stepLabel(guidedCopy.stepNumber, guidedCopy.totalSteps)
              }
              stepBadgeReady={guidedStep === "done"}
              subjectLabel={map.subjectLabel}
              interactionMode={interactionMode}
              linkingSourceConceptTitle={linkingSourceConceptTitle}
              onCancelInteraction={cancelInteraction}
              onSelectMap={(value) =>
                router.push(workspaceMapPath(workspaceSlug, value))
              }
            />
          </div>

          <div className="map-overlay-bottom">
            <MapBottomDock
              messages={messages}
              mapTitle={map.title}
              mapsPath={workspaceMapsPath(workspaceSlug)}
              zoomState={zoomState}
              interactionMode={interactionMode}
              selectionKind={selection.kind}
              inspectorOpen={isInspectorPanelOpen}
              scenarioOpen={isScenarioPanelOpen}
              learningOpen={isLearningPanelOpen}
              learningLabel={learningMessages.tabLabel}
              canEditGraph={canEditGraph}
              onOpenInspector={openInspectorPanel}
              onOpenScenario={openScenarioPanel}
              onOpenLearning={openLearningPanel}
              onStartCreateConcept={beginPlaceConcept}
              onStartCreateLink={beginConnectLink}
              isGravityEnabled={isGravityEnabled}
              onToggleGravity={toggleGravity}
            />
          </div>
        </div>

        <div className="map-dialog-container">
          {dialogOpen ? (
            <section
              role="dialog"
              aria-modal="false"
              aria-labelledby={panelTitleId}
              aria-describedby={panelDescriptionId}
              className={isMobileViewport ? "map-mobile-dialog" : "map-overlay-dialog"}
              data-panel-tab={panelTab}
              data-panel-dominant="true"
              data-mobile={isMobileViewport ? "true" : "false"}
            >
              <div className="map-dialog-shell">
                <Flex
                  align="start"
                  justify="between"
                  gap="3"
                  className="map-dialog-header"
                >
                  <div className="map-dialog-heading">
                    <Heading
                      as="h2"
                      size="3"
                      mb="1"
                      className="map-dialog-title"
                      id={panelTitleId}
                    >
                      {map.title}
                    </Heading>
                    <Text
                      as="p"
                      size="2"
                      className="map-dialog-description"
                      id={panelDescriptionId}
                    >
                      {dialogDescription}
                    </Text>
                  </div>

                  <Flex
                    align="center"
                    gap="2"
                    wrap="wrap"
                    justify="end"
                    className="map-dialog-header-actions"
                  >
      {panelTab === "inspector" && canManageMapMetadataAccess ? (
                      <Button
                        type="button"
                        size="1"
                        variant={
                          selection.kind === "map-settings" ? "solid" : "surface"
                        }
                        color={selection.kind === "map-settings" ? "gray" : "gray"}
                        onClick={openMapSettings}
                      >
                        {messages.topBar.mapSettings}
                      </Button>
                    ) : null}

                    <IconButton
                      type="button"
                      size="1"
                      radius="full"
                      variant="surface"
                      color="gray"
                      className="map-dialog-close"
                      aria-label={messages.inspector.cancel}
                      onClick={() => handlePanelOpenChange(false)}
                    >
                      <Cross2Icon />
                    </IconButton>
                  </Flex>
                </Flex>

                <Flex gap="2" className="map-dialog-tabs" wrap="wrap">
                  <Button
                    type="button"
                    size="2"
                    variant={panelTab === "inspector" ? "solid" : "surface"}
                    onClick={openInspectorPanel}
                  >
                    {messages.topBar.inspector}
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant={panelTab === "scenario" ? "solid" : "surface"}
                    onClick={openScenarioPanel}
                  >
                    {messages.topBar.scenario}
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant={panelTab === "learning" ? "solid" : "surface"}
                    onClick={openLearningPanel}
                  >
                    {learningMessages.tabLabel}
                  </Button>
                </Flex>

                <div className="map-dialog-body">
                  <div className="panel-content">{renderPanelContent()}</div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function deriveMapWorkspaceSignal({
  messages,
  learningLabel,
  selection,
  interactionMode,
  linkingSourceConceptTitle,
  guidedTitle,
  guidedDescription,
  panelTab,
  panelOpen,
  conceptTitleById,
}: {
  messages: MapWorkspaceMessages;
  learningLabel: string;
  selection: InspectorSelection;
  interactionMode: CanvasInteractionMode;
  linkingSourceConceptTitle: string | null;
  guidedTitle: string;
  guidedDescription: string;
  panelTab: PanelTab;
  panelOpen: boolean;
  conceptTitleById: Map<string, string>;
}): MapWorkspaceSignal {
  if (selection.kind === "concept") {
    return {
      title: conceptTitleById.get(selection.id) ?? messages.topBar.inspector,
      description: messages.scenario.mobileInspectorDescription,
      stateLabel: null,
    };
  }

  if (selection.kind === "link") {
    return {
      title: messages.inspector.linkTitle,
      description: messages.scenario.mobileInspectorDescription,
      stateLabel: messages.inspector.linkTitle,
    };
  }

  if (selection.kind === "map-settings") {
    return {
      title: messages.topBar.mapSettings,
      description: messages.scenario.mobileInspectorDescription,
      stateLabel: messages.topBar.mapSettings,
    };
  }

  if (selection.kind === "create-concept") {
    return {
      title: messages.inspector.placeConceptTitle,
      description: messages.inspector.placeConceptDescription,
      stateLabel: messages.topBar.newConcept,
    };
  }

  if (selection.kind === "create-link") {
    return {
      title: messages.topBar.createLink,
      description: selection.sourceConceptId
        ? messages.inspector.connectLinkTargetDescription
        : messages.inspector.connectLinkSourceDescription,
      stateLabel: messages.topBar.createLink,
    };
  }

  if (interactionMode === "placeConcept") {
    return {
      title: messages.canvas.placeConceptTitle,
      description: messages.canvas.placeConceptDescription,
      stateLabel: messages.topBar.newConcept,
    };
  }

  if (interactionMode === "connectLink") {
    return linkingSourceConceptTitle
      ? {
          title: messages.canvas.createLinkTargetTitle(linkingSourceConceptTitle),
          description: messages.canvas.createLinkTargetDescription,
          stateLabel: messages.topBar.createLink,
        }
      : {
          title: messages.canvas.createLinkSourceTitle,
          description: messages.canvas.createLinkSourceDescription,
          stateLabel: messages.topBar.createLink,
        };
  }

  if (panelOpen && panelTab === "scenario") {
    return {
      title: messages.scenario.runTitle,
      description: messages.scenario.runDescription,
      stateLabel: null,
    };
  }

  if (panelOpen && panelTab === "learning") {
    return {
      title: learningLabel,
      description: messages.learning.mobileDescription,
      stateLabel: null,
    };
  }

  return {
    title: guidedTitle,
    description: guidedDescription,
    stateLabel: null,
  };
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  return isMobile;
}

type MapIconActionProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  mobileHint?: string;
  children: ReactNode;
};

function MapIconAction({
  label,
  active = false,
  onClick,
  tooltipSide = "top",
  mobileHint,
  children,
}: MapIconActionProps) {
  return (
    <div className="map-icon-action-shell">
      <Tooltip content={label} side={tooltipSide}>
        <IconButton
          type="button"
          size="2"
          radius="full"
          variant={active ? "solid" : "surface"}
          color={active ? "gray" : "gray"}
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={active ? "map-icon-action is-active" : "map-icon-action"}
        >
          {children}
        </IconButton>
      </Tooltip>
      {mobileHint ? (
        <Text as="span" size="1" className="map-icon-action-hint">
          {mobileHint}
        </Text>
      ) : null}
    </div>
  );
}

type MapTopStripProps = {
  messages: MapWorkspaceMessages;
  mapId: string;
  availableMaps: MapWorkspaceProps["availableMaps"];
  focusTitle: string;
  focusDescription: string;
  stateLabel: string | null;
  activePanelLabel: string | null;
  stepBadgeLabel: string;
  stepBadgeReady: boolean;
  subjectLabel: string;
  interactionMode: CanvasInteractionMode;
  linkingSourceConceptTitle: string | null;
  onCancelInteraction: () => void;
  onSelectMap: (mapId: string) => void;
};

function MapTopStrip({
  messages,
  mapId,
  availableMaps,
  focusTitle,
  focusDescription,
  stateLabel,
  activePanelLabel,
  stepBadgeLabel,
  stepBadgeReady,
  subjectLabel,
  interactionMode,
  linkingSourceConceptTitle,
  onCancelInteraction,
  onSelectMap,
}: MapTopStripProps) {
  return (
    <div className="map-top-strip">
      <div className="map-top-strip-primary">
        <MapModeIndicator
          messages={messages}
          interactionMode={interactionMode}
          linkingSourceConceptTitle={linkingSourceConceptTitle}
          onCancelInteraction={onCancelInteraction}
        />

        <div className="map-top-strip-copy">
          <Text as="p" size="4" weight="medium" className="map-top-strip-title">
            {focusTitle}
          </Text>
          <Text as="p" size="2" className="map-top-strip-description">
            {focusDescription}
          </Text>
        </div>
      </div>

      <div className="map-top-strip-side">
        <Flex
          align="center"
          gap="2"
          wrap="wrap"
          justify="end"
          className="map-top-strip-badges"
        >
          {stateLabel ? (
            <Badge color="gray" radius="full" variant="surface">
              {stateLabel}
            </Badge>
          ) : null}
          {activePanelLabel ? (
            <Badge color="gray" radius="full" variant="surface">
              {activePanelLabel}
            </Badge>
          ) : null}
          <Badge
            color={stepBadgeReady ? "green" : "gray"}
            radius="full"
            variant={stepBadgeReady ? "soft" : "surface"}
          >
            {stepBadgeLabel}
          </Badge>
          <Badge color="gray" radius="full" variant="surface">
            {subjectLabel}
          </Badge>
        </Flex>

        <div className="map-top-strip-switcher">
          <div className="map-inline-select">
            <Select.Root size="1" value={mapId} onValueChange={onSelectMap}>
              <Select.Trigger />
              <Select.Content>
                {availableMaps.map((candidate) => (
                  <Select.Item key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

type MapScaleRulerProps = {
  zoomState: CanvasZoomState;
};

function MapScaleRuler({ zoomState }: MapScaleRulerProps) {
  const safeMinRatio = Math.max(zoomState.minRatio, 0.0001);
  const safeMaxRatio = Math.max(zoomState.maxRatio, safeMinRatio + 0.0001);
  const safeRatio = Math.min(Math.max(zoomState.ratio, safeMinRatio), safeMaxRatio);
  const minLog = Math.log(safeMinRatio);
  const maxLog = Math.log(safeMaxRatio);
  const logRange = Math.max(maxLog - minLog, 0.0001);
  const thumbPositionPercent = ((Math.log(safeRatio) - minLog) / logRange) * 100;
  const zoomPercent = Math.round((1 / safeRatio) * 100);

  return (
    <div className="map-scale-ruler" aria-hidden="true">
      <div className="map-scale-ruler-track">
        <span className="map-scale-ruler-tick is-start" />
        <span className="map-scale-ruler-tick is-mid" />
        <span className="map-scale-ruler-tick is-end" />
        <span
          className="map-scale-ruler-thumb"
          style={{ left: `${thumbPositionPercent}%` }}
        />
      </div>
      <Text size="1" color="gray" className="map-scale-ruler-value">
        {zoomPercent}%
      </Text>
    </div>
  );
}

type MapModeIndicatorProps = {
  messages: MapWorkspaceMessages;
  interactionMode: CanvasInteractionMode;
  linkingSourceConceptTitle: string | null;
  onCancelInteraction: () => void;
};

function MapModeIndicator({
  messages,
  interactionMode,
  linkingSourceConceptTitle,
  onCancelInteraction,
}: MapModeIndicatorProps) {
  const label =
    interactionMode === "placeConcept"
      ? messages.canvas.placeConceptBadge
      : interactionMode === "connectLink"
        ? messages.canvas.createLinkBadge
        : messages.topBar.inspector;

  return (
    <Flex gap="2" wrap="wrap" align="center" className="map-mode-indicator">
      <Badge radius="full" variant="surface" color="gray" className="map-mode-indicator-badge">
        <span className="map-mode-indicator-icon" aria-hidden="true">
          {interactionMode === "placeConcept" ? (
            <PlusIcon />
          ) : interactionMode === "connectLink" ? (
            <Link2Icon />
          ) : (
            <ReaderIcon />
          )}
        </span>
        {label}
      </Badge>

      {interactionMode === "connectLink" && linkingSourceConceptTitle ? (
        <Badge color="gray" radius="full" variant="surface" className="map-mode-context">
          {linkingSourceConceptTitle}
        </Badge>
      ) : null}

      {interactionMode !== "inspect" ? (
        <Button
          type="button"
          size="1"
          variant="ghost"
          color="gray"
          onClick={onCancelInteraction}
          className="map-mode-cancel"
        >
          {messages.inspector.cancel}
        </Button>
      ) : null}
    </Flex>
  );
}

type MapBottomDockProps = {
  messages: MapWorkspaceMessages;
  mapTitle: string;
  mapsPath: string;
  zoomState: CanvasZoomState;
  interactionMode: CanvasInteractionMode;
  selectionKind: InspectorSelection["kind"];
  inspectorOpen: boolean;
  scenarioOpen: boolean;
  learningOpen: boolean;
  learningLabel: string;
  canEditGraph: boolean;
  onOpenInspector: () => void;
  onOpenScenario: () => void;
  onOpenLearning: () => void;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
  isGravityEnabled: boolean;
  onToggleGravity: () => void;
};

function MapBottomDock({
  messages,
  mapTitle,
  mapsPath,
  zoomState,
  interactionMode,
  selectionKind,
  inspectorOpen,
  scenarioOpen,
  learningOpen,
  learningLabel,
  canEditGraph,
  onOpenInspector,
  onOpenScenario,
  onOpenLearning,
  onStartCreateConcept,
  onStartCreateLink,
  isGravityEnabled,
  onToggleGravity,
}: MapBottomDockProps) {
  return (
    <div className="map-bottom-dock">
      <div className="map-bottom-dock-side is-left">
        <div className="map-bottom-dock-group is-meta">
          <div className="map-bottom-map-context">
            <Button
              asChild
              size="1"
              variant="surface"
              color="gray"
              className="map-bottom-map-back-link"
            >
              <Link href={mapsPath}>
                <ChevronLeftIcon />
                {messages.topBar.backToMaps}
              </Link>
            </Button>

            <Text
              as="p"
              size="2"
              weight="medium"
              className="map-bottom-map-title"
              title={mapTitle}
            >
              {mapTitle}
            </Text>
          </div>
        </div>
      </div>

      <div className="map-bottom-dock-center">
        <div className="map-bottom-dock-group">
          <MapIconAction
            label={isGravityEnabled ? "Stop Semantic Gravity" : "Start Semantic Gravity"}
            active={isGravityEnabled}
            onClick={onToggleGravity}
            mobileHint="Gravity"
          >
            <LightningBoltIcon />
          </MapIconAction>
          <MapIconAction
            label={messages.topBar.runScenario}
            active={scenarioOpen}
            onClick={onOpenScenario}
            mobileHint={messages.topBar.scenario}
          >
            <RocketIcon />
          </MapIconAction>
          <MapIconAction
            label={learningLabel}
            active={learningOpen}
            onClick={onOpenLearning}
            mobileHint={learningLabel}
          >
            <LightningBoltIcon />
          </MapIconAction>
        </div>

        <div className="map-bottom-dock-group is-clustered">
          {canEditGraph ? (
            <>
              <MapIconAction
                label={messages.topBar.createLink}
                active={
                  interactionMode === "connectLink" ||
                  selectionKind === "create-link"
                }
                onClick={onStartCreateLink}
                mobileHint={messages.topBar.createLink}
              >
                <Link2Icon />
              </MapIconAction>
              <MapIconAction
                label={messages.topBar.newConcept}
                active={
                  interactionMode === "placeConcept" ||
                  selectionKind === "create-concept"
                }
                onClick={onStartCreateConcept}
                mobileHint={messages.topBar.newConcept}
              >
                <PlusIcon />
              </MapIconAction>
            </>
          ) : null}
        </div>

        <div className="map-bottom-dock-group">
          <MapIconAction
            label={messages.topBar.inspector}
            active={inspectorOpen}
            onClick={onOpenInspector}
            mobileHint={messages.topBar.inspector}
          >
            <ReaderIcon />
          </MapIconAction>
        </div>
      </div>

      <div className="map-bottom-dock-side is-right">
        <MapScaleRuler zoomState={zoomState} />
      </div>
    </div>
  );
}

