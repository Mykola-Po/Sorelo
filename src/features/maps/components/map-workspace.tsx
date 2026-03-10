"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GearIcon,
  ReaderIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { Badge, Button, Dialog, Flex, Heading, Select, Text } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import type { InspectorSelection } from "@/features/inspector/types";
import { GraphCanvasRuntime } from "@/features/map-runtime/components/graph-canvas-runtime";
import { useConceptCatalog } from "@/features/map-runtime/hooks/use-concept-catalog";
import {
  buildLinkDraftDefaults,
  deriveGuidedOnboardingStep,
  getNextPanelVisibilityState,
  MAP_PANEL_VISIBILITY_STORAGE_KEY,
  parseStoredPanelVisibilityState,
  type CanvasInteractionMode,
  type PanelVisibilityState,
} from "@/features/maps/workspace-state";
import type { MapWorkspaceProps } from "@/features/maps/types";
import { ScenarioPanel } from "@/features/scenarios/components/scenario-panel";
import { workspaceMapPath } from "@/shared/config/routes";
import { getMapWorkspaceMessages } from "@/shared/i18n/messages/map-workspace";
import { StatusBadge } from "@/shared/ui/components/status-badge";

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
  const [panelTab, setPanelTab] = useState<PanelTab>("inspector");
  const [selection, setSelection] = useState<InspectorSelection>({ kind: "none" });
  const [interactionMode, setInteractionMode] = useState<CanvasInteractionMode>("inspect");
  const [connectLinkSourceId, setConnectLinkSourceId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibilityState>(() => {
    if (typeof window === "undefined") {
      return "expanded";
    }

    return parseStoredPanelVisibilityState(
      window.localStorage.getItem(MAP_PANEL_VISIBILITY_STORAGE_KEY)
    );
  });
  const {
    catalog: conceptCatalog,
    isLoading: isConceptCatalogLoading,
    error: conceptCatalogError,
  } = useConceptCatalog(map.id);

  useEffect(() => {
    if (typeof window === "undefined" || isMobileViewport) {
      return;
    }

    window.localStorage.setItem(
      MAP_PANEL_VISIBILITY_STORAGE_KEY,
      panelVisibility
    );
  }, [isMobileViewport, panelVisibility]);

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

  const openPanel = (tab: PanelTab) => {
    setPanelTab(tab);
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-panel")
    );
  };

  const toggleDesktopPanel = () => {
    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "toggle")
    );
  };

  const openMapSettings = () => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "map-settings" });
    setPanelTab("inspector");

    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-settings")
    );
  };

  const beginPlaceConcept = () => {
    setInteractionMode("placeConcept");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setMobilePanelOpen(false);
  };

  const beginConnectLink = () => {
    if (graphMetrics.conceptCount < 2) {
      setInteractionMode("inspect");
      setConnectLinkSourceId(null);
      setSelection({ kind: "create-link" });
      openPanel("inspector");
      return;
    }

    setInteractionMode("connectLink");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    setPanelTab("inspector");
    setMobilePanelOpen(false);
  };

  const openConceptInspector = (conceptId: string) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "concept", id: conceptId });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const openLinkInspector = (linkId: string) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "link", id: linkId });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const openCreateConceptAt = (x: number, y: number) => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "create-concept", x, y });
    setPanelTab("inspector");
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const openCreateLinkDraft = (sourceConceptId: string, targetConceptId: string) => {
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
    if (isMobileViewport) {
      setMobilePanelOpen(true);
      return;
    }

    setPanelVisibility((current) =>
      getNextPanelVisibilityState(current, "open-selection")
    );
  };

  const clearCanvasSelection = () => {
    setInteractionMode("inspect");
    setConnectLinkSourceId(null);
    setSelection({ kind: "none" });
    if (isMobileViewport) {
      setMobilePanelOpen(false);
    }
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
          onOpenScenario={() => openPanel("scenario")}
          onCancelInteraction={clearCanvasSelection}
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

  return (
    <div className="map-screen">
      <Dialog.Root open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <div className="page-stack map-screen-stack">
          <div className="map-canvas-layer">
            <GraphCanvasRuntime
              locale={locale}
              map={map}
              graphMetrics={graphMetrics}
              selection={selection}
              guidedStep={guidedStep}
              interactionMode={interactionMode}
              connectLinkSourceId={connectLinkSourceId}
              connectLinkSourceTitle={linkingSourceConceptTitle}
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

          <div className="map-overlay-layer">
            <Flex
              align="start"
              justify="between"
              gap="3"
              wrap="wrap"
              className="map-header-bar"
            >
              <Flex direction="column" gap="1" className="map-title-block">
                <Flex gap="2" wrap="wrap" align="center">
                  <Heading size="6">{map.title}</Heading>
                  <Badge color="gray" radius="full" variant="surface">
                    {map.subjectLabel}
                  </Badge>
                  <Badge color="blue" radius="full" variant="soft">
                    {guidedStep === "done"
                      ? messages.mapReadyBadge
                      : messages.stepLabel(guidedCopy.stepNumber, guidedCopy.totalSteps)}
                  </Badge>
                </Flex>
                <Text color="gray" size="2" className="map-header-supporting">
                  {guidedCopy.title}
                </Text>
              </Flex>

              <Flex gap="2" wrap="wrap" align="center" className="map-header-actions">
                <div className="map-inline-select">
                  <Select.Root
                    size="2"
                    value={map.id}
                    onValueChange={(value) =>
                      router.push(workspaceMapPath(workspaceSlug, value))
                    }
                  >
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

                <StatusBadge
                  status={workspaceRole}
                  label={messages.labels.workspaceRoles[workspaceRole]}
                />

                <Button
                  type="button"
                  size="2"
                  variant={interactionMode === "placeConcept" ? "solid" : "surface"}
                  onClick={beginPlaceConcept}
                >
                  {messages.topBar.newConcept}
                </Button>
                <Button
                  type="button"
                  size="2"
                  variant={interactionMode === "connectLink" ? "solid" : "surface"}
                  onClick={beginConnectLink}
                >
                  {messages.topBar.createLink}
                </Button>
                <Button
                  type="button"
                  size="2"
                  variant={panelTab === "scenario" ? "solid" : "surface"}
                  onClick={() => openPanel("scenario")}
                >
                  {messages.topBar.runScenario}
                </Button>
              </Flex>
            </Flex>

            <div className="map-overlay-body">
              {!isMobileViewport ? (
                <div
                  className={
                    panelVisibility === "collapsed"
                      ? "map-panel is-collapsed"
                      : "map-panel"
                  }
                >
                  {panelVisibility === "collapsed" ? (
                    <Flex direction="column" gap="2" align="center" className="map-panel-rail">
                      <Button
                        type="button"
                        size="1"
                        variant="soft"
                        color="gray"
                        title={messages.topBar.expandPanel}
                        onClick={toggleDesktopPanel}
                      >
                        <ChevronRightIcon />
                      </Button>
                      <Button
                        type="button"
                        size="1"
                        variant={panelTab === "inspector" ? "solid" : "surface"}
                        title={messages.topBar.openInspector}
                        onClick={() => openPanel("inspector")}
                      >
                        <ReaderIcon />
                      </Button>
                      <Button
                        type="button"
                        size="1"
                        variant={panelTab === "scenario" ? "solid" : "surface"}
                        title={messages.topBar.openScenario}
                        onClick={() => openPanel("scenario")}
                      >
                        <RocketIcon />
                      </Button>
                      <Button
                        type="button"
                        size="1"
                        variant="surface"
                        color="gray"
                        title={messages.topBar.mapSettings}
                        onClick={openMapSettings}
                      >
                        <GearIcon />
                      </Button>
                    </Flex>
                  ) : (
                    <Flex direction="column" gap="3" height="100%" className="map-panel-stack">
                      <Flex align="center" justify="between" gap="2">
                        <Flex gap="2" wrap="wrap">
                          <Button
                            type="button"
                            size="2"
                            variant={panelTab === "inspector" ? "solid" : "surface"}
                            onClick={() => setPanelTab("inspector")}
                          >
                            {messages.topBar.inspector}
                          </Button>
                          <Button
                            type="button"
                            size="2"
                            variant={panelTab === "scenario" ? "solid" : "surface"}
                            onClick={() => setPanelTab("scenario")}
                          >
                            {messages.topBar.scenario}
                          </Button>
                        </Flex>
                        <Flex gap="1" wrap="nowrap">
                          <Button
                            type="button"
                            size="1"
                            variant="ghost"
                            color="gray"
                            title={messages.topBar.mapSettings}
                            onClick={openMapSettings}
                          >
                            <GearIcon />
                          </Button>
                          <Button
                            type="button"
                            size="1"
                            variant="ghost"
                            color="gray"
                            title={messages.topBar.collapsePanel}
                            onClick={toggleDesktopPanel}
                          >
                            <ChevronLeftIcon />
                          </Button>
                        </Flex>
                      </Flex>
                      <div className="panel-scroll-fill panel-native-scroll">
                        <div className="panel-content">{renderPanelContent()}</div>
                      </div>
                    </Flex>
                  )}
                </div>
              ) : (
                <Flex gap="2" className="map-mobile-panel-bar">
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    onClick={() => {
                      setPanelTab("inspector");
                      setMobilePanelOpen(true);
                    }}
                  >
                    {messages.topBar.inspector}
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    onClick={() => {
                      setPanelTab("scenario");
                      setMobilePanelOpen(true);
                    }}
                  >
                    {messages.topBar.scenario}
                  </Button>
                  <Button
                    type="button"
                    size="2"
                    variant="surface"
                    color="gray"
                    onClick={openMapSettings}
                  >
                    <GearIcon />
                  </Button>
                </Flex>
              )}
            </div>
          </div>
        </div>

        {isMobileViewport ? (
          <Dialog.Content className="map-mobile-dialog">
            <Dialog.Title>
              {panelTab === "inspector"
                ? messages.topBar.inspector
                : messages.topBar.scenario}
            </Dialog.Title>
            <Dialog.Description className="map-mobile-dialog-description">
              {panelTab === "inspector"
                ? messages.scenario.mobileInspectorDescription
                : messages.scenario.mobileScenarioDescription}
            </Dialog.Description>
            <Flex gap="2" mb="3">
              <Button
                type="button"
                size="2"
                variant={panelTab === "inspector" ? "solid" : "surface"}
                onClick={() => setPanelTab("inspector")}
              >
                {messages.topBar.inspector}
              </Button>
              <Button
                type="button"
                size="2"
                variant={panelTab === "scenario" ? "solid" : "surface"}
                onClick={() => setPanelTab("scenario")}
              >
                {messages.topBar.scenario}
              </Button>
            </Flex>
            <div className="map-mobile-dialog-body">
              <div className="panel-content">{renderPanelContent()}</div>
            </div>
          </Dialog.Content>
        ) : null}
      </Dialog.Root>
    </div>
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
