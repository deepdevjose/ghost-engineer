import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import {
  analyzeRepository,
  detectBobStatus,
  explainRepository,
  generateDocumentation,
  generatePatchPlan,
  generateReport,
  generateTestPlan,
  setupBob,
} from "@ghost-engineer/core";
import type { GhostBobStatus } from "@ghost-engineer/shared";
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
  const workspaceExists = existsSync(workspacePath) && statSync(workspacePath).isDirectory();
  const bobStatus = detectBobStatus({ command: options.bobCommand });
  const project = workspaceExists ? loadProjectContext(cwd) : undefined;
  const artifacts = workspaceExists ? loadArtifactTree(cwd) : [];

  return {
    cwd,
    nodeVersion: process.versions.node,
    workspaceExists,
    project,
    bobStatus,
    recommendations: deriveRecommendations(workspaceExists, bobStatus, project),
    artifacts,
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

export function loadArtifactTree(cwd: string): WorkspaceArtifact[] {
  const root = join(cwd, ".ghost");
  if (!existsSync(root)) {
    return [];
  }

  const artifacts: WorkspaceArtifact[] = [];
  collectArtifacts(root, root, artifacts, 0);
  return artifacts;
}

function loadProjectContext(cwd: string): LoadedProjectContext | undefined {
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
): void {
  if (depth > 4) {
    return;
  }

  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const stats = statSync(path);
    const artifact: WorkspaceArtifact = {
      path: relative(root, path) || ".",
      kind: stats.isDirectory() ? "directory" : "file",
    };
    artifacts.push(artifact);

    if (stats.isDirectory()) {
      collectArtifacts(root, path, artifacts, depth + 1);
    }
  }
}
