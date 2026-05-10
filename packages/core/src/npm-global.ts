import { spawnSync } from "node:child_process";
import { constants, existsSync, statSync, accessSync } from "node:fs";
import { dirname, delimiter, join } from "node:path";
import { homedir } from "node:os";
import type { GhostNpmGlobalStatus } from "@ghost-engineer/shared";

interface NpmGlobalStatusOptions {
  env?: Record<string, string | undefined>;
  homeDirectory?: string;
}

export function detectNpmGlobalStatus(
  options: NpmGlobalStatusOptions = {},
): GhostNpmGlobalStatus {
  const env = normalizeEnv(options.env);
  const homeDirectory = options.homeDirectory ?? env.HOME ?? homedir();
  const userPrefix = join(homeDirectory, ".local");
  const userBinDirectory = join(userPrefix, "bin");
  const userBinDirectoryOnPath = isOnPath(userBinDirectory, env.PATH);
  const fallbackUserPrefixAvailable = isWritableOrCreatable(userPrefix);
  const npmPath = resolveExecutablePath("npm", env);

  if (!npmPath) {
    return {
      status: "npm-missing",
      npmCommand: "npm",
      prefixWritable: false,
      binDirectoryOnPath: false,
      userPrefix,
      userBinDirectory,
      userBinDirectoryOnPath,
      fallbackUserPrefixAvailable,
      statusText: "npm was not found on PATH.",
    };
  }

  const prefixResult = spawnSync(npmPath, ["prefix", "-g"], {
    encoding: "utf8",
    env,
    timeout: 3000,
  });

  if (prefixResult.error || prefixResult.status !== 0) {
    return {
      status: "npm-missing",
      npmCommand: npmPath,
      npmPath,
      prefixWritable: false,
      binDirectoryOnPath: false,
      userPrefix,
      userBinDirectory,
      userBinDirectoryOnPath,
      fallbackUserPrefixAvailable,
      error: prefixResult.error?.message ?? prefixResult.stderr.trim(),
      statusText: "npm was found but `npm prefix -g` did not complete successfully.",
    };
  }

  const prefix = prefixResult.stdout.trim();
  const binDirectory = join(prefix, "bin");
  const prefixWritable = isWritableOrCreatable(prefix);
  const binDirectoryOnPath = isOnPath(binDirectory, env.PATH);
  const status = prefixWritable
    ? "prefix-writable"
    : fallbackUserPrefixAvailable
      ? "fallback-user-prefix-available"
      : "prefix-not-writable";

  return {
    status,
    npmCommand: npmPath,
    npmPath,
    prefix,
    prefixWritable,
    binDirectory,
    binDirectoryOnPath,
    userPrefix,
    userBinDirectory,
    userBinDirectoryOnPath,
    fallbackUserPrefixAvailable,
    statusText: createStatusText(prefix, prefixWritable, fallbackUserPrefixAvailable),
  };
}

export function createUserPrefixEnvironment(
  status: GhostNpmGlobalStatus,
  baseEnv: Record<string, string | undefined> = process.env,
): NodeJS.ProcessEnv {
  const env = normalizeEnv(baseEnv);
  return {
    ...env,
    npm_config_prefix: status.userPrefix,
    PATH: prependPath(status.userBinDirectory, env.PATH),
  };
}

export function formatPathSetupInstructions(
  binDirectory: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const shell = env.SHELL ?? "";

  if (shell.includes("fish")) {
    return [
      `${binDirectory} is not on PATH.`,
      "For fish, run:",
      `  fish_add_path ${binDirectory}`,
      "Then open a new shell and run `bob --help`.",
    ].join("\n");
  }

  if (shell.includes("zsh")) {
    return [
      `${binDirectory} is not on PATH.`,
      "For zsh, add this to ~/.zshrc:",
      `  export PATH="${binDirectory}:$PATH"`,
      "Then run `source ~/.zshrc` and `bob --help`.",
    ].join("\n");
  }

  return [
    `${binDirectory} is not on PATH.`,
    "For bash, add this to ~/.bashrc:",
    `  export PATH="${binDirectory}:$PATH"`,
    "Then run `source ~/.bashrc` and `bob --help`.",
  ].join("\n");
}

function normalizeEnv(
  env: Record<string, string | undefined> = process.env,
): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function resolveExecutablePath(
  command: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
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

function isOnPath(directory: string, pathValue = ""): boolean {
  return pathValue.split(delimiter).filter(Boolean).includes(directory);
}

function prependPath(directory: string, pathValue = ""): string {
  return [directory, ...pathValue.split(delimiter).filter(Boolean)].join(delimiter);
}

function isWritableOrCreatable(path: string): boolean {
  if (existsSync(path)) {
    try {
      const stats = statSync(path);
      if (!stats.isDirectory()) {
        return false;
      }

      accessSync(path, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  const parent = dirname(path);
  if (parent === path) {
    return false;
  }

  return isWritableOrCreatable(parent);
}

function createStatusText(
  prefix: string,
  prefixWritable: boolean,
  fallbackUserPrefixAvailable: boolean,
): string {
  if (prefixWritable) {
    return `npm global prefix is user-writable: ${prefix}`;
  }

  if (fallbackUserPrefixAvailable) {
    return `npm global prefix is not user-writable: ${prefix}. A user-owned prefix is available.`;
  }

  return `npm global prefix is not user-writable: ${prefix}. No user-owned fallback prefix is available.`;
}
