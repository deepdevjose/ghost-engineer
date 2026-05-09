import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cliPath = new URL("../apps/cli/dist/index.js", import.meta.url);

test("CLI analyze command writes a .ghost workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-cli-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "cli-fixture", scripts: { test: "node --test" } }),
  );
  writeFileSync(join(root, "src", "index.js"), "export const cli = true;\n");

  const result = spawnSync(process.execPath, [cliPath.pathname, "analyze", root], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Ghost Engineer analyzed cli-fixture/);
  assert.ok(existsSync(join(root, ".ghost", "architecture.json")));
});

test("CLI bob command accepts a custom Bob-compatible executable", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-cli-bob-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "cli-bob-fixture", scripts: { test: "node --test" } }),
  );
  writeFileSync(join(root, "src", "index.js"), "export const cli = true;\n");
  const fakeBob = join(root, "fake-bob.mjs");
  writeFileSync(
    fakeBob,
    "#!/usr/bin/env node\nprocess.stdin.resume();\nprocess.stdin.on('end', () => console.log('ok'));\n",
    { mode: 0o755 },
  );

  const result = spawnSync(
    process.execPath,
    [cliPath.pathname, "bob", root, "--bob-command", fakeBob],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Bob architecture run completed/);
  assert.ok(existsSync(join(root, ".ghost", "bob", "architecture-response.md")));
});
