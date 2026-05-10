import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

const cliPath = new URL("../apps/cli/dist/index.js", import.meta.url);

test("CLI analyze command writes a .ghost workspace", () => {
  const root = createFixtureRepository("ghost-cli-");

  const result = runCli(["analyze", "."], root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Ghost Engineer analyzed cli-fixture/);
  assert.ok(existsSync(join(root, ".ghost", "architecture.json")));
  assert.ok(existsSync(join(root, ".ghost", "project-summary.md")));
  assert.ok(existsSync(join(root, ".ghost", "reports", "initial-analysis.md")));
});

test("CLI command suite covers explain, docs, testgen, patch, and report", () => {
  const root = createFixtureRepository("ghost-cli-suite-");
  runCli(["analyze", "."], root);

  const explainSystem = runCli(["explain"], root);
  assert.equal(explainSystem.status, 0, explainSystem.stderr);
  assert.match(explainSystem.stdout, /looks like a/);

  const explainFile = runCli(["explain", "src/index.js"], root);
  assert.equal(explainFile.status, 0, explainFile.stderr);
  assert.match(explainFile.stdout, /# src\/index\.js/);
  assert.match(explainFile.stdout, /## Exports/);

  const docs = runCli(["docs"], root);
  assert.equal(docs.status, 0, docs.stderr);
  assert.match(docs.stdout, /Documentation written/);

  const testgen = runCli(["testgen"], root);
  assert.equal(testgen.status, 0, testgen.stderr);
  assert.match(testgen.stdout, /Test plan written/);

  const patch = runCli(["patch", "--goal", "improve test coverage"], root);
  assert.equal(patch.status, 0, patch.stderr);
  assert.match(patch.stdout, /Patch plan written/);

  const report = runCli(["report"], root);
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /Report written/);

  assert.ok(existsSync(join(root, ".ghost", "docs", "onboarding.md")));
  assert.ok(existsSync(join(root, ".ghost", "docs", "test-plan.md")));
  assert.ok(existsSync(join(root, ".ghost", "patches", "patch-plan.md")));
  assert.ok(existsSync(join(root, ".ghost", "reports", "final-report.md")));
});

test("CLI bob command accepts a custom Bob-compatible executable", () => {
  const root = createFixtureRepository("ghost-cli-bob-");
  const fakeBob = createFakeBob(root);

  const result = runCli(["bob", ".", "--bob-command", fakeBob], root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Bob architecture run completed/);
  assert.ok(existsSync(join(root, ".ghost", "bob", "architecture-response.md")));
});

test("CLI analyze --bob fails clearly when Bob is unavailable", () => {
  const root = createFixtureRepository("ghost-cli-bob-fail-");

  const result = runCli(
    ["analyze", ".", "--bob", "--bob-command", join(root, "missing-bob")],
    root,
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Bob architecture run failed/);
  assert.match(result.stderr, /Deterministic Ghost artifacts were written/);
  assert.ok(existsSync(join(root, ".ghost", "architecture.json")));
  assert.ok(existsSync(join(root, ".ghost", "bob", "architecture-response.md")));
});

test("CLI serve exposes the generated dashboard", async () => {
  const root = createFixtureRepository("ghost-cli-serve-");
  runCli(["analyze", "."], root);
  const port = await getFreePort();
  const child = spawn(
    process.execPath,
    [cliPath.pathname, "serve", ".", "--port", String(port)],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitFor(() => stdout.includes(`http://localhost:${port}`), 3000);
    const html = await httpGet(`http://localhost:${port}/`);
    assert.match(html, /Ghost Engineer Dashboard/);
    assert.match(html, /cli-fixture/);
  } finally {
    child.kill();
    await Promise.race([
      once(child, "exit"),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  }

  assert.equal(stderr, "");
});

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath.pathname, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function createFixtureRepository(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "cli-fixture",
        scripts: { build: "node src/index.js", test: "node --test" },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(root, "src", "index.js"),
    "export function main() { return true; }\n",
  );
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
      "  console.log(`ok ${input.length}`);",
      "});",
      "",
    ].join("\n"),
  );
  chmodSync(fakeBob, 0o755);
  return fakeBob;
}

async function getFreePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

async function waitFor(predicate, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error("Timed out waiting for condition");
}
