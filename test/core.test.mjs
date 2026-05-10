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
  createUserPrefixEnvironment,
  detectBobStatus,
  detectNpmGlobalStatus,
  explainRepository,
  formatBobActivationHint,
  generateDocumentation,
  generatePatchPlan,
  generateReport,
  generateTestPlan,
  runBobAnalysis,
  setupBob,
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

test("detectNpmGlobalStatus reports a writable global prefix", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-npm-writable-"));
  const home = join(root, "home");
  const prefix = join(root, "npm-global");
  const fakeBin = join(root, "bin");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(prefix, "bin"), { recursive: true });
  mkdirSync(fakeBin, { recursive: true });
  createFakeNpm(fakeBin);

  const status = detectNpmGlobalStatus({
    env: {
      ...process.env,
      HOME: home,
      PATH: `${fakeBin}:${join(prefix, "bin")}:${process.env.PATH}`,
      FAKE_NPM_PREFIX: prefix,
    },
    homeDirectory: home,
  });

  assert.equal(status.status, "prefix-writable");
  assert.equal(status.prefixWritable, true);
  assert.equal(status.binDirectoryOnPath, true);
  assert.equal(status.prefix, prefix);
});

test("detectNpmGlobalStatus reports a non-writable prefix with user fallback", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-npm-fallback-"));
  const home = join(root, "home");
  const blockedParent = join(root, "blocked-parent");
  const fakeBin = join(root, "bin");
  mkdirSync(home, { recursive: true });
  mkdirSync(fakeBin, { recursive: true });
  writeFileSync(blockedParent, "not a directory\n");
  createFakeNpm(fakeBin);

  const status = detectNpmGlobalStatus({
    env: {
      ...process.env,
      HOME: home,
      PATH: `${fakeBin}:${process.env.PATH}`,
      FAKE_NPM_PREFIX: join(blockedParent, "npm-global"),
    },
    homeDirectory: home,
  });

  assert.equal(status.status, "fallback-user-prefix-available");
  assert.equal(status.prefixWritable, false);
  assert.equal(status.fallbackUserPrefixAvailable, true);
  assert.equal(status.userPrefix, join(home, ".local"));
});

test("createUserPrefixEnvironment uses a user-owned npm prefix and PATH", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-npm-env-"));
  const home = join(root, "home");
  const fakeBin = join(root, "bin");
  const blockedParent = join(root, "blocked-parent");
  mkdirSync(home, { recursive: true });
  mkdirSync(fakeBin, { recursive: true });
  writeFileSync(blockedParent, "not a directory\n");
  createFakeNpm(fakeBin);

  const status = detectNpmGlobalStatus({
    env: {
      ...process.env,
      HOME: home,
      PATH: `${fakeBin}:${process.env.PATH}`,
      FAKE_NPM_PREFIX: join(blockedParent, "npm-global"),
    },
    homeDirectory: home,
  });
  const env = createUserPrefixEnvironment(status, {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH}`,
  });

  assert.equal(env.npm_config_prefix, join(home, ".local"));
  assert.match(env.PATH ?? "", new RegExp(`^${escapeRegExp(join(home, ".local", "bin"))}`));
});

test("setupBob --install uses a user-local npm prefix when the global prefix is not writable", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-bob-install-prefix-"));
  const { env, home, fakeBin } = createBobInstallFixture(root, {
    prefixWritable: false,
    userBinOnPath: false,
  });
  createFakeBobInstaller(fakeBin, {
    commandName: "ghost-test-bob",
    mode: "success",
  });

  const output = setupBob({
    command: "ghost-test-bob",
    install: true,
    env,
    homeDirectory: home,
  });

  assert.match(output, /npm global prefix is not user-writable/);
  assert.match(output, /user-owned npm prefix/);
  assert.match(output, /Bob Shell installer completed/);
  assert.match(output, /not available from your current PATH/);
  assert.match(output, /export PATH=/);
  assert.ok(existsSync(join(home, ".local", "bin", "ghost-test-bob")));
});

test("setupBob --install verifies Bob availability after installation", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-bob-install-available-"));
  const { env, home, fakeBin } = createBobInstallFixture(root, {
    prefixWritable: false,
    userBinOnPath: true,
  });
  createFakeBobInstaller(fakeBin, {
    commandName: "ghost-test-bob",
    mode: "success",
  });

  const output = setupBob({
    command: "ghost-test-bob",
    install: true,
    env,
    homeDirectory: home,
  });

  assert.match(output, /Bob Shell installer completed/);
  assert.match(output, /IBM Bob detected/);
  assert.match(output, /ghost analyze \. --bob/);
});

test("setupBob --install gives actionable npm EACCES recovery", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-bob-install-eacces-"));
  const { env, home, fakeBin } = createBobInstallFixture(root, {
    prefixWritable: false,
    userBinOnPath: false,
  });
  createFakeBobInstaller(fakeBin, {
    commandName: "ghost-test-bob",
    mode: "eacces",
  });

  assert.throws(
    () =>
      setupBob({
        command: "ghost-test-bob",
        install: true,
        env,
        homeDirectory: home,
      }),
    /Recovery:[\s\S]*npm_config_prefix=.*\.local[\s\S]*EACCES/,
  );
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

function createBobInstallFixture(root, { prefixWritable, userBinOnPath }) {
  const home = join(root, "home");
  const fakeBin = join(root, "bin");
  const blockedParent = join(root, "blocked-parent");
  const prefix = prefixWritable
    ? join(root, "npm-global")
    : join(blockedParent, "npm-global");
  const userBin = join(home, ".local", "bin");
  mkdirSync(home, { recursive: true });
  mkdirSync(fakeBin, { recursive: true });
  if (prefixWritable) {
    mkdirSync(join(prefix, "bin"), { recursive: true });
  } else {
    writeFileSync(blockedParent, "not a directory\n");
  }
  if (userBinOnPath) {
    mkdirSync(userBin, { recursive: true });
  }
  createFakeNpm(fakeBin);

  return {
    home,
    fakeBin,
    env: {
      ...process.env,
      HOME: home,
      SHELL: "/bin/bash",
      PATH: userBinOnPath
        ? `${userBin}:${fakeBin}:${process.env.PATH}`
        : `${fakeBin}:${process.env.PATH}`,
      FAKE_NPM_PREFIX: prefix,
    },
  };
}

function createFakeNpm(directory) {
  writeExecutable(
    join(directory, "npm"),
    [
      "#!/bin/sh",
      'if [ "$1" = "prefix" ] && [ "$2" = "-g" ]; then',
      '  printf "%s\\n" "$FAKE_NPM_PREFIX"',
      "  exit 0",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
  );
}

function createFakeBobInstaller(directory, { commandName, mode }) {
  writeExecutable(
    join(directory, "bash"),
    [
      "#!/bin/sh",
      'if [ "$1" != "-lc" ]; then',
      "  exit 2",
      "fi",
      mode === "eacces"
        ? 'printf "%s\\n" "EACCES: permission denied, mkdir \'/usr/local/lib/node_modules\'" >&2'
        : 'if [ "$npm_config_prefix" = "" ]; then printf "%s\\n" "missing npm_config_prefix" >&2; exit 7; fi',
      mode === "eacces" ? "exit 1" : "",
      mode === "success"
        ? 'case ":$PATH:" in *":$npm_config_prefix/bin:"*) ;; *) printf "%s\\n" "missing user bin on PATH" >&2; exit 8;; esac'
        : "",
      mode === "success" ? 'mkdir -p "$npm_config_prefix/bin"' : "",
      mode === "success"
        ? `cat > "$npm_config_prefix/bin/${commandName}" <<'EOF'\n#!/bin/sh\nif [ "$1" = "--help" ]; then\n  echo "Fake IBM Bob Shell"\n  exit 0\nfi\ncat >/dev/null\necho "Fake IBM Bob Shell"\nEOF`
        : "",
      mode === "success" ? `chmod +x "$npm_config_prefix/bin/${commandName}"` : "",
      mode === "success" ? "exit 0" : "",
      "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function writeExecutable(path, contents) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
