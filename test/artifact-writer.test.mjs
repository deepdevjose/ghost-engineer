import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRepositoryAnalysis } from "../packages/analyzers/dist/index.js";
import { writeGhostWorkspace } from "../packages/artifact-writer/dist/index.js";

test("writeGhostWorkspace creates the expected artifact tree", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-writer-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "writer-fixture", scripts: { test: "node --test" } }),
  );
  writeFileSync(join(root, "src", "index.js"), "export const ok = true;\n");

  const project = createRepositoryAnalysis(root);
  const artifacts = writeGhostWorkspace(project);

  assert.ok(existsSync(artifacts.architecturePath));
  assert.ok(existsSync(artifacts.dependencyMapPath));
  assert.ok(existsSync(artifacts.projectSummaryPath));
  assert.ok(existsSync(artifacts.bobAnalysisPath));
  assert.ok(existsSync(artifacts.initialAnalysisPath));
  assert.ok(existsSync(artifacts.reportPath));
  assert.ok(existsSync(artifacts.dashboardPath));
  assert.match(readFileSync(artifacts.projectSummaryPath, "utf8"), /Project Summary/);
  assert.match(readFileSync(artifacts.initialAnalysisPath, "utf8"), /Initial Analysis/);
  assert.match(readFileSync(artifacts.reportPath, "utf8"), /Ghost Engineer Report/);
});
