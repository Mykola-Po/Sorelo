"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Cross2Icon,
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
  Tooltip,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";

import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import type { InspectorSelection } from "@/features/inspector/types";
import { GraphCanvasRuntime } from "@/features/map-runtime/components/graph-canvas-runtime";
import { MapStoreProvider } from "@/features/map-runtime/store/map-store-provider";
import { useConceptCatalog } from "@/features/map-runtime/hooks/use-concept-catalog";
import {
  buildLinkDraftDefaults,
  deriveGuidedOnboardingStep,
  type CanvasInteractionMode,
} from "@/features/maps/workspace-state";
import type { MapWorkspaceProps } from "@/features/maps/types";
import { ScenarioPanel } from "@/features/scenarios/components/scenario-panel";
import { workspaceMapPath } from "@/shared/config/routes";
import {
  getMapWorkspaceMessages,
  type MapWorkspaceMessages,
} from "@/shared/i18n/messages/map-workspace";

type PanelTab = "inspector" | "scenario";

export function MapWorkspace({
  locale,
  workspaceSlug,
  workspaceRole,
  map,
  availableMaps,
  graphMetrics,
  scenarios,
  runs,
}: MapWorkspaceProps) {
  const router = useRouter();
  const messages = getMapWorkspaceMessages(locale);
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
  };

  const dialogDescription =
    panelTab === "inspector"
      ? messages.scenario.mobileInspectorDescription
      : messages.scenario.mobileScenarioDescription;

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
            />
          </div>
          </MapStoreProvider>

          <div className="map-overlay-layer">
            <div className="map-overlay-top">
              <MapTopStrip
                messages={messages}
                mapId={map.id}
                subjectLabel={map.subjectLabel}
                availableMaps={availableMaps}
                interactionMode={interactionMode}
                linkingSourceConceptTitle={linkingSourceConceptTitle}
                stepBadgeLabel={
                  guidedStep === "done"
                    ? messages.mapReadyBadge
                    : messages.stepLabel(guidedCopy.stepNumber, guidedCopy.totalSteps)
                }
                stepBadgeReady={guidedStep === "done"}
                onCancelInteraction={cancelInteraction}
                onSelectMap={(value) =>
                  router.push(workspaceMapPath(workspaceSlug, value))
                }
              />
            </div>

            <div className="map-overlay-bottom">
              <MapBottomDock
                messages={messages}
                interactionMode={interactionMode}
                selectionKind={selection.kind}
                inspectorOpen={isInspectorPanelOpen}
                scenarioOpen={isScenarioPanelOpen}
                onOpenInspector={openInspectorPanel}
                onOpenScenario={openScenarioPanel}
                onStartCreateConcept={beginPlaceConcept}
                onStartCreateLink={beginConnectLink}
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

type MapTopStripProps = {
  messages: MapWorkspaceMessages;
  mapId: string;
  subjectLabel: string;
  availableMaps: MapWorkspaceProps["availableMaps"];
  interactionMode: CanvasInteractionMode;
  linkingSourceConceptTitle: string | null;
  stepBadgeLabel: string;
  stepBadgeReady: boolean;
  onCancelInteraction: () => void;
  onSelectMap: (mapId: string) => void;
};

function MapTopStrip({
  messages,
  mapId,
  subjectLabel,
  availableMaps,
  interactionMode,
  linkingSourceConceptTitle,
  stepBadgeLabel,
  stepBadgeReady,
  onCancelInteraction,
  onSelectMap,
}: MapTopStripProps) {
  return (
    <div className="map-top-strip">
      <Flex
        gap="2"
        wrap="wrap"
        align="center"
        className="map-top-strip-badges"
      >
        <Badge
          color={stepBadgeReady ? "green" : "gray"}
          radius="full"
          variant={stepBadgeReady ? "soft" : "surface"}
        >
          {stepBadgeLabel}
        </Badge>

        <MapModeIndicator
          messages={messages}
          interactionMode={interactionMode}
          linkingSourceConceptTitle={linkingSourceConceptTitle}
          onCancelInteraction={onCancelInteraction}
        />

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
  interactionMode: CanvasInteractionMode;
  selectionKind: InspectorSelection["kind"];
  inspectorOpen: boolean;
  scenarioOpen: boolean;
  onOpenInspector: () => void;
  onOpenScenario: () => void;
  onStartCreateConcept: () => void;
  onStartCreateLink: () => void;
};

function MapBottomDock({
  messages,
  interactionMode,
  selectionKind,
  inspectorOpen,
  scenarioOpen,
  onOpenInspector,
  onOpenScenario,
  onStartCreateConcept,
  onStartCreateLink,
}: MapBottomDockProps) {
  return (
    <div className="map-bottom-dock">
      <div className="map-bottom-dock-group">
        <MapIconAction
          label={messages.topBar.runScenario}
          active={scenarioOpen}
          onClick={onOpenScenario}
        >
          <RocketIcon />
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
  );
}
