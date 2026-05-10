import {
  createRepositoryAnalysis,
  inspectFile,
} from "@ghost-engineer/analyzers";
import {
  formatBobRunSummary,
  formatArtifactPath,
  formatFileExplanation,
  formatInitialSummary,
  formatSystemExplanation,
  writeDashboard,
  writeFinalReport,
  writeGhostWorkspace,
  writeOnboardingDocs,
  writePatchPlan,
  writeTestPlan,
} from "@ghost-engineer/artifact-writer";
import type {
  GhostBobOptions,
  GhostCommandResult,
  GhostProject,
} from "@ghost-engineer/shared";
import { runBob } from "./bob.js";
import {
  detectBobStatus,
  formatBobRequiredMessage,
} from "./bob-status.js";

export {
  BOB_NODE_MINIMUM_VERSION,
  BOB_SHELL_INSTALL_COMMAND,
  DEFAULT_BOB_COMMAND,
  detectBobStatus,
  formatBobActivationHint,
  formatBobRequiredMessage,
  formatBobSetupGuide,
  setupBob,
} from "./bob-status.js";
export {
  createUserPrefixEnvironment,
  detectNpmGlobalStatus,
  formatPathSetupInstructions,
} from "./npm-global.js";

export function initializeGhost(rootPath: string): string {
  return analyzeRepository(rootPath).summary;
}

export function analyzeRepository(
  rootPath: string,
  bobOptions?: GhostBobOptions,
): GhostCommandResult {
  const project = createRepositoryAnalysis(rootPath);
  const artifacts = writeGhostWorkspace(project);
  const bobResult = bobOptions ? runBobOrThrow(project, bobOptions) : undefined;
  const summary = [
    formatInitialSummary(project, artifacts),
    bobResult ? formatBobRunSummary(project, bobResult) : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    project,
    artifacts,
    summary,
  };
}

export function explainRepository(
  rootPath: string,
  targetPath?: string,
  bobOptions?: GhostBobOptions,
): string {
  if (targetPath) {
    const fileExplanation = formatFileExplanation(inspectFile(rootPath, targetPath));
    if (!bobOptions) {
      return fileExplanation;
    }

    const project = createRepositoryAnalysis(rootPath);
    writeGhostWorkspace(project);
    const bobResult = runBobOrThrow(project, {
      ...bobOptions,
      task: "file",
      goal: `Explain ${targetPath}`,
      context: fileExplanation,
    });

    return [fileExplanation, formatBobRunSummary(project, bobResult)].join("\n");
  }

  const { project } = analyzeRepository(rootPath);
  const systemExplanation = formatSystemExplanation(project);
  if (!bobOptions) {
    return systemExplanation;
  }

  const bobResult = runBobOrThrow(project, bobOptions);
  return [systemExplanation, formatBobRunSummary(project, bobResult)].join("\n");
}

export function generateDocumentation(
  rootPath: string,
  bobOptions?: GhostBobOptions,
): string {
  const project = createRepositoryAnalysis(rootPath);
  writeGhostWorkspace(project);
  const docsPath = writeOnboardingDocs(project);
  const bobResult = bobOptions ? runBobOrThrow(project, bobOptions) : undefined;

  return [
    `Documentation written to ${formatArtifactPath(project.rootPath, docsPath)}`,
    bobResult ? formatBobRunSummary(project, bobResult) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateReport(rootPath: string, bobOptions?: GhostBobOptions): string {
  const project = createRepositoryAnalysis(rootPath);
  writeGhostWorkspace(project);
  const reportPath = writeFinalReport(project);
  const bobResult = bobOptions ? runBobOrThrow(project, bobOptions) : undefined;

  return [
    `Report written to ${formatArtifactPath(project.rootPath, reportPath)}`,
    bobResult ? formatBobRunSummary(project, bobResult) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateTestPlan(rootPath: string, bobOptions?: GhostBobOptions): string {
  const project = createRepositoryAnalysis(rootPath);
  writeGhostWorkspace(project);
  const testPlanPath = writeTestPlan(project);
  const bobResult = bobOptions ? runBobOrThrow(project, bobOptions) : undefined;

  return [
    `Test plan written to ${formatArtifactPath(project.rootPath, testPlanPath)}`,
    bobResult ? formatBobRunSummary(project, bobResult) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generatePatchPlan(
  rootPath: string,
  goal: string,
  bobOptions?: GhostBobOptions,
): string {
  const project = createRepositoryAnalysis(rootPath);
  writeGhostWorkspace(project);
  const patchPath = writePatchPlan(project, goal);
  const bobResult = bobOptions
    ? runBobOrThrow(project, { ...bobOptions, goal })
    : undefined;

  return [
    `Patch plan written to ${formatArtifactPath(project.rootPath, patchPath)}`,
    bobResult ? formatBobRunSummary(project, bobResult) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function runBobAnalysis(rootPath: string, options: GhostBobOptions): string {
  const project = createRepositoryAnalysis(rootPath);
  writeGhostWorkspace(project);
  const bobResult = runBobOrThrow(project, options);

  return formatBobRunSummary(project, bobResult);
}

export function prepareDashboard(rootPath: string): {
  project: GhostProject;
  dashboardPath: string;
} {
  const project = createRepositoryAnalysis(rootPath);
  writeGhostWorkspace(project);
  const dashboardPath = writeDashboard(project);

  return { project, dashboardPath };
}

function runBobOrThrow(project: GhostProject, options: GhostBobOptions) {
  const bobStatus = detectBobStatus({ command: options.command });
  if (!bobStatus.executableAvailable || !bobStatus.appearsCallable) {
    throw new Error(formatBobRequiredMessage(bobStatus));
  }

  const result = runBob(project, options);

  if (!result.success) {
    throw new Error(formatBobRunSummary(project, result));
  }

  return result;
}
