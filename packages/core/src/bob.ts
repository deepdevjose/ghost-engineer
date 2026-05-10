import { spawnSync } from "node:child_process";
import type {
  GhostBobOptions,
  GhostBobRunResult,
  GhostProject,
  GhostRiskFinding,
} from "@ghost-engineer/shared";
import {
  writeBobPrompt,
  writeBobResponse,
} from "@ghost-engineer/artifact-writer";

const DEFAULT_BOB_COMMAND = "bob";

export function runBob(project: GhostProject, options: GhostBobOptions): GhostBobRunResult {
  const command = options.command ?? process.env.GHOST_BOB_COMMAND ?? DEFAULT_BOB_COMMAND;
  const prompt = createBobPrompt(project, options);
  const promptPath = writeBobPrompt(project, options, prompt);
  const args = buildBobArgs(options);
  const response = spawnSync(command, args, {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  const result: GhostBobRunResult = {
    task: options.task,
    command,
    args,
    promptPath,
    responsePath: "",
    success: response.status === 0 && !response.error,
    exitCode: response.status,
    stdout: response.stdout ?? "",
    stderr: response.stderr ?? "",
    error: response.error?.message,
  };

  result.responsePath = writeBobResponse(project, result);
  return result;
}

export function createBobPrompt(
  project: GhostProject,
  options: GhostBobOptions,
): string {
  const goal = options.goal?.trim();

  return [
    "# Ghost Engineer Bob Request",
    "",
    `Task: ${options.task}`,
    goal ? `Goal: ${goal}` : "",
    "",
    "You are IBM Bob working inside Ghost Engineer.",
    "Use the deterministic repository intelligence below as source context before making higher-level inferences.",
    "Call out uncertainty when the local scan does not prove something.",
    "Do not claim you edited files unless explicitly asked by the user outside this prompt.",
    "",
    "## Expected Output",
    "",
    expectedOutputFor(options),
    options.context ? ["", "## Additional Context", "", options.context].join("\n") : "",
    "",
    "## Repository Snapshot",
    "",
    `Project: ${project.projectName}`,
    `Type: ${project.projectType}`,
    `Package manager: ${project.packageManager}`,
    `Files: ${project.totals.files}`,
    `Directories: ${project.totals.directories}`,
    "",
    "## Ghost Workspace Artifacts",
    "",
    "- .ghost/architecture.json",
    "- .ghost/dependency-map.json",
    "- .ghost/project-summary.md",
    "- .ghost/reports/initial-analysis.md",
    "- .ghost/reports/final-report.md",
    "",
    "## Languages",
    "",
    ...project.languages.map(
      (language) =>
        `- ${language.language}: ${language.files} files, ${language.bytes} bytes`,
    ),
    "",
    "## Framework Signals",
    "",
    ...formatSignals(project),
    "",
    "## Package Manifests",
    "",
    ...formatPackageManifests(project),
    "",
    "## Entry Points",
    "",
    ...project.entryPoints.map(
      (entryPoint) =>
        `- ${entryPoint.kind}: ${entryPoint.path} (${entryPoint.source})`,
    ),
    "",
    "## Scripts",
    "",
    ...formatScripts(project),
    "",
    "## Top-Level Directories",
    "",
    ...formatDirectories(project),
    "",
    "## Risks",
    "",
    ...formatRisks(project.riskFindings),
    "",
    "## Dependencies",
    "",
    ...project.dependencies
      .slice(0, 80)
      .map(
        (dependency) =>
          `- ${dependency.name}@${dependency.version} (${dependency.scope}, ${dependency.manifestPath})`,
      ),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildBobArgs(options: GhostBobOptions): string[] {
  const args = [
    "--chat-mode",
    "ask",
    "--hide-intermediary-output",
    "--output-format",
    "text",
  ];

  if (options.model) {
    args.push("--model", options.model);
  }

  if (options.maxCoins !== undefined) {
    args.push("--max-coins", String(options.maxCoins));
  }

  if (options.trust) {
    args.push("--trust");
  }

  if (options.acceptLicense) {
    args.push("--accept-license");
  }

  args.push(
    "--prompt",
    "Read the repository intelligence from stdin and answer the Ghost Engineer request.",
  );

  return args;
}

function expectedOutputFor(options: GhostBobOptions): string {
  switch (options.task) {
    case "architecture":
      return "Explain the architecture, main runtime flow, important modules, and evolution risks.";
    case "docs":
      return "Draft concise onboarding documentation and point out missing context.";
    case "file":
      return "Explain the requested file, its dependencies, exports, role in the system, and safe change notes.";
    case "patch":
      return "Create a safe patch strategy with files to inspect, implementation steps, tests, and rollback notes.";
    case "report":
      return "Write an executive engineering report with risks, priorities, and next actions.";
    case "risks":
      return "Rank the highest risks and recommend practical mitigations.";
    case "tests":
      return "Design a test plan with concrete test cases and the smallest valuable coverage first.";
  }
}

function formatSignals(project: GhostProject): string[] {
  if (project.frameworks.length === 0) {
    return ["- No framework signals detected."];
  }

  return project.frameworks.map(
    (framework) =>
      `- ${framework.name} (${framework.confidence}): ${framework.evidence.join("; ")}`,
  );
}

function formatScripts(project: GhostProject): string[] {
  const scripts = Object.entries(project.scripts);
  if (scripts.length === 0) {
    return ["- No scripts detected."];
  }

  return scripts.flatMap(([name, commands]) => [
    `- ${name}`,
    ...commands.map((command) => `  - ${command}`),
  ]);
}

function formatPackageManifests(project: GhostProject): string[] {
  if (project.packageManifests.length === 0) {
    return ["- No package manifests detected."];
  }

  return project.packageManifests.map((manifest) => {
    const version = manifest.version ? `@${manifest.version}` : "";
    const workspaceCount =
      manifest.workspaces.length > 0
        ? `; workspaces: ${manifest.workspaces.join(", ")}`
        : "";
    return `- ${manifest.name}${version} (${manifest.path}${workspaceCount})`;
  });
}

function formatDirectories(project: GhostProject): string[] {
  if (project.directories.length === 0) {
    return ["- No top-level directories detected."];
  }

  return project.directories
    .slice(0, 20)
    .map(
      (directory) =>
        `- ${directory.path}: ${directory.files} files, ${directory.directories} nested directories`,
    );
}

function formatRisks(risks: GhostRiskFinding[]): string[] {
  if (risks.length === 0) {
    return ["- No risks detected."];
  }

  return risks.flatMap((risk) => [
    `- ${risk.severity}: ${risk.title}`,
    `  - ${risk.description}`,
    `  - Recommendation: ${risk.recommendation}`,
  ]);
}
