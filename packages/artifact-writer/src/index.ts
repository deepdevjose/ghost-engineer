import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type {
  GhostArtifactSet,
  GhostBobOptions,
  GhostBobRunResult,
  GhostFileInsight,
  GhostProject,
  GhostRiskFinding,
} from "@ghost-engineer/shared";

export function writeGhostWorkspace(project: GhostProject): GhostArtifactSet {
  const workspacePath = join(project.rootPath, ".ghost");
  const bobDirectoryPath = join(workspacePath, "bob");
  const docsPath = join(workspacePath, "docs");
  const reportsPath = join(workspacePath, "reports");
  const dashboardDirectory = join(workspacePath, "dashboard");

  for (const directory of [
    workspacePath,
    bobDirectoryPath,
    docsPath,
    reportsPath,
    join(workspacePath, "patches"),
    dashboardDirectory,
  ]) {
    mkdirSync(directory, { recursive: true });
  }

  const artifacts: GhostArtifactSet = {
    workspacePath,
    architecturePath: join(workspacePath, "architecture.json"),
    dependencyMapPath: join(workspacePath, "dependency-map.json"),
    projectSummaryPath: join(workspacePath, "project-summary.md"),
    bobAnalysisPath: join(workspacePath, "bob-analysis.md"),
    bobDirectoryPath,
    initialAnalysisPath: join(reportsPath, "initial-analysis.md"),
    onboardingDocsPath: join(docsPath, "onboarding.md"),
    reportPath: join(reportsPath, "final-report.md"),
    dashboardPath: join(dashboardDirectory, "index.html"),
  };

  writeJson(artifacts.architecturePath, {
    projectName: project.projectName,
    projectType: project.projectType,
    analyzedAt: project.analyzedAt,
    packageManager: project.packageManager,
    totals: project.totals,
    languages: project.languages,
    frameworks: project.frameworks,
    entryPoints: project.entryPoints,
    directories: project.directories,
    risks: project.riskFindings,
  });
  writeJson(artifacts.dependencyMapPath, {
    projectName: project.projectName,
    packageManifests: project.packageManifests,
    dependencies: project.dependencies,
    scripts: project.scripts,
  });
  writeFileSync(artifacts.projectSummaryPath, renderProjectSummary(project));
  writeFileSync(artifacts.bobAnalysisPath, renderBobAnalysis(project));
  writeFileSync(artifacts.initialAnalysisPath, renderInitialAnalysis(project));
  writeFileSync(artifacts.onboardingDocsPath, renderOnboardingDocs(project));
  writeFileSync(artifacts.reportPath, renderFinalReport(project));
  writeFileSync(artifacts.dashboardPath, renderDashboard(project));

  return artifacts;
}

export function writeOnboardingDocs(project: GhostProject): string {
  const path = join(project.rootPath, ".ghost", "docs", "onboarding.md");
  mkdirSync(join(project.rootPath, ".ghost", "docs"), { recursive: true });
  writeFileSync(path, renderOnboardingDocs(project));
  return path;
}

export function writeFinalReport(project: GhostProject): string {
  const path = join(project.rootPath, ".ghost", "reports", "final-report.md");
  mkdirSync(join(project.rootPath, ".ghost", "reports"), { recursive: true });
  writeFileSync(path, renderFinalReport(project));
  return path;
}

export function writePatchPlan(project: GhostProject, goal: string): string {
  const path = join(project.rootPath, ".ghost", "patches", "patch-plan.md");
  mkdirSync(join(project.rootPath, ".ghost", "patches"), { recursive: true });
  writeFileSync(path, renderPatchPlan(project, goal));
  return path;
}

export function writeTestPlan(project: GhostProject): string {
  const path = join(project.rootPath, ".ghost", "docs", "test-plan.md");
  mkdirSync(join(project.rootPath, ".ghost", "docs"), { recursive: true });
  writeFileSync(path, renderTestPlan(project));
  return path;
}

export function writeDashboard(project: GhostProject): string {
  const path = join(project.rootPath, ".ghost", "dashboard", "index.html");
  mkdirSync(join(project.rootPath, ".ghost", "dashboard"), { recursive: true });
  writeFileSync(path, renderDashboard(project));
  return path;
}

export function writeBobPrompt(
  project: GhostProject,
  options: GhostBobOptions,
  prompt: string,
): string {
  const path = join(project.rootPath, ".ghost", "bob", `${options.task}-prompt.md`);
  mkdirSync(join(project.rootPath, ".ghost", "bob"), { recursive: true });
  writeFileSync(path, prompt);
  return path;
}

export function writeBobResponse(
  project: GhostProject,
  result: GhostBobRunResult,
): string {
  const path = join(project.rootPath, ".ghost", "bob", `${result.task}-response.md`);
  mkdirSync(join(project.rootPath, ".ghost", "bob"), { recursive: true });
  writeFileSync(path, renderBobResponse(result));
  return path;
}

export function formatInitialSummary(
  project: GhostProject,
  artifacts?: GhostArtifactSet,
): string {
  const lines = [
    `Ghost Engineer analyzed ${project.projectName}`,
    `Type: ${project.projectType}`,
    `Package manager: ${project.packageManager}`,
    `Files: ${project.totals.files}`,
    `Languages: ${project.languages
      .slice(0, 4)
      .map((language) => `${language.language} (${language.files})`)
      .join(", ")}`,
    `Risk findings: ${project.riskFindings.length}`,
  ];

  if (artifacts) {
    lines.push(`Workspace: ${displayPath(project, artifacts.workspacePath)}`);
    lines.push(`Project summary: ${displayPath(project, artifacts.projectSummaryPath)}`);
    lines.push(`Initial analysis: ${displayPath(project, artifacts.initialAnalysisPath)}`);
    lines.push(`Report: ${displayPath(project, artifacts.reportPath)}`);
  }

  return lines.join("\n");
}

export function formatSystemExplanation(project: GhostProject): string {
  const frameworks = project.frameworks.length
    ? project.frameworks.map((framework) => framework.name).join(", ")
    : "No framework signals detected";
  const entryPoints = project.entryPoints
    .slice(0, 8)
    .map((entryPoint) => `- ${entryPoint.kind}: ${entryPoint.path} (${entryPoint.source})`)
    .join("\n");
  const risks = project.riskFindings
    .slice(0, 5)
    .map((risk) => `- ${risk.severity}: ${risk.title}`)
    .join("\n");

  return [
    `# ${project.projectName}`,
    "",
    `${project.projectName} looks like a ${project.projectType}.`,
    "",
    `Framework signals: ${frameworks}.`,
    "",
    "## Entry Points",
    entryPoints || "- No entry points detected.",
    "",
    "## Main Risks",
    risks || "- No risks detected.",
  ].join("\n");
}

export function formatFileExplanation(file: GhostFileInsight): string {
  return [
    `# ${file.path}`,
    "",
    `Language: ${file.language}`,
    `Size: ${file.bytes} bytes`,
    `Lines: ${file.lines}`,
    "",
    "## Imports",
    formatList(file.imports, "No imports detected."),
    "",
    "## Exports",
    formatList(file.exports, "No exports detected."),
    "",
    "## Declarations",
    formatList(file.declarations, "No declarations detected."),
    "",
    "## Notes",
    formatList(file.notes, "No notable issues detected."),
  ].join("\n");
}

export function formatArtifactPath(rootPath: string, artifactPath: string): string {
  return relative(rootPath, artifactPath) || ".";
}

export function formatBobRunSummary(
  project: GhostProject,
  result: GhostBobRunResult,
): string {
  const status = result.success ? "completed" : "failed";
  const lines = [
    `Bob ${result.task} run ${status}`,
    `Prompt: ${formatArtifactPath(project.rootPath, result.promptPath)}`,
    `Response: ${formatArtifactPath(project.rootPath, result.responsePath)}`,
  ];

  if (!result.success) {
    lines.push(`Exit code: ${result.exitCode ?? "unknown"}`);
    lines.push(`Error: ${formatBobError(result)}`);
    lines.push("Deterministic Ghost artifacts were written before Bob ran.");
  }

  return lines.join("\n");
}

function renderProjectSummary(project: GhostProject): string {
  return [
    `# Project Summary: ${project.projectName}`,
    "",
    `Generated: ${project.analyzedAt}`,
    "",
    "## Classification",
    "",
    `- Type: ${project.projectType}`,
    `- Package manager: ${project.packageManager}`,
    `- Files: ${project.totals.files}`,
    `- Directories: ${project.totals.directories}`,
    `- Package manifests: ${project.totals.packageManifests}`,
    "",
    "## Main Architecture Signals",
    "",
    formatFrameworkSignals(project),
    "",
    "## Primary Entry Points",
    "",
    project.entryPoints.length > 0
      ? project.entryPoints
          .slice(0, 8)
          .map(
            (entryPoint) =>
              `- ${entryPoint.kind}: ${entryPoint.path} (${entryPoint.source})`,
          )
          .join("\n")
      : "- No entry points detected.",
    "",
    "## Highest Priority Risks",
    "",
    formatRisks(project.riskFindings.slice(0, 5)),
  ].join("\n");
}

function renderBobAnalysis(project: GhostProject): string {
  return [
    `# Bob Analysis Seed: ${project.projectName}`,
    "",
    "This artifact is the local repository intelligence seed used by the IBM Bob CLI adapter.",
    "",
    "## System Snapshot",
    "",
    `- Project type: ${project.projectType}`,
    `- Package manager: ${project.packageManager}`,
    `- Files scanned: ${project.totals.files}`,
    `- Package manifests: ${project.totals.packageManifests}`,
    "",
    "## Reasoning Context",
    "",
    "Ghost Engineer reconstructs local structure, entry points, dependency signals, and risk findings before Bob is asked to reason over the repository.",
    "The deterministic context is stored in `.ghost/architecture.json`, `.ghost/dependency-map.json`, `.ghost/project-summary.md`, and `.ghost/reports/initial-analysis.md`.",
    "Run `ghost setup bob` to connect IBM Bob Shell, then run commands with `--bob` to write prompt and response files under `.ghost/bob/`.",
    "",
    "## Highest Priority Findings",
    "",
    formatRisks(project.riskFindings.slice(0, 5)),
  ].join("\n");
}

function renderInitialAnalysis(project: GhostProject): string {
  return [
    `# Initial Analysis: ${project.projectName}`,
    "",
    `Generated: ${project.analyzedAt}`,
    "",
    "## Repository Scan",
    "",
    `Ghost Engineer scanned ${project.totals.files} files across ${project.totals.directories} directories while ignoring generated, dependency, cache, vendor, and previous \`.ghost/\` workspace directories.`,
    "",
    "## Languages",
    "",
    formatLanguageTable(project),
    "",
    "## Package Manifests",
    "",
    project.packageManifests.length > 0
      ? project.packageManifests
          .map(
            (manifest) =>
              `- ${manifest.name} (${manifest.path})${manifest.version ? ` v${manifest.version}` : ""}`,
          )
          .join("\n")
      : "- No package manifests detected.",
    "",
    "## Scripts",
    "",
    formatScriptCommands(project),
    "",
    "## Dependencies",
    "",
    formatDependencySummary(project),
    "",
    "## Framework Signals",
    "",
    formatFrameworkSignals(project),
    "",
    "## Entry Points",
    "",
    formatEntryPoints(project),
    "",
    "## Risks",
    "",
    formatRisks(project.riskFindings),
  ].join("\n");
}

function renderBobResponse(result: GhostBobRunResult): string {
  return [
    `# Bob Response: ${result.task}`,
    "",
    `Command: ${result.command} ${result.args.join(" ")}`,
    `Success: ${result.success ? "yes" : "no"}`,
    `Exit code: ${result.exitCode ?? "unknown"}`,
    "",
    "## Output",
    "",
    result.stdout.trim() || "_No stdout returned._",
    "",
    "## Error Output",
    "",
    result.stderr.trim() || "_No stderr returned._",
    result.error ? ["", "## Error", "", result.error].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderOnboardingDocs(project: GhostProject): string {
  return [
    `# ${project.projectName} Onboarding`,
    "",
    "## What This Repository Is",
    "",
    `${project.projectName} appears to be a ${project.projectType}.`,
    "",
    "## Quick Commands",
    "",
    formatScriptCommands(project),
    "",
    "## Entry Points",
    "",
    formatEntryPoints(project),
    "",
    "## Languages",
    "",
    formatLanguageTable(project),
    "",
    "## Risk Notes",
    "",
    formatRisks(project.riskFindings),
  ].join("\n");
}

function renderFinalReport(project: GhostProject): string {
  return [
    `# Ghost Engineer Report: ${project.projectName}`,
    "",
    `Generated: ${project.analyzedAt}`,
    "",
    "## Executive Summary",
    "",
    `${project.projectName} is classified as a ${project.projectType}. Ghost Engineer scanned ${project.totals.files} files across ${project.totals.directories} directories and found ${project.riskFindings.length} risk findings.`,
    "",
    "## Architecture Signals",
    "",
    formatFrameworkSignals(project),
    "",
    "## Dependency Overview",
    "",
    formatDependencySummary(project),
    "",
    "## Entry Points",
    "",
    formatEntryPoints(project),
    "",
    "## Risks And Recommendations",
    "",
    formatRisks(project.riskFindings),
    "",
    "## MVP Completion Notes",
    "",
    "- Local repository scanning is implemented.",
    "- Artifact generation is implemented.",
    "- IBM Bob CLI calls are isolated behind the adapter in `packages/core/src/bob.ts`.",
    "- Bob prompt and response artifacts are preserved under `.ghost/bob/` when `--bob` is used.",
    "- Patch generation currently produces a reviewable plan, not automatic code edits.",
  ].join("\n");
}

function renderPatchPlan(project: GhostProject, goal: string): string {
  return [
    `# Patch Plan: ${goal}`,
    "",
    `Repository: ${project.projectName}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Goal",
    "",
    goal,
    "",
    "## Suggested Work",
    "",
    ...suggestWorkFromGoal(project, goal).map((item) => `- ${item}`),
    "",
    "## Guardrails",
    "",
    "- Run the build before and after changes.",
    "- Add or update tests for changed behavior.",
    "- Keep generated `.ghost/` artifacts out of source commits unless intentionally publishing reports.",
  ].join("\n");
}

function renderTestPlan(project: GhostProject): string {
  return [
    `# Test Plan: ${project.projectName}`,
    "",
    "## Smoke Tests",
    "",
    "- Run `ghost analyze .` and confirm `.ghost/architecture.json` is written.",
    "- Run `ghost explain` and confirm it summarizes the repository.",
    "- Run `ghost explain <file>` and confirm it reports imports, exports, and declarations.",
    "",
    "## Package Tests",
    "",
    ...(project.packageManifests.length > 0
      ? project.packageManifests.map((manifest) => formatPackageTestAdvice(manifest))
      : ["- No package manifests detected; start with repository-level smoke tests."]),
    "",
    "## Risk-Driven Coverage",
    "",
    ...project.riskFindings.map(
      (risk) => `- ${risk.title}: ${risk.recommendation}`,
    ),
  ].join("\n");
}

function renderDashboard(project: GhostProject): string {
  const risks = project.riskFindings
    .map(
      (risk) =>
        `<li><strong>${escapeHtml(risk.severity)}</strong> ${escapeHtml(
          risk.title,
        )}<br><span>${escapeHtml(risk.recommendation)}</span></li>`,
    )
    .join("");
  const languages = project.languages
    .slice(0, 8)
    .map(
      (language) =>
        `<li>${escapeHtml(language.language)} <span>${language.files} files</span></li>`,
    )
    .join("");
  const entryPoints = project.entryPoints
    .slice(0, 10)
    .map(
      (entryPoint) =>
        `<li>${escapeHtml(entryPoint.kind)} <span>${escapeHtml(
          entryPoint.path,
        )}</span></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ghost Engineer Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f6f7f9;
      color: #17191c;
    }
    body { margin: 0; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; border-bottom: 1px solid #d9dde3; padding-bottom: 20px; }
    h1, h2 { margin: 0; letter-spacing: 0; }
    h1 { font-size: 32px; }
    h2 { font-size: 18px; margin-bottom: 12px; }
    p { color: #4b5563; margin: 8px 0 0; }
    section { padding: 24px 0; border-bottom: 1px solid #e3e6eb; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .metric, .panel { background: #ffffff; border: 1px solid #dfe3e8; border-radius: 8px; padding: 16px; }
    .metric strong { display: block; font-size: 28px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 8px 0; }
    span { color: #657183; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${escapeHtml(project.projectName)}</h1>
        <p>${escapeHtml(project.projectType)} · ${escapeHtml(project.packageManager)}</p>
      </div>
      <p>${escapeHtml(project.analyzedAt)}</p>
    </header>
    <section class="metrics">
      <div class="metric"><strong>${project.totals.files}</strong> files</div>
      <div class="metric"><strong>${project.totals.directories}</strong> directories</div>
      <div class="metric"><strong>${project.dependencies.length}</strong> dependencies</div>
      <div class="metric"><strong>${project.riskFindings.length}</strong> risk findings</div>
    </section>
    <section class="grid">
      <div class="panel"><h2>Languages</h2><ul>${languages}</ul></div>
      <div class="panel"><h2>Entry Points</h2><ul>${entryPoints}</ul></div>
    </section>
    <section>
      <h2>Risks</h2>
      <ul>${risks || "<li>No risks detected.</li>"}</ul>
    </section>
  </main>
</body>
</html>`;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function displayPath(project: GhostProject, path: string): string {
  return formatArtifactPath(project.rootPath, path);
}

function formatList(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `- ${fallback}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function formatScriptCommands(project: GhostProject): string {
  const scripts = Object.entries(project.scripts);
  if (scripts.length === 0) {
    return "- No package scripts detected.";
  }

  return scripts
    .map(([name, commands]) => {
      const commandList = commands.map((command) => `  - ${command}`).join("\n");
      return `- ${name}\n${commandList}`;
    })
    .join("\n");
}

function formatEntryPoints(project: GhostProject): string {
  if (project.entryPoints.length === 0) {
    return "- No entry points detected.";
  }

  return project.entryPoints
    .map((entryPoint) => `- ${entryPoint.kind}: ${entryPoint.path} (${entryPoint.source})`)
    .join("\n");
}

function formatLanguageTable(project: GhostProject): string {
  if (project.languages.length === 0) {
    return "No language data detected.";
  }

  return [
    "| Language | Files | Bytes |",
    "| --- | ---: | ---: |",
    ...project.languages.map(
      (language) => `| ${language.language} | ${language.files} | ${language.bytes} |`,
    ),
  ].join("\n");
}

function formatFrameworkSignals(project: GhostProject): string {
  if (project.frameworks.length === 0) {
    return "- No framework signals detected.";
  }

  return project.frameworks
    .map(
      (framework) =>
        `- ${framework.name} (${framework.confidence}): ${framework.evidence.join("; ")}`,
    )
    .join("\n");
}

function formatDependencySummary(project: GhostProject): string {
  if (project.dependencies.length === 0) {
    return "- No package dependencies detected.";
  }

  const byScope = project.dependencies.reduce<Record<string, number>>((summary, dependency) => {
    summary[dependency.scope] = (summary[dependency.scope] ?? 0) + 1;
    return summary;
  }, {});

  return Object.entries(byScope)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scope, count]) => `- ${scope}: ${count}`)
    .join("\n");
}

function formatRisks(risks: GhostRiskFinding[]): string {
  if (risks.length === 0) {
    return "- No risks detected.";
  }

  return risks
    .map(
      (risk) =>
        `- ${risk.severity}: ${risk.title}\n  - Evidence: ${risk.evidence.join("; ")}\n  - Recommendation: ${risk.recommendation}`,
    )
    .join("\n");
}

function suggestWorkFromGoal(project: GhostProject, goal: string): string[] {
  const normalizedGoal = goal.toLowerCase();
  const suggestions: string[] = [];

  if (
    normalizedGoal.includes("test") ||
    project.riskFindings.some((risk) => risk.id.includes("test"))
  ) {
    suggestions.push("Add or extend focused coverage for changed analyzer, writer, core orchestration, and CLI command behavior.");
  }

  if (
    normalizedGoal.includes("doc") ||
    project.riskFindings.some((risk) => risk.id === "thin-readme")
  ) {
    suggestions.push("Expand README usage docs with install, analyze, explain, docs, report, patch, testgen, and serve examples.");
  }

  if (normalizedGoal.includes("ai") || normalizedGoal.includes("bob")) {
    suggestions.push("Keep IBM Bob work behind the adapter boundary and feed it the generated architecture, dependency, summary, and risk context.");
  }

  if (normalizedGoal.includes("performance") || normalizedGoal.includes("optimize")) {
    suggestions.push("Profile repository scanning on a large fixture and cache file stats inside `.ghost/`.");
  }

  suggestions.push(
    "Prioritize the highest severity risk findings before broad refactors.",
    `Keep changes aligned with the detected project type: ${project.projectType}.`,
  );

  return suggestions;
}

function formatPackageTestAdvice(
  manifest: GhostProject["packageManifests"][number],
): string {
  const testScript = manifest.scripts.test;
  if (!testScript) {
    return `- ${manifest.name}: add a package-level smoke test or document why repository-level coverage is enough.`;
  }

  if (/no tests yet|echo/i.test(testScript)) {
    return `- ${manifest.name}: replace the placeholder test script with real coverage.`;
  }

  return `- ${manifest.name}: keep \`${testScript}\` covering the package behavior that changes.`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBobError(result: GhostBobRunResult): string {
  return (
    result.error ||
    result.stderr.trim() ||
    result.stdout.trim() ||
    "Bob command did not return a successful exit status."
  );
}
