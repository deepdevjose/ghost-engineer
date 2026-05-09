export type GhostSeverity = "info" | "low" | "medium" | "high";

export type DependencyScope =
  | "production"
  | "development"
  | "peer"
  | "optional";

export interface GhostTotals {
  files: number;
  directories: number;
  bytes: number;
  packageManifests: number;
}

export interface GhostLanguageStat {
  language: string;
  extensions: string[];
  files: number;
  bytes: number;
}

export interface GhostFrameworkSignal {
  name: string;
  confidence: "low" | "medium" | "high";
  evidence: string[];
}

export interface GhostPackageManifest {
  path: string;
  name: string;
  version?: string;
  private?: boolean;
  scripts: Record<string, string>;
  workspaces: string[];
}

export interface GhostDependency {
  name: string;
  version: string;
  scope: DependencyScope;
  manifestPath: string;
}

export interface GhostEntryPoint {
  kind: "bin" | "main" | "module" | "types" | "source" | "script";
  path: string;
  source: string;
}

export interface GhostDirectorySummary {
  path: string;
  files: number;
  directories: number;
}

export interface GhostRiskFinding {
  id: string;
  severity: GhostSeverity;
  title: string;
  description: string;
  evidence: string[];
  recommendation: string;
}

export type GhostBobTask =
  | "architecture"
  | "docs"
  | "file"
  | "patch"
  | "report"
  | "risks"
  | "tests";

export interface GhostBobOptions {
  task: GhostBobTask;
  command?: string;
  model?: string;
  maxCoins?: number;
  trust?: boolean;
  acceptLicense?: boolean;
  goal?: string;
  context?: string;
}

export interface GhostBobRunResult {
  task: GhostBobTask;
  command: string;
  args: string[];
  promptPath: string;
  responsePath: string;
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface GhostProject {
  rootPath: string;
  projectName: string;
  analyzedAt: string;
  packageManager: string;
  projectType: string;
  totals: GhostTotals;
  languages: GhostLanguageStat[];
  frameworks: GhostFrameworkSignal[];
  packageManifests: GhostPackageManifest[];
  dependencies: GhostDependency[];
  entryPoints: GhostEntryPoint[];
  scripts: Record<string, string[]>;
  directories: GhostDirectorySummary[];
  riskFindings: GhostRiskFinding[];
}

export interface GhostFileInsight {
  path: string;
  language: string;
  bytes: number;
  lines: number;
  imports: string[];
  exports: string[];
  declarations: string[];
  notes: string[];
}

export interface GhostArtifactSet {
  workspacePath: string;
  architecturePath: string;
  dependencyMapPath: string;
  bobAnalysisPath: string;
  bobDirectoryPath: string;
  onboardingDocsPath: string;
  reportPath: string;
  dashboardPath: string;
}

export interface GhostCommandResult {
  summary: string;
  project: GhostProject;
  artifacts: GhostArtifactSet;
}
