import { NAVIGATION_ITEMS } from "./navigation.js";
import type { WorkbenchSnapshot } from "./types.js";

export function renderStaticWorkbench(snapshot: WorkbenchSnapshot): string {
  const project = snapshot.project;
  const bobReady = snapshot.bobStatus.executableAvailable && snapshot.bobStatus.appearsCallable;

  return [
    "Ghost Engineer Workbench",
    "Repository intelligence for IBM Bob",
    "",
    "Navigation",
    ...NAVIGATION_ITEMS.map((item) => `  ${item.label}`),
    "",
    "Overview",
    `  Repository   ${snapshot.cwd}`,
    `  Project      ${project?.projectName ?? "Not analyzed yet"}`,
    `  Type         ${project?.projectType ?? "Unknown"}`,
    `  .ghost       ${snapshot.workspaceExists ? "ready" : "missing"}`,
    `  IBM Bob      ${bobReady ? "ready" : "setup needed"}`,
    `  Node.js      ${snapshot.nodeVersion}`,
    "",
    "Recommended next actions",
    ...snapshot.recommendations.map((item) => `  - ${item}`),
    "",
    "Artifacts",
    snapshot.artifacts.length > 0
      ? snapshot.artifacts.slice(0, 24).map((item) => `  ${item.kind === "directory" ? "/" : "-"} ${item.path}`).join("\n")
      : "  No .ghost artifacts yet. Run Analyze repository.",
    "",
    "Keys",
    "  Up/Down or j/k navigate, Enter activates, r refreshes, ? help, q quits.",
  ].join("\n");
}
