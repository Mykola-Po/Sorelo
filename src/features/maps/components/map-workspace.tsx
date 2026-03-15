"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
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
  Dialog,
  Flex,
  IconButton,
  Select,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";

import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import type { InspectorSelection } from "@/features/inspector/types";
import dynamic from "next/dynamic";

const GraphCanvasRuntime = dynamic(
  () =>
    import("@/features/map-runtime/components/graph-canvas-runtime").then(
      (mod) => mod.GraphCanvasRuntime
    ),
  { ssr: false }
);
import { MapStoreProvider } from "@/features/map-runtime/store/map-store-provider";
import { useConceptCatalog } from "@/features/map-runtime/hooks/use-concept-catalog";
import {
  deriveLodThresholds,
  deriveZoomBounds,
  type CanvasZoomState,
} from "@/features/map-runtime/renderers/zoom-policy";
import {
  buildLinkDraftDefaults,
  deriveGuidedOnboardingStep,
  type CanvasInteractionMode,
} from "@/features/maps/workspace-state";
import type { MapWorkspaceProps } from "@/features/maps/types";
import { ScenarioPanel } from "@/features/scenarios/components/scenario-panel";
import { LearningPanel } from "@/features/learning/components/learning-panel";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  getMapWorkspaceMessages,
  type MapWorkspaceMessages,
} from "@/shared/i18n/messages/map-workspace";

type PanelTab = "inspector" | "scenario" | "learning";

export function MapWorkspace({
  locale,
  workspaceSlug,
  workspaceRole,
  map,
  availableMaps,
  graphMetrics,
  scenarios,
  runs,
  learningSuggestions,
}: MapWorkspaceProps) {
  const router = useRouter();
  const messages = getMapWorkspaceMessages(locale);
  const learningMessages = messages.learning;
  const isMobileViewport = useIsMobileViewport();
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(
    null
  );
  const [panelTab, setPanelTab] = useState<PanelTab>("inspector");
  const [selection, setSelection] = useState<InspectorSelection>({ kind: "none" });
  const [interactionMode, setInteractionMode] =
    useState<CanvasInteractionMode>("inspect");
  const [connectLinkSourceId, setConnectLinkSourceId] = useState<string | null>(
    null
  );
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
  const [panelOpen, setPanelOpen] = useState(false);
  const {
    catalog: conceptCatalog,
    isLoading: isConceptCatalogLoading,
    error: conceptCatalogError,
  } = useConceptCatalog(map.id);

  const conceptCatalogById = useMemo(
    () => new Map(conceptCatalog.map((concept) => [concept.id, concept])),
    [conceptCatalog]
  );

  const guidedStep = deriveGuidedOnboardingStep({
    conceptCount: graphMetrics.conceptCount,
    linkCount: graphMetrics.linkCount,
    scenarioRunCount: runs.length,
  });
  const guidedCopy = messages.guided[guidedStep];
  const linkingSourceConceptTitle = connectLinkSourceId
    ? conceptCatalogById.get(connectLinkSourceId)?.title ?? null
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

  const openInspectorPanel = () => {
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const openScenarioPanel = () => {
    setPanelTab("scenario");
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setPanelOpen(true);
  };

  const openLearningPanel = () => {
    setPanelTab("learning");
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setPanelOpen(true);
  };

  const openMapSettings = () => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "map-settings" });
    setPanelTab("inspector");
    setPanelOpen(true);
  };

  const beginPlaceConcept = () => {
    setInteractionMode("placeConcept");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setPanelOpen(false);
  };

  const beginConnectLink = () => {
    if (graphMetrics.conceptCount < 2) {
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
    setPanelOpen(false);
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
    setPanelOpen(false);
  };

  const renderPanelContent = () => {
    if (panelTab === "inspector") {
      return (
        <InspectorPanel
          locale={locale}
          workspaceSlug={workspaceSlug}
          workspaceRole={workspaceRole}
          map={map}
          conceptCount={graphMetrics.conceptCount}
          conceptCatalog={conceptCatalog}
          conceptCatalogError={conceptCatalogError}
          conceptCatalogLoading={isConceptCatalogLoading}
          selection={selection}
          guidedStep={guidedStep}
          interactionMode={interactionMode}
          linkingSourceConceptTitle={linkingSourceConceptTitle}
          onSelect={setSelection}
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
          map={map}
          conceptCatalog={conceptCatalog}
          conceptCatalogError={conceptCatalogError}
          conceptCatalogLoading={isConceptCatalogLoading}
          scenarios={scenarios}
          runs={runs}
        />
      );
    }

    return (
      <LearningPanel
        locale={locale}
        workspaceSlug={workspaceSlug}
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

  return (
    <Dialog.Root open={panelOpen} onOpenChange={setPanelOpen}>
      <div className="map-screen">
        <div className="page-stack map-screen-stack">
          <MapStoreProvider mapId={map.id}>
          <div className="map-canvas-layer">
            <GraphCanvasRuntime
              locale={locale}
              map={map}
              graphMetrics={graphMetrics}
              selection={selection}
              interactionMode={interactionMode}
              connectLinkSourceId={connectLinkSourceId}
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
          </MapStoreProvider>

          <div className="map-overlay-layer">
            <div className="map-overlay-bottom">
              <MapBottomDock
                messages={messages}
                mapId={map.id}
                subjectLabel={map.subjectLabel}
                availableMaps={availableMaps}
                linkingSourceConceptTitle={linkingSourceConceptTitle}
                stepBadgeLabel={
                  guidedStep === "done"
                    ? messages.mapReadyBadge
                    : messages.stepLabel(guidedCopy.stepNumber, guidedCopy.totalSteps)
                }
                stepBadgeReady={guidedStep === "done"}
                zoomState={zoomState}
                interactionMode={interactionMode}
                selectionKind={selection.kind}
                inspectorOpen={isInspectorPanelOpen}
                scenarioOpen={isScenarioPanelOpen}
                learningOpen={isLearningPanelOpen}
                learningLabel={learningMessages.tabLabel}
                onOpenInspector={openInspectorPanel}
                onOpenScenario={openScenarioPanel}
                onOpenLearning={openLearningPanel}
                onStartCreateConcept={beginPlaceConcept}
                onStartCreateLink={beginConnectLink}
                onCancelInteraction={cancelInteraction}
                onSelectMap={(value) =>
                  router.push(workspaceMapPath(workspaceSlug, value))
                }
              />
            </div>
          </div>

          <div ref={setDialogContainer} className="map-dialog-container" />
        </div>

        {dialogContainer ? (
          <Dialog.Content
            container={dialogContainer}
            align="start"
            size="1"
            className={isMobileViewport ? "map-mobile-dialog" : "map-overlay-dialog"}
          >
            <div className="map-dialog-shell">
              <Flex
                align="start"
                justify="between"
                gap="3"
                className="map-dialog-header"
              >
                <div className="map-dialog-heading">
                  <Dialog.Title size="3" mb="1" className="map-dialog-title">
                    {map.title}
                  </Dialog.Title>
                  <Dialog.Description
                    size="2"
                    className="map-dialog-description"
                  >
                    {dialogDescription}
                  </Dialog.Description>
                </div>

                <Flex
                  align="center"
                  gap="2"
                  wrap="wrap"
                  justify="end"
                  className="map-dialog-header-actions"
                >
                  {panelTab === "inspector" ? (
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

                  <Dialog.Close>
                    <IconButton
                      type="button"
                      size="1"
                      radius="full"
                      variant="surface"
                      color="gray"
                      className="map-dialog-close"
                      aria-label={messages.inspector.cancel}
                    >
                      <Cross2Icon />
                    </IconButton>
                  </Dialog.Close>
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
          </Dialog.Content>
        ) : null}
      </div>
    </Dialog.Root>
  );
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
  children: ReactNode;
};

function MapIconAction({
  label,
  active = false,
  onClick,
  tooltipSide = "top",
  children,
}: MapIconActionProps) {
  return (
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
  mapId: string;
  subjectLabel: string;
  availableMaps: MapWorkspaceProps["availableMaps"];
  linkingSourceConceptTitle: string | null;
  stepBadgeLabel: string;
  stepBadgeReady: boolean;
  zoomState: CanvasZoomState;
  interactionMode: CanvasInteractionMode;
  selectionKind: InspectorSelection["kind"];
  inspectorOpen: boolean;
  scenarioOpen: boolean;
  learningOpen: boolean;
  learningLabel: string;
  onOpenInspector: () => void;
  onOpenScenario: () => void;
  onOpenLearning: () => void;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
  onCancelInteraction: () => void;
  onSelectMap: (mapId: string) => void;
};

function MapBottomDock({
  messages,
  mapId,
  subjectLabel,
  availableMaps,
  linkingSourceConceptTitle,
  stepBadgeLabel,
  stepBadgeReady,
  zoomState,
  interactionMode,
  selectionKind,
  inspectorOpen,
  scenarioOpen,
  learningOpen,
  learningLabel,
  onOpenInspector,
  onOpenScenario,
  onOpenLearning,
  onStartCreateConcept,
  onStartCreateLink,
  onCancelInteraction,
  onSelectMap,
}: MapBottomDockProps) {
  return (
    <div className="map-bottom-dock">
      <div className="map-bottom-dock-side is-left">
        <div className="map-bottom-dock-group is-meta">
          <div className="map-bottom-map-select">
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

          <MapModeIndicator
            messages={messages}
            interactionMode={interactionMode}
            linkingSourceConceptTitle={linkingSourceConceptTitle}
            onCancelInteraction={onCancelInteraction}
          />

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
        </div>
      </div>

      <div className="map-bottom-dock-center">
        <div className="map-bottom-dock-group">
          <MapIconAction
            label={messages.topBar.runScenario}
            active={scenarioOpen}
            onClick={onOpenScenario}
          >
            <RocketIcon />
          </MapIconAction>
          <MapIconAction
            label={learningLabel}
            active={learningOpen}
            onClick={onOpenLearning}
          >
            <LightningBoltIcon />
          </MapIconAction>
        </div>

        <div className="map-bottom-dock-group is-clustered">
          <MapIconAction
            label={messages.topBar.createLink}
            active={
              interactionMode === "connectLink" || selectionKind === "create-link"
            }
            onClick={onStartCreateLink}
          >
            <Link2Icon />
          </MapIconAction>
          <MapIconAction
            label={messages.topBar.newConcept}
            active={
              interactionMode === "placeConcept" || selectionKind === "create-concept"
            }
            onClick={onStartCreateConcept}
          >
            <PlusIcon />
          </MapIconAction>
        </div>

        <div className="map-bottom-dock-group">
          <MapIconAction
            label={messages.topBar.inspector}
            active={inspectorOpen}
            onClick={onOpenInspector}
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

