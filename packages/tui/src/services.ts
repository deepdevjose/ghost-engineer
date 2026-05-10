import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import {
  BOB_NODE_MINIMUM_VERSION,
  DEFAULT_BOB_COMMAND,
  analyzeRepository,
  detectBobStatus,
  explainRepository,
  generateDocumentation,
  generatePatchPlan,
  generateReport,
  generateTestPlan,
  setupBob,
} from "@ghost-engineer/core";
import type { GhostBobCommandSource, GhostBobStatus } from "@ghost-engineer/shared";
import type {
  LoadedProjectContext,
  WorkbenchServices,
  WorkbenchSnapshot,
  WorkspaceArtifact,
} from "./types.js";

interface ServicesOptions {
  cwd?: string;
  bobCommand?: string;
}

const MAX_ARTIFACTS = 200;

export function createWorkbenchServices(options: ServicesOptions = {}): WorkbenchServices {
  const cwd = resolve(options.cwd ?? process.cwd());

  return {
    loadSnapshot: () => loadWorkbenchSnapshot({ cwd, bobCommand: options.bobCommand }),
    analyzeLocal: () => {
      const result = analyzeRepository(cwd);
      return { summary: result.summary, commandResult: result };
    },
    analyzeWithBob: () => {
      const result = analyzeRepository(cwd, {
        task: "architecture",
        command: options.bobCommand,
      });
      return { summary: result.summary, commandResult: result };
    },
    setupBob: (install = false) =>
      setupBob({
        command: options.bobCommand,
        install,
      }),
    explainSystem: () => explainRepository(cwd),
    generateDocs: () => generateDocumentation(cwd),
    generateTests: () => generateTestPlan(cwd),
    generatePatchPlan: (goal: string) => generatePatchPlan(cwd, goal),
    generateReport: () => generateReport(cwd),
  };
}

export function loadWorkbenchSnapshot(options: ServicesOptions = {}): WorkbenchSnapshot {
  const cwd = resolve(options.cwd ?? process.cwd());
  const workspacePath = join(cwd, ".ghost");
  const warnings: string[] = [];
  const workspaceExists = safeIsDirectory(workspacePath, warnings, ".ghost");
  const bobStatus = safeDetectBobStatus(options.bobCommand, warnings);
  const project = workspaceExists ? loadProjectContext(cwd, warnings) : undefined;
  const artifacts = workspaceExists ? loadArtifactTree(cwd, warnings) : [];

  return {
    cwd,
    nodeVersion: process.versions.node,
    workspaceExists,
    project,
    bobStatus,
    recommendations: deriveRecommendations(workspaceExists, bobStatus, project),
    artifacts,
    warnings,
  };
}

export function createErrorSnapshot(error: unknown, cwd = process.cwd()): WorkbenchSnapshot {
  const message = error instanceof Error ? error.message : String(error);
  const bobStatus = createFallbackBobStatus();

  return {
    cwd: resolve(cwd),
    nodeVersion: process.versions.node,
    workspaceExists: false,
    bobStatus,
    recommendations: [
      "Resolve the startup error",
      "Run command mode if needed: ghost analyze .",
    ],
    artifacts: [],
    warnings: [`Workbench startup failed: ${message}`],
  };
}

export function deriveRecommendations(
  workspaceExists: boolean,
  bobStatus: GhostBobStatus,
  project?: LoadedProjectContext,
): string[] {
  const recommendations: string[] = [];

  if (!workspaceExists) {
    recommendations.push("Run local repository analysis");
  }

  if (!bobStatus.executableAvailable || !bobStatus.appearsCallable) {
    recommendations.push("Set up IBM Bob");
  }

  if (workspaceExists && bobStatus.executableAvailable && bobStatus.appearsCallable) {
    recommendations.push("Run Bob-powered analysis");
    recommendations.push("Explain the system with current context");
  }

  if (workspaceExists && project?.riskCount && project.riskCount > 0) {
    recommendations.push("Generate a risk-driven test plan");
  }

  return recommendations.length > 0
    ? recommendations
    : ["Open Analyze to refresh repository intelligence"];
}

export function loadArtifactTree(cwd: string, warnings: string[] = []): WorkspaceArtifact[] {
  const root = join(cwd, ".ghost");
  if (!safeIsDirectory(root, warnings, ".ghost")) {
    return [];
  }

  const artifacts: WorkspaceArtifact[] = [];
  collectArtifacts(root, root, artifacts, 0, warnings);
  if (artifacts.length >= MAX_ARTIFACTS) {
    warnings.push(`Artifact tree truncated after ${MAX_ARTIFACTS} entries.`);
  }
  return artifacts;
}

function loadProjectContext(
  cwd: string,
  warnings: string[] = [],
): LoadedProjectContext | undefined {
  const architecturePath = join(cwd, ".ghost", "architecture.json");
  if (!existsSync(architecturePath)) {
    return {
      projectName: basename(cwd),
    };
  }

  try {
    const architecture = JSON.parse(readFileSync(architecturePath, "utf8")) as {
      projectName?: string;
      projectType?: string;
      packageManager?: string;
      analyzedAt?: string;
      totals?: { files?: number };
      risks?: unknown[];
    };
    return {
      projectName: architecture.projectName,
      projectType: architecture.projectType,
      packageManager: architecture.packageManager,
      files: architecture.totals?.files,
      riskCount: Array.isArray(architecture.risks) ? architecture.risks.length : undefined,
      analyzedAt: architecture.analyzedAt,
    };
  } catch {
    warnings.push("Could not read .ghost/architecture.json. Showing fallback project context.");
    return {
      projectName: basename(cwd),
    };
  }
}

function collectArtifacts(
  root: string,
  directory: string,
  artifacts: WorkspaceArtifact[],
  depth: number,
  warnings: string[],
): void {
  if (depth > 4 || artifacts.length >= MAX_ARTIFACTS) {
    return;
  }

  let entries: string[];
  try {
    entries = readdirSync(directory).sort();
  } catch {
    warnings.push(`Could not read artifact directory: ${relative(root, directory) || ".ghost"}`);
    return;
  }

  for (const entry of entries) {
    if (artifacts.length >= MAX_ARTIFACTS) {
      return;
    }

    const path = join(directory, entry);
    let stats;
    try {
      stats = lstatSync(path);
    } catch {
      continue;
    }

    const artifact: WorkspaceArtifact = {
      path: relative(root, path) || ".",
      kind: stats.isDirectory() && !stats.isSymbolicLink() ? "directory" : "file",
    };
    artifacts.push(artifact);

    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      collectArtifacts(root, path, artifacts, depth + 1, warnings);
    }
  }
}

function safeIsDirectory(path: string, warnings: string[], label: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not inspect ${label}: ${message}`);
    return false;
  }
}

function safeDetectBobStatus(
  command: string | undefined,
  warnings: string[],
): GhostBobStatus {
  try {
    return detectBobStatus({ command });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Could not check IBM Bob status: ${message}`);
    return createFallbackBobStatus(command);
  }
}

function createFallbackBobStatus(command = DEFAULT_BOB_COMMAND): GhostBobStatus {
  const commandSource: GhostBobCommandSource = command === DEFAULT_BOB_COMMAND ? "default" : "cli";

  return {
    command,
    commandSource,
    executableAvailable: false,
    appearsCallable: false,
    exitCode: null,
    stdout: "",
    stderr: "",
    error: "Bob status check failed before execution.",
    nodeVersion: process.versions.node,
    minimumNodeVersion: BOB_NODE_MINIMUM_VERSION,
    nodeMeetsMinimum: true,
    statusText: "Bob status is unavailable.",
  };
}
