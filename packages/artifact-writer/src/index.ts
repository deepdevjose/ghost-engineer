import type { GhostProject } from "@ghost-engineer/shared";

export function formatInitialSummary(project: GhostProject): string {
  return `Ghost initialized for project at: ${project.rootPath}`;
}
