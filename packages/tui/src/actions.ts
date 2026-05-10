import type { WorkbenchServices, WorkbenchView } from "./types.js";

export interface WorkbenchAction {
  label: string;
  refreshOnly?: boolean;
  run: () => string;
}

export function actionForView(
  view: WorkbenchView,
  services: WorkbenchServices,
): WorkbenchAction {
  switch (view) {
    case "overview":
      return {
        label: "Status refresh",
        refreshOnly: true,
        run: () => "Status refreshed",
      };
    case "analyze":
      return {
        label: "Local analysis",
        run: () => services.analyzeLocal().summary,
      };
    case "bob":
      return {
        label: "Bob setup guide",
        run: () => services.setupBob(false),
      };
    case "explain":
      return {
        label: "System explanation",
        run: () => services.explainSystem(),
      };
    case "docs":
      return {
        label: "Documentation generation",
        run: () => services.generateDocs(),
      };
    case "tests":
      return {
        label: "Test plan generation",
        run: () => services.generateTests(),
      };
    case "patch":
      return {
        label: "Patch plan generation",
        run: () => services.generatePatchPlan("prepare the repository for safe evolution"),
      };
    case "reports":
      return {
        label: "Report generation",
        run: () => services.generateReport(),
      };
    case "artifacts":
      return {
        label: "Artifact tree refresh",
        refreshOnly: true,
        run: () => "Artifact tree refreshed",
      };
    case "activity":
      return {
        label: "Activity viewed",
        refreshOnly: true,
        run: () => "Activity viewed",
      };
  }
}
