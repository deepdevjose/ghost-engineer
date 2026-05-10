import React, { useCallback, useMemo, useState } from "react";
import { render } from "ink";
import { WorkbenchApp } from "./components/WorkbenchApp.js";
import { createWorkbenchServices, loadWorkbenchSnapshot } from "./services.js";
import { renderStaticWorkbench } from "./render-static.js";
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
  createWorkbenchServices,
  deriveRecommendations,
  loadArtifactTree,
  loadWorkbenchSnapshot,
} from "./services.js";
export { renderStaticWorkbench } from "./render-static.js";
export { shouldUseColor } from "./theme.js";
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
    stdout.write(`${renderStaticWorkbench(services.loadSnapshot())}\n`);
    return;
  }

  render(
    <WorkbenchContainer services={services} colorEnabled={colorEnabled} />,
    {
      stdin,
      stdout,
      stderr: options.stderr ?? process.stderr,
      exitOnCtrlC: true,
    },
  );
}

function WorkbenchContainer({
  services,
  colorEnabled,
}: {
  services: WorkbenchServices;
  colorEnabled: boolean;
}) {
  const [snapshot, setSnapshot] = useState(() => services.loadSnapshot());
  const refresh = useCallback(() => setSnapshot(services.loadSnapshot()), [services]);
  const stableServices = useMemo(() => services, [services]);

  return (
    <WorkbenchApp
      services={stableServices}
      snapshot={snapshot}
      refresh={refresh}
      colorEnabled={colorEnabled}
    />
  );
}
