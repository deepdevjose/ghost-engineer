import { createInitialAnalysis } from "@ghost-engineer/analyzers";
import { formatInitialSummary } from "@ghost-engineer/artifact-writer";

export function initializeGhost(rootPath: string): string {
  const project = createInitialAnalysis(rootPath);
  return formatInitialSummary(project);
}
