import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import type {
  GhostBobCommandSource,
  GhostBobSetupOptions,
  GhostBobStatus,
} from "@ghost-engineer/shared";
import {
  createUserPrefixEnvironment,
  detectNpmGlobalStatus,
  formatPathSetupInstructions,
} from "./npm-global.js";

export const DEFAULT_BOB_COMMAND = "bob";
export const BOB_NODE_MINIMUM_VERSION = "22.15.0";
export const BOB_SHELL_INSTALL_COMMAND =
  "curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash";

export function detectBobStatus(options: GhostBobSetupOptions = {}): GhostBobStatus {
  const env = normalizeEnv(options.env);
  const { command, source } = resolveBobCommand(options.command, env);
  const executablePath = resolveExecutablePath(command, env);
  const response = spawnSync(command, ["--help"], {
    encoding: "utf8",
    env,
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
    "Bob setup required",
    "",
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
      "Bob setup",
      "",
      "IBM Bob detected.",
      "",
      "Status",
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
    "Bob setup",
    "",
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
  const env = normalizeEnv(options.env);
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

  const npmStatus = detectNpmGlobalStatus({
    env,
    homeDirectory: options.homeDirectory,
  });

  if (npmStatus.status === "npm-missing") {
    throw new Error(
      [
        "Bob Shell installation was not started because npm is not available.",
        npmStatus.error ? `Status: ${npmStatus.error}` : npmStatus.statusText,
        "",
        "Install npm with Node.js 22.15.0 or later, then run:",
        "  ghost setup bob --install",
      ].join("\n"),
    );
  }

  if (!npmStatus.prefixWritable && !npmStatus.fallbackUserPrefixAvailable) {
    throw new Error(
      [
        "Bob Shell installation was not started because npm's global prefix is not writable.",
        npmStatus.prefix ? `npm global prefix: ${npmStatus.prefix}` : "",
        "",
        "Use a Node version manager or configure npm to use a user-owned global prefix, then run:",
        "  ghost setup bob --install",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const useUserPrefix = !npmStatus.prefixWritable;
  const installEnv = useUserPrefix
    ? createUserPrefixEnvironment(npmStatus, env)
    : env;
  const preflight = formatInstallPreflight(npmStatus);
  options.onProgress?.(preflight);

  if (useUserPrefix) {
    mkdirSync(npmStatus.userPrefix, { recursive: true });
    mkdirSync(npmStatus.userBinDirectory, { recursive: true });
  }

  const install = spawnSync("bash", ["-lc", BOB_SHELL_INSTALL_COMMAND], {
    encoding: "utf8",
    env: installEnv,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (install.error || install.status !== 0) {
    throw new Error(formatInstallFailure(install, npmStatus, useUserPrefix));
  }

  const currentStatus = detectBobStatus({ ...options, env });
  if (currentStatus.executableAvailable && currentStatus.appearsCallable) {
    return [
      options.onProgress ? "" : preflight,
      "Bob Shell installer completed.",
      "",
      formatBobSetupGuide(currentStatus),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (useUserPrefix) {
    const userPrefixStatus = detectBobStatus({ ...options, env: installEnv });
    if (userPrefixStatus.executableAvailable && userPrefixStatus.appearsCallable) {
      return [
        options.onProgress ? "" : preflight,
        "Bob Shell installer completed.",
        "",
        "Bob Shell appears to be installed under the user-owned npm prefix, but it is not available from your current PATH.",
        "",
        formatPathSetupInstructions(npmStatus.userBinDirectory, env),
        "",
        "After updating PATH:",
        "1. Run `bob` once and sign in with your IBMid when prompted.",
        "2. Return to your repository.",
        "3. Run `ghost analyze . --bob`.",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  return [
    options.onProgress ? "" : preflight,
    "Bob Shell installer completed, but `bob` is not callable yet.",
    "",
    useUserPrefix
      ? formatPathSetupInstructions(npmStatus.userBinDirectory, env)
      : "Check the installer output and ensure Bob Shell's bin directory is on PATH.",
    "",
    "Then run `ghost setup bob` again.",
  ]
    .filter(Boolean)
    .join("\n");
}

function resolveBobCommand(
  command: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): {
  command: string;
  source: GhostBobCommandSource;
} {
  if (command?.trim()) {
    return { command: command.trim(), source: "cli" };
  }

  if (env.GHOST_BOB_COMMAND?.trim()) {
    return { command: env.GHOST_BOB_COMMAND.trim(), source: "env" };
  }

  return { command: DEFAULT_BOB_COMMAND, source: "default" };
}

function resolveExecutablePath(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (command.includes("/") && existsSync(command)) {
    return command;
  }

  const lookup = spawnSync("which", [command], {
    encoding: "utf8",
    env,
    timeout: 1000,
  });

  if (lookup.status === 0) {
    return lookup.stdout.trim() || undefined;
  }

  return undefined;
}

function formatInstallPreflight(
  npmStatus: ReturnType<typeof detectNpmGlobalStatus>,
): string {
  if (npmStatus.prefixWritable) {
    return [
      "npm global prefix is user-writable.",
      `npm global prefix: ${npmStatus.prefix}`,
      "Ghost will run the official IBM Bob installer with the current npm environment.",
    ].join("\n");
  }

  return [
    `npm global prefix is not user-writable: ${npmStatus.prefix}`,
    `Ghost will run the official IBM Bob installer with a user-owned npm prefix: ${npmStatus.userPrefix}`,
    "This avoids sudo and keeps Bob available for the current user.",
  ].join("\n");
}

function formatInstallFailure(
  install: ReturnType<typeof spawnSync>,
  npmStatus: ReturnType<typeof detectNpmGlobalStatus>,
  usedUserPrefix: boolean,
): string {
  const output = [
    install.error?.message,
    typeof install.stdout === "string" ? install.stdout : "",
    typeof install.stderr === "string" ? install.stderr : "",
  ]
    .filter(Boolean)
    .join("\n");
  const isEacces = /EACCES|permission denied/i.test(output);

  if (isEacces) {
    return [
      "Bob Shell installation failed because npm could not write to its global install location.",
      npmStatus.prefix ? `npm global prefix: ${npmStatus.prefix}` : "",
      usedUserPrefix
        ? `Ghost already used the user-owned npm prefix: ${npmStatus.userPrefix}`
        : `Use a user-owned npm prefix: ${npmStatus.userPrefix}`,
      "",
      "Recovery:",
      `  mkdir -p ${npmStatus.userBinDirectory}`,
      `  npm_config_prefix=${npmStatus.userPrefix} PATH=${npmStatus.userBinDirectory}:$PATH ${BOB_SHELL_INSTALL_COMMAND}`,
      "",
      formatPathSetupInstructions(npmStatus.userBinDirectory),
      "",
      output.trim() ? `Installer output:\n${output.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Bob Shell installation did not complete successfully.",
    install.error ? `Error: ${install.error.message}` : `Exit code: ${install.status ?? "unknown"}`,
    "",
    "The official installer command was:",
    `  ${BOB_SHELL_INSTALL_COMMAND}`,
    npmStatus.prefixWritable
      ? ""
      : `Ghost ran it with npm_config_prefix=${npmStatus.userPrefix} and PATH=${npmStatus.userBinDirectory}:$PATH`,
    output.trim() ? `\nInstaller output:\n${output.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeEnv(
  env: Record<string, string | undefined> = process.env,
): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
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
