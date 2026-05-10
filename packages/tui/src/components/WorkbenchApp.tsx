import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  indexForView,
  moveSelection,
  NAVIGATION_ITEMS,
  viewAt,
} from "../navigation.js";
import { actionForView } from "../actions.js";
import type {
  ActivityEvent,
  WorkbenchServices,
  WorkbenchSnapshot,
  WorkbenchView,
} from "../types.js";
import { inkColor } from "../theme.js";
import { ActionView } from "./ActionView.js";
import { ActivityView } from "./ActivityView.js";
import { AnalyzeView } from "./AnalyzeView.js";
import { ArtifactsView } from "./ArtifactsView.js";
import { BobView } from "./BobView.js";
import { Footer } from "./Footer.js";
import { Header } from "./Header.js";
import { HelpOverlay } from "./HelpOverlay.js";
import { OverviewView } from "./OverviewView.js";
import { Panel } from "./Panel.js";
import { Sidebar } from "./Sidebar.js";
import { WelcomeScreen } from "./WelcomeScreen.js";

export function WorkbenchApp({
  services,
  snapshot,
  refresh,
  colorEnabled,
}: {
  services: WorkbenchServices;
  snapshot: WorkbenchSnapshot;
  refresh: () => void;
  colorEnabled: boolean;
}) {
  const app = useApp();
  const mountedRef = useRef(true);
  const [selectedIndex, setSelectedIndex] = useState(indexForView("overview"));
  const [activeView, setActiveView] = useState<WorkbenchView>("overview");
  const [showWelcome, setShowWelcome] = useState(true);
  const [activity, setActivity] = useState<ActivityEvent[]>([
    createActivity("info", "Workbench started"),
  ]);
  const [busy, setBusy] = useState<string | undefined>();
  const busyRef = useRef<string | undefined>();
  const [lastOutputByView, setLastOutputByView] = useState<Partial<Record<WorkbenchView, string>>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [installConfirmation, setInstallConfirmation] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addActivity = useCallback((level: ActivityEvent["level"], message: string) => {
    setActivity((current) => [...current, createActivity(level, message)]);
  }, []);

  const runTask = useCallback(
    (view: WorkbenchView, label: string, task: () => string) => {
      if (busyRef.current) {
        addActivity("warning", `Still running: ${busyRef.current}`);
        setLastOutputByView((current) => ({
          ...current,
          [view]: `Still running: ${busyRef.current}. Wait for it to finish before starting another task.`,
        }));
        return;
      }

      busyRef.current = label;
      setBusy(label);
      addActivity("info", `${label} started`);
      setTimeout(() => {
        if (!mountedRef.current) {
          busyRef.current = undefined;
          return;
        }

        try {
          const output = task();
          if (!mountedRef.current) {
            return;
          }
          setLastOutputByView((current) => ({ ...current, [view]: output }));
          addActivity("success", `${label} completed`);
          refresh();
        } catch (error) {
          if (!mountedRef.current) {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          setLastOutputByView((current) => ({ ...current, [view]: message }));
          addActivity("error", `${label} failed`);
        } finally {
          busyRef.current = undefined;
          setBusy(undefined);
        }
      }, 0);
    },
    [addActivity, refresh],
  );

  const runPrimaryAction = useCallback(
    (view: WorkbenchView) => {
      const action = actionForView(view, services);
      if (action.refreshOnly) {
        setInstallConfirmation(false);
        refresh();
        addActivity("info", action.run());
        return;
      }

      setInstallConfirmation(false);
      runTask(view, action.label, action.run);
    },
    [addActivity, refresh, runTask, services],
  );

  useInput((input, key) => {
    if (showWelcome) {
      if (input === "q") {
        app.exit();
        return;
      }

      if (input === "?") {
        setShowWelcome(false);
        setShowHelp(true);
        setInstallConfirmation(false);
        addActivity("info", "Help opened");
        return;
      }

      if (input === "a") {
        setShowWelcome(false);
        setActiveView("analyze");
        setSelectedIndex(indexForView("analyze"));
        runTask("analyze", "Local analysis", () => services.analyzeLocal().summary);
        return;
      }

      if (input === "b") {
        setShowWelcome(false);
        setActiveView("bob");
        setSelectedIndex(indexForView("bob"));
        runPrimaryAction("bob");
        return;
      }

      if (key.return) {
        setShowWelcome(false);
        setInstallConfirmation(false);
        addActivity("info", "Workbench opened");
      }

      return;
    }

    if (input === "q") {
      app.exit();
      return;
    }

    if (input === "?") {
      setShowHelp((current) => !current);
      setInstallConfirmation(false);
      return;
    }

    if (input === "r") {
      setInstallConfirmation(false);
      refresh();
      addActivity("info", "Status refreshed");
      return;
    }

    if (key.upArrow || input === "k") {
      setInstallConfirmation(false);
      setSelectedIndex((current) => moveSelection(current, -1));
      return;
    }

    if (key.downArrow || input === "j") {
      setInstallConfirmation(false);
      setSelectedIndex((current) => moveSelection(current, 1));
      return;
    }

    if (key.return) {
      const selectedView = viewAt(selectedIndex);
      setInstallConfirmation(false);
      setActiveView(selectedView);
      runPrimaryAction(selectedView);
      return;
    }

    if (activeView === "analyze" && input === "b") {
      setInstallConfirmation(false);
      runTask("analyze", "Bob-powered analysis", () => services.analyzeWithBob().summary);
      return;
    }

    if (activeView === "bob" && input === "i") {
      if (!installConfirmation) {
        setInstallConfirmation(true);
        addActivity("warning", "Bob installer confirmation requested");
        setLastOutputByView((current) => ({
          ...current,
          bob: [
            "Bob Shell installer is external software from IBM.",
            "Press `i` again to run the official installer, or press any navigation key to cancel.",
          ].join("\n"),
        }));
        return;
      }

      setInstallConfirmation(false);
      runTask("bob", "Bob installer", () => services.setupBob(true));
    }
  });

  const activeLabel =
    NAVIGATION_ITEMS.find((item) => item.view === activeView)?.label ?? "Overview";

  if (showWelcome) {
    return <WelcomeScreen snapshot={snapshot} colorEnabled={colorEnabled} />;
  }

  return (
    <Box flexDirection="column">
      <Header snapshot={snapshot} colorEnabled={colorEnabled} />
      <Box marginTop={1}>
        <Sidebar
          selectedIndex={selectedIndex}
          activeView={activeView}
          colorEnabled={colorEnabled}
        />
        <Panel title={showHelp ? "Help" : activeLabel} colorEnabled={colorEnabled}>
          {showHelp ? (
            <HelpOverlay colorEnabled={colorEnabled} />
          ) : (
            renderView({
              activeView,
              snapshot,
              activity,
              busy,
              lastOutput: lastOutputByView[activeView],
              installConfirmation,
              colorEnabled,
            })
          )}
        </Panel>
      </Box>
      <Footer
        activeView={activeView}
        installConfirmation={installConfirmation}
        colorEnabled={colorEnabled}
      />
    </Box>
  );
}

function renderView({
  activeView,
  snapshot,
  activity,
  busy,
  lastOutput,
  installConfirmation,
  colorEnabled,
}: {
  activeView: WorkbenchView;
  snapshot: WorkbenchSnapshot;
  activity: ActivityEvent[];
  busy?: string;
  lastOutput?: string;
  installConfirmation: boolean;
  colorEnabled: boolean;
}) {
  switch (activeView) {
    case "overview":
      return <OverviewView snapshot={snapshot} colorEnabled={colorEnabled} />;
    case "analyze":
      return (
        <AnalyzeView
          snapshot={snapshot}
          busy={busy}
          lastOutput={lastOutput}
          colorEnabled={colorEnabled}
        />
      );
    case "bob":
      return (
        <BobView
          snapshot={snapshot}
          busy={busy}
          lastOutput={lastOutput}
          installConfirmation={installConfirmation}
          colorEnabled={colorEnabled}
        />
      );
    case "artifacts":
      return <ArtifactsView artifacts={snapshot.artifacts} colorEnabled={colorEnabled} />;
    case "activity":
      return <ActivityView activity={activity} colorEnabled={colorEnabled} />;
    case "explain":
      return (
        <ActionView
          title="Explain repository"
          description="Summarize architecture from reconstructed repository context."
          action="Explain current system"
          busy={busy}
          lastOutput={lastOutput}
          colorEnabled={colorEnabled}
        />
      );
    case "docs":
      return (
        <ActionView
          title="Documentation"
          description="Generate onboarding documentation from local Ghost analysis."
          action="Generate docs"
          busy={busy}
          lastOutput={lastOutput}
          colorEnabled={colorEnabled}
        />
      );
    case "tests":
      return (
        <ActionView
          title="Tests"
          description="Create a risk-driven test plan from repository signals."
          action="Generate test plan"
          busy={busy}
          lastOutput={lastOutput}
          colorEnabled={colorEnabled}
        />
      );
    case "patch":
      return (
        <ActionView
          title="Patch Plan"
          description="Create a reviewable plan without applying code automatically."
          action="Generate patch plan"
          busy={busy}
          lastOutput={lastOutput}
          colorEnabled={colorEnabled}
        />
      );
    case "reports":
      return (
        <ActionView
          title="Reports"
          description="Regenerate the final Ghost Engineer report."
          action="Generate report"
          busy={busy}
          lastOutput={lastOutput}
          colorEnabled={colorEnabled}
        />
      );
  }
}

function createActivity(level: ActivityEvent["level"], message: string): ActivityEvent {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    level,
    message,
    createdAt: new Date().toLocaleTimeString(),
  };
}
