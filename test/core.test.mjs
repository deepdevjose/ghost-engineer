import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  analyzeRepository,
  detectBobStatus,
  explainRepository,
  formatBobActivationHint,
  generateDocumentation,
  generatePatchPlan,
  generateReport,
  generateTestPlan,
  runBobAnalysis,
} from "../packages/core/dist/index.js";

test("analyzeRepository writes core Ghost artifacts", () => {
  const root = createFixtureRepository("ghost-core-");
  const result = analyzeRepository(root);

  assert.match(result.summary, /Ghost Engineer analyzed core-fixture/);
  assert.ok(existsSync(join(root, ".ghost", "architecture.json")));
  assert.ok(existsSync(join(root, ".ghost", "project-summary.md")));
  assert.ok(existsSync(join(root, ".ghost", "reports", "initial-analysis.md")));
  assert.ok(existsSync(join(root, ".ghost", "reports", "final-report.md")));
});

test("documentation, testgen, and report commands regenerate their artifacts", () => {
  const root = createFixtureRepository("ghost-docs-");

  assert.match(generateDocumentation(root), /Documentation written/);
  assert.match(generateTestPlan(root), /Test plan written/);
  assert.match(generateReport(root), /Report written/);
  assert.ok(existsSync(join(root, ".ghost", "docs", "onboarding.md")));
  assert.ok(existsSync(join(root, ".ghost", "docs", "test-plan.md")));
  assert.ok(existsSync(join(root, ".ghost", "reports", "final-report.md")));
});

test("generatePatchPlan writes a goal-specific patch plan", () => {
  const root = createFixtureRepository("ghost-patch-");
  const output = generatePatchPlan(root, "improve tests");
  const patchPlan = readFileSync(join(root, ".ghost", "patches", "patch-plan.md"), "utf8");

  assert.match(output, /Patch plan written/);
  assert.match(patchPlan, /improve tests/);
});

test("runBobAnalysis stores prompt and response from a Bob-compatible command", () => {
  const root = createFixtureRepository("ghost-bob-");
  const fakeBob = createFakeBob(root);

  const output = runBobAnalysis(root, {
    task: "architecture",
    command: fakeBob,
  });

  assert.match(output, /Bob architecture run completed/);
  assert.ok(existsSync(join(root, ".ghost", "bob", "architecture-prompt.md")));
  assert.match(
    readFileSync(join(root, ".ghost", "bob", "architecture-prompt.md"), "utf8"),
    /project-summary\.md/,
  );
  assert.match(
    readFileSync(join(root, ".ghost", "bob", "architecture-response.md"), "utf8"),
    /fake bob received/,
  );
});

test("detectBobStatus reports when Bob is unavailable", () => {
  const root = createFixtureRepository("ghost-bob-status-");
  const status = detectBobStatus({ command: join(root, "missing-bob") });

  assert.equal(status.executableAvailable, false);
  assert.equal(status.appearsCallable, false);
  assert.match(formatBobActivationHint(status), /ghost setup bob/);
});

test("detectBobStatus reports a callable Bob-compatible command", () => {
  const root = createFixtureRepository("ghost-bob-status-ok-");
  const fakeBob = createFakeBob(root);
  const status = detectBobStatus({ command: fakeBob });

  assert.equal(status.executableAvailable, true);
  assert.equal(status.appearsCallable, true);
  assert.equal(status.command, fakeBob);
});

test("Bob failures preserve deterministic artifacts and guide setup", () => {
  const root = createFixtureRepository("ghost-bob-fail-");

  assert.throws(
    () =>
      runBobAnalysis(root, {
        task: "architecture",
        command: join(root, "missing-bob"),
      }),
    /ghost setup bob/,
  );
  assert.ok(existsSync(join(root, ".ghost", "architecture.json")));
});

test("explainRepository can add Bob reasoning for a file", () => {
  const root = createFixtureRepository("ghost-file-bob-");
  const fakeBob = createFakeBob(root);

  const output = explainRepository(root, "src/index.ts", {
    task: "file",
    command: fakeBob,
  });

  assert.match(output, /# src\/index.ts/);
  assert.match(output, /Bob file run completed/);
  assert.ok(existsSync(join(root, ".ghost", "bob", "file-response.md")));
});

function createFixtureRepository(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "core-fixture",
        scripts: { build: "tsc -p tsconfig.json", test: "node --test" },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(root, "src", "index.ts"), "export function main() { return true; }\n");
  return root;
}

function createFakeBob(root) {
  const fakeBob = join(root, "fake-bob.mjs");
  writeFileSync(
    fakeBob,
    [
      "#!/usr/bin/env node",
      "let input = '';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', (chunk) => { input += chunk; });",
      "process.stdin.on('end', () => {",
      "  console.log(`fake bob received ${input.length} chars`);",
      "});",
      "",
    ].join("\n"),
  );
  chmodSync(fakeBob, 0o755);
  return fakeBob;
}
