import type { GhostBobStatus, GhostCommandResult } from "@ghost-engineer/shared";

export type WorkbenchView =
  | "overview"
  | "analyze"
  | "bob"
  | "explain"
  | "docs"
  | "tests"
  | "patch"
  | "reports"
  | "artifacts"
  | "activity";

export type ActivityLevel = "info" | "success" | "warning" | "error";

export interface ActivityEvent {
  id: number;
  level: ActivityLevel;
  message: string;
  createdAt: string;
}

export interface WorkspaceArtifact {
  path: string;
  kind: "file" | "directory";
}

export interface LoadedProjectContext {
  projectName?: string;
  projectType?: string;
  packageManager?: string;
  files?: number;
  riskCount?: number;
  analyzedAt?: string;
}

export interface WorkbenchSnapshot {
  cwd: string;
  nodeVersion: string;
  workspaceExists: boolean;
  project?: LoadedProjectContext;
  bobStatus: GhostBobStatus;
  recommendations: string[];
  artifacts: WorkspaceArtifact[];
}

export interface AnalyzeActionResult {
  summary: string;
  commandResult?: GhostCommandResult;
}

export interface WorkbenchServices {
  loadSnapshot: () => WorkbenchSnapshot;
  analyzeLocal: () => AnalyzeActionResult;
  analyzeWithBob: () => AnalyzeActionResult;
  setupBob: (install?: boolean) => string;
  explainSystem: () => string;
  generateDocs: () => string;
  generateTests: () => string;
  generatePatchPlan: (goal: string) => string;
  generateReport: () => string;
}
