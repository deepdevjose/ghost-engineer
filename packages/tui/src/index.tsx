import React, { useCallback, useMemo, useState } from "react";
import { render } from "ink";
import { WorkbenchApp } from "./components/WorkbenchApp.js";
import { createErrorSnapshot, createWorkbenchServices, loadWorkbenchSnapshot } from "./services.js";
import { renderStaticWorkbench } from "./render-static.js";
import { clearInteractiveScreen, enterInteractiveScreen } from "./screen.js";
import { shouldUseColor } from "./theme.js";
import type { WorkbenchServices } from "./types.js";

export {
  NAVIGATION_ITEMS,
  indexForView,
  moveSelection,
  viewAt,
} from "./navigation.js";
export { actionForView } from "./actions.js";
export {
  createErrorSnapshot,
  createWorkbenchServices,
  deriveRecommendations,
  loadArtifactTree,
  loadWorkbenchSnapshot,
} from "./services.js";
export { renderStaticWorkbench } from "./render-static.js";
export {
  CLEAR_SCREEN,
  ENTER_ALTERNATE_SCREEN,
  EXIT_ALTERNATE_SCREEN,
  HIDE_CURSOR,
  SHOW_CURSOR,
  clearInteractiveScreen,
  enterInteractiveScreen,
} from "./screen.js";
export { shouldUseColor } from "./theme.js";
export { GHOST_ASCII, GHOST_ENGINEER_VERSION, renderWelcomeText } from "./welcome.js";
export { WorkbenchApp } from "./components/WorkbenchApp.js";
export type {
  ActivityEvent,
  AnalyzeActionResult,
  LoadedProjectContext,
  WorkbenchServices,
  WorkbenchSnapshot,
  WorkbenchView,
  WorkspaceArtifact,
} from "./types.js";

export interface RunWorkbenchOptions {
  cwd?: string;
  bobCommand?: string;
  color?: boolean;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  services?: WorkbenchServices;
}

export function runWorkbench(options: RunWorkbenchOptions = {}): void {
  const stdout = options.stdout ?? process.stdout;
  const stdin = options.stdin ?? process.stdin;
  const colorEnabled = shouldUseColor({
    color: options.color,
    stream: stdout,
  });
  const services =
    options.services ??
    createWorkbenchServices({
      cwd: options.cwd,
      bobCommand: options.bobCommand,
    });

  if (!stdout.isTTY || !stdin.isTTY) {
    stdout.write(`${renderStaticWorkbench(safeLoadSnapshot(services))}\n`);
    return;
  }

  const restoreScreen = enterInteractiveScreen(stdout);
  const instance = render(
    <WorkbenchContainer
      services={services}
      colorEnabled={colorEnabled}
      clearScreen={() => clearInteractiveScreen(stdout)}
    />,
    { stdin, stdout, stderr: options.stderr ?? process.stderr, exitOnCtrlC: true },
  );
  void instance.waitUntilExit().then(restoreScreen, restoreScreen);
}

function WorkbenchContainer({
  services,
  colorEnabled,
  clearScreen,
}: {
  services: WorkbenchServices;
  colorEnabled: boolean;
  clearScreen: () => void;
}) {
  const [snapshot, setSnapshot] = useState(() => safeLoadSnapshot(services));
  const refresh = useCallback(() => setSnapshot(safeLoadSnapshot(services)), [services]);
  const stableServices = useMemo(() => services, [services]);

  return (
    <WorkbenchApp
      services={stableServices}
      snapshot={snapshot}
      refresh={refresh}
      colorEnabled={colorEnabled}
      clearScreen={clearScreen}
    />
  );
}

function safeLoadSnapshot(services: WorkbenchServices) {
  try {
    return services.loadSnapshot();
  } catch (error) {
    return createErrorSnapshot(error);
  }
}
