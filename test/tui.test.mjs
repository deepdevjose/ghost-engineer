import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { analyzeRepository } from "../packages/core/dist/index.js";
import {
  actionForView,
  CLEAR_SCREEN,
  ENTER_ALTERNATE_SCREEN,
  EXIT_ALTERNATE_SCREEN,
  createErrorSnapshot,
  clearInteractiveScreen,
  enterInteractiveScreen,
  loadWorkbenchSnapshot,
  moveSelection,
  renderWelcomeText,
  runWorkbench,
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

test("snapshot loading survives corrupt project context", () => {
  const root = createFixtureRepository("ghost-tui-corrupt-");
  mkdirSync(join(root, ".ghost"), { recursive: true });
  writeFileSync(join(root, ".ghost", "architecture.json"), "{ definitely not json");

  const snapshot = loadWorkbenchSnapshot({
    cwd: root,
    bobCommand: join(root, "missing-bob"),
  });

  assert.equal(snapshot.workspaceExists, true);
  assert.equal(snapshot.project?.projectName, root.split("/").at(-1));
  assert.match(snapshot.warnings.join("\n"), /Could not read \.ghost\/architecture\.json/);
});

test("artifact loading handles broken symlinks and truncates large trees", () => {
  const root = createFixtureRepository("ghost-tui-artifacts-");
  const ghost = join(root, ".ghost");
  mkdirSync(ghost, { recursive: true });
  for (let index = 0; index < 220; index += 1) {
    writeFileSync(join(ghost, `artifact-${index}.txt`), "ok\n");
  }
  symlinkSync(join(root, "missing-target"), join(ghost, "broken-link"));

  const snapshot = loadWorkbenchSnapshot({
    cwd: root,
    bobCommand: join(root, "missing-bob"),
  });

  assert.equal(snapshot.workspaceExists, true);
  assert.ok(snapshot.artifacts.length <= 200);
  assert.match(snapshot.warnings.join("\n"), /Artifact tree truncated/);
});

test("static workbench uses a controlled fallback when snapshot loading fails", () => {
  let output = "";
  runWorkbench({
    stdout: {
      isTTY: false,
      write(value) {
        output += String(value);
        return true;
      },
    },
    stdin: { isTTY: false },
    services: {
      ...createMockServices([]),
      loadSnapshot: () => {
        throw new Error("snapshot boom");
      },
    },
  });

  assert.match(output, /Workbench startup failed: snapshot boom/);
  assert.match(output, /Resolve the startup error/);
  assert.doesNotMatch(output, /\u001b\[/);
});

test("welcome rendering exposes professional startup context", () => {
  const snapshot = createErrorSnapshot(new Error("startup failed"), "/tmp/example");
  const welcome = renderWelcomeText(snapshot);

  assert.match(welcome, /Welcome to/);
  assert.match(welcome, /GHOST ENGINEER WORKBENCH/);
  assert.match(welcome, /Version 0\.1\.0/);
  assert.match(welcome, /Helpful keys/);
});

test("interactive screen helpers clear and restore terminal state", () => {
  const writes = [];
  const terminal = {
    write(value) {
      writes.push(String(value));
      return true;
    },
  };

  clearInteractiveScreen(terminal);
  const restore = enterInteractiveScreen(terminal);
  restore();
  restore();

  assert.equal(writes[0], CLEAR_SCREEN);
  assert.match(writes[1], new RegExp(escapeRegExp(ENTER_ALTERNATE_SCREEN)));
  assert.match(writes[1], new RegExp(escapeRegExp(CLEAR_SCREEN)));
  assert.match(writes[2], new RegExp(escapeRegExp(EXIT_ALTERNATE_SCREEN)));
  assert.equal(writes.length, 3);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
