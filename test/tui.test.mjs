import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { analyzeRepository } from "../packages/core/dist/index.js";
import {
  actionForView,
  loadWorkbenchSnapshot,
  moveSelection,
  renderStaticWorkbench,
  shouldUseColor,
} from "../packages/tui/dist/index.js";

test("overview snapshot recommends analysis when .ghost is missing", () => {
  const root = createFixtureRepository("ghost-tui-missing-");
  const snapshot = loadWorkbenchSnapshot({
    cwd: root,
    bobCommand: join(root, "missing-bob"),
  });

  assert.equal(snapshot.workspaceExists, false);
  assert.equal(snapshot.project, undefined);
  assert.match(snapshot.recommendations.join("\n"), /Run local repository analysis/);
  assert.match(snapshot.recommendations.join("\n"), /Set up IBM Bob/);
});

test("overview snapshot loads project context when .ghost exists", () => {
  const root = createFixtureRepository("ghost-tui-ready-");
  analyzeRepository(root);

  const snapshot = loadWorkbenchSnapshot({
    cwd: root,
    bobCommand: join(root, "missing-bob"),
  });

  assert.equal(snapshot.workspaceExists, true);
  assert.equal(snapshot.project?.projectName, "tui-fixture");
  assert.equal(snapshot.project?.projectType, "Node.js package");
  assert.ok(snapshot.artifacts.some((artifact) => artifact.path === "architecture.json"));
});

test("static workbench renders Bob missing and detected states", () => {
  const root = createFixtureRepository("ghost-tui-bob-");
  const missing = renderStaticWorkbench(
    loadWorkbenchSnapshot({
      cwd: root,
      bobCommand: join(root, "missing-bob"),
    }),
  );
  assert.match(missing, /IBM Bob      setup needed/);

  const fakeBob = createFakeBob(root);
  const detected = renderStaticWorkbench(
    loadWorkbenchSnapshot({
      cwd: root,
      bobCommand: fakeBob,
    }),
  );
  assert.match(detected, /IBM Bob      ready/);
});

test("navigation wraps through sidebar items", () => {
  assert.equal(moveSelection(0, -1), 9);
  assert.equal(moveSelection(9, 1), 0);
  assert.equal(moveSelection(3, 1), 4);
  assert.equal(moveSelection(3, -1), 2);
});

test("TUI actions call injected services", () => {
  const calls = [];
  const services = createMockServices(calls);

  assert.equal(actionForView("analyze", services).run(), "local summary");
  assert.equal(actionForView("bob", services).run(), "setup false");
  assert.equal(actionForView("docs", services).run(), "docs generated");
  assert.equal(actionForView("patch", services).run(), "patch prepare the repository for safe evolution");

  assert.deepEqual(calls, [
    "analyzeLocal",
    "setupBob:false",
    "generateDocs",
    "generatePatchPlan:prepare the repository for safe evolution",
  ]);
});

test("static workbench and color controls remain readable without color", () => {
  const root = createFixtureRepository("ghost-tui-no-color-");
  const output = renderStaticWorkbench(
    loadWorkbenchSnapshot({
      cwd: root,
      bobCommand: join(root, "missing-bob"),
    }),
  );

  assert.match(output, /Ghost Engineer Workbench/);
  assert.match(output, /Recommended next actions/);
  assert.doesNotMatch(output, /\u001b\[/);
  assert.equal(shouldUseColor({ env: { NO_COLOR: "1" }, stream: { isTTY: true } }), false);
});

function createFixtureRepository(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "tui-fixture",
        scripts: { test: "node --test" },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(root, "src", "index.js"), "export const ok = true;\n");
  return root;
}

function createFakeBob(root) {
  const fakeBob = join(root, "fake-bob.mjs");
  writeFileSync(
    fakeBob,
    [
      "#!/usr/bin/env node",
      "if (process.argv.includes('--help')) {",
      "  console.log('Fake IBM Bob Shell');",
      "  process.exit(0);",
      "}",
      "console.log('Fake IBM Bob Shell');",
      "",
    ].join("\n"),
  );
  chmodSync(fakeBob, 0o755);
  return fakeBob;
}

function createMockServices(calls) {
  return {
    loadSnapshot: () => {
      throw new Error("not used");
    },
    analyzeLocal: () => {
      calls.push("analyzeLocal");
      return { summary: "local summary" };
    },
    analyzeWithBob: () => {
      calls.push("analyzeWithBob");
      return { summary: "bob summary" };
    },
    setupBob: (install = false) => {
      calls.push(`setupBob:${install}`);
      return `setup ${install}`;
    },
    explainSystem: () => {
      calls.push("explainSystem");
      return "explain";
    },
    generateDocs: () => {
      calls.push("generateDocs");
      return "docs generated";
    },
    generateTests: () => {
      calls.push("generateTests");
      return "tests generated";
    },
    generatePatchPlan: (goal) => {
      calls.push(`generatePatchPlan:${goal}`);
      return `patch ${goal}`;
    },
    generateReport: () => {
      calls.push("generateReport");
      return "report generated";
    },
  };
}
