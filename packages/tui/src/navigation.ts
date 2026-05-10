import type { WorkbenchView } from "./types.js";

export interface NavigationItem {
  view: WorkbenchView;
  label: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { view: "overview", label: "Overview" },
  { view: "analyze", label: "Analyze" },
  { view: "bob", label: "Bob" },
  { view: "explain", label: "Explain" },
  { view: "docs", label: "Docs" },
  { view: "tests", label: "Tests" },
  { view: "patch", label: "Patch Plan" },
  { view: "reports", label: "Reports" },
  { view: "artifacts", label: "Artifacts" },
  { view: "activity", label: "Activity" },
];

export function moveSelection(currentIndex: number, direction: -1 | 1): number {
  const lastIndex = NAVIGATION_ITEMS.length - 1;
  if (currentIndex + direction < 0) {
    return lastIndex;
  }

  if (currentIndex + direction > lastIndex) {
    return 0;
  }

  return currentIndex + direction;
}

export function viewAt(index: number): WorkbenchView {
  return NAVIGATION_ITEMS[Math.max(0, Math.min(index, NAVIGATION_ITEMS.length - 1))].view;
}

export function indexForView(view: WorkbenchView): number {
  return Math.max(0, NAVIGATION_ITEMS.findIndex((item) => item.view === view));
}
