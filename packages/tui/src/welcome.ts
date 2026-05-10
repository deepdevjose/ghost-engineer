import type { WorkbenchSnapshot } from "./types.js";

export const GHOST_ENGINEER_VERSION = "0.1.0";

export const GHOST_ASCII = [
  "  _______  __   __  _______  _______  _______ ",
  " |       ||  | |  ||       ||       ||       |",
  " |    ___||  |_|  ||   _   ||  _____||_     _|",
  " |   | __ |       ||  | |  || |_____   |   |  ",
  " |   ||  ||       ||  |_|  ||_____  |  |   |  ",
  " |   |_| ||   _   ||       | _____| |  |   |  ",
  " |_______||__| |__||_______||_______|  |___|  ",
];

export function renderWelcomeText(snapshot: WorkbenchSnapshot): string {
  const bobReady = snapshot.bobStatus.executableAvailable && snapshot.bobStatus.appearsCallable;
  const workspaceState = snapshot.workspaceExists ? "ready" : "missing";
  const bobState = bobReady ? "ready" : "setup needed";

  return [
    "Welcome to",
    "",
    ...GHOST_ASCII,
    "",
    "GHOST ENGINEER WORKBENCH",
    `Version ${GHOST_ENGINEER_VERSION}`,
    "",
    "Repository intelligence workbench for IBM Bob.",
    "",
    "Current state",
    `  Repository   ${snapshot.cwd}`,
    `  .ghost       ${workspaceState}`,
    `  IBM Bob      ${bobState}`,
    `  Node.js      ${snapshot.nodeVersion}`,
    "",
    "Helpful keys",
    "  Enter    Open workbench",
    "  a        Run local analysis",
    "  b        Open Bob setup",
    "  ?        Help",
    "  q        Quit",
    "",
    "Users should independently verify AI-generated content.",
  ].join("\n");
}
