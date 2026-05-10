import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import type {
  GhostBobCommandSource,
  GhostBobSetupOptions,
  GhostBobStatus,
} from "@ghost-engineer/shared";

export const DEFAULT_BOB_COMMAND = "bob";
export const BOB_NODE_MINIMUM_VERSION = "22.15.0";
export const BOB_SHELL_INSTALL_COMMAND =
  "curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash";

export function detectBobStatus(options: GhostBobSetupOptions = {}): GhostBobStatus {
  const { command, source } = resolveBobCommand(options.command);
  const executablePath = resolveExecutablePath(command);
  const response = spawnSync(command, ["--help"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 3000,
  });
  const executableAvailable = !isMissingExecutable(response.error);
  const appearsCallable = executableAvailable && !response.error && response.status === 0;
  const nodeVersion = process.versions.node;
  const nodeMeetsMinimum = isVersionAtLeast(
    nodeVersion,
    BOB_NODE_MINIMUM_VERSION,
  );

  return {
    command,
    commandSource: source,
    executableAvailable,
    executablePath,
    appearsCallable,
    exitCode: response.status,
    stdout: response.stdout ?? "",
    stderr: response.stderr ?? "",
    error: response.error?.message,
    nodeVersion,
    minimumNodeVersion: BOB_NODE_MINIMUM_VERSION,
    nodeMeetsMinimum,
    statusText: createStatusText(command, executableAvailable, appearsCallable, response.error),
  };
}

export function formatBobActivationHint(status = detectBobStatus()): string {
  if (status.executableAvailable && status.appearsCallable) {
    return "";
  }

  return "IBM Bob not detected. Local context is ready. Run `ghost setup bob` to unlock Bob-powered reasoning.";
}

export function formatBobRequiredMessage(status: GhostBobStatus): string {
  return [
    "IBM Bob is required for this command, but Bob Shell was not detected.",
    "",
    `Checked command: ${status.command}`,
    status.commandSource === "env"
      ? "Command source: GHOST_BOB_COMMAND"
      : status.commandSource === "cli"
        ? "Command source: --bob-command"
        : "Command source: default `bob`",
    status.error ? `Status: ${status.error}` : `Status: ${status.statusText}`,
    "",
    "Ghost Engineer already wrote deterministic local artifacts before the Bob step.",
    "Run `ghost setup bob` for guided Bob Shell installation and IBMid sign-in steps.",
  ].join("\n");
}

export function formatBobSetupGuide(status = detectBobStatus()): string {
  if (status.executableAvailable && status.appearsCallable) {
    return [
      "IBM Bob detected.",
      "",
      `Command: ${status.command}`,
      status.executablePath ? `Path: ${status.executablePath}` : "",
      `Node.js: ${status.nodeVersion} (Bob Shell requires ${status.minimumNodeVersion} or later)`,
      "",
      "Next steps:",
      "1. If this is your first interactive Bob Shell session, run `bob` once and sign in with your IBMid when prompted.",
      "2. Return to your repository.",
      "3. Run `ghost analyze . --bob`.",
      "",
      "IBM Bob is a separate IBM product. It is not bundled with Ghost Engineer and may require its own trial, plan, usage limits, or license.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const nodeLine = status.nodeMeetsMinimum
    ? `Node.js: ${status.nodeVersion} (meets Bob Shell minimum ${status.minimumNodeVersion})`
    : `Node.js: ${status.nodeVersion} (Bob Shell requires ${status.minimumNodeVersion} or later)`;

  return [
    "IBM Bob was not found.",
    "",
    "Ghost Engineer uses IBM Bob for:",
    "- repository-wide reasoning",
    "- documentation generation",
    "- test planning",
    "- refactor guidance",
    "- engineering reports",
    "",
    nodeLine,
    "",
    status.nodeMeetsMinimum
      ? "Install Bob Shell:"
      : "Update Node.js before installing Bob Shell, then run:",
    `  ${BOB_SHELL_INSTALL_COMMAND}`,
    "",
    "Ghost Engineer will not install external software unless you explicitly request it.",
    "To let Ghost run the official installer, use:",
    "  ghost setup bob --install",
    "",
    "After installation:",
    "1. Run `bob` once and sign in with your IBMid when prompted.",
    "2. Return to your repository.",
    "3. Run `ghost analyze . --bob`.",
    "",
    "IBM Bob is a separate IBM product. It is not bundled with Ghost Engineer and may require its own trial, plan, usage limits, or license.",
  ].join("\n");
}

export function setupBob(options: GhostBobSetupOptions = {}): string {
  const status = detectBobStatus(options);
  if (status.executableAvailable && status.appearsCallable) {
    return formatBobSetupGuide(status);
  }

  if (!options.install) {
    return formatBobSetupGuide(status);
  }

  if (!status.nodeMeetsMinimum) {
    throw new Error(
      [
        formatBobSetupGuide(status),
        "",
        "Automatic Bob Shell installation was not attempted because this Node.js version does not meet Bob Shell's minimum requirement.",
      ].join("\n"),
    );
  }

  const install = spawnSync("bash", ["-lc", BOB_SHELL_INSTALL_COMMAND], {
    stdio: "inherit",
  });

  if (install.error || install.status !== 0) {
    throw new Error(
      [
        "Bob Shell installation did not complete successfully.",
        install.error ? `Error: ${install.error.message}` : `Exit code: ${install.status ?? "unknown"}`,
        "",
        "You can retry manually with:",
        `  ${BOB_SHELL_INSTALL_COMMAND}`,
      ].join("\n"),
    );
  }

  return [
    "Bob Shell installer completed.",
    "",
    formatBobSetupGuide(detectBobStatus(options)),
  ].join("\n");
}

function resolveBobCommand(command?: string): {
  command: string;
  source: GhostBobCommandSource;
} {
  if (command?.trim()) {
    return { command: command.trim(), source: "cli" };
  }

  if (process.env.GHOST_BOB_COMMAND?.trim()) {
    return { command: process.env.GHOST_BOB_COMMAND.trim(), source: "env" };
  }

  return { command: DEFAULT_BOB_COMMAND, source: "default" };
}

function resolveExecutablePath(command: string): string | undefined {
  if (command.includes("/") && existsSync(command)) {
    return command;
  }

  const lookup = spawnSync("which", [command], {
    encoding: "utf8",
    timeout: 1000,
  });

  if (lookup.status === 0) {
    return lookup.stdout.trim() || undefined;
  }

  return undefined;
}

function isMissingExecutable(error: Error | undefined): boolean {
  return Boolean(error && "code" in error && error.code === "ENOENT");
}

function createStatusText(
  command: string,
  executableAvailable: boolean,
  appearsCallable: boolean,
  error: Error | undefined,
): string {
  if (!executableAvailable) {
    return `Bob executable was not found for command: ${command}`;
  }

  if (appearsCallable) {
    return "Bob executable is available and responds to --help.";
  }

  return error?.message ?? "Bob executable was found but did not respond successfully.";
}

function isVersionAtLeast(actual: string, minimum: string): boolean {
  const actualParts = actual.split(".").map((part) => Number.parseInt(part, 10));
  const minimumParts = minimum.split(".").map((part) => Number.parseInt(part, 10));

  for (let index = 0; index < minimumParts.length; index += 1) {
    const actualValue = actualParts[index] ?? 0;
    const minimumValue = minimumParts[index] ?? 0;
    if (actualValue > minimumValue) {
      return true;
    }

    if (actualValue < minimumValue) {
      return false;
    }
  }

  return true;
}
