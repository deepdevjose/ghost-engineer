import type { GhostProject } from "@ghost-engineer/shared";

export function createInitialAnalysis(rootPath: string): GhostProject {
  return { rootPath };
}
