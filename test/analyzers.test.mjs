import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRepositoryAnalysis, inspectFile } from "../packages/analyzers/dist/index.js";

test("createRepositoryAnalysis detects a TypeScript CLI workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-analyzer-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "sample-cli",
        version: "1.0.0",
        bin: { sample: "./dist/index.js" },
        scripts: { build: "tsc -p tsconfig.json", test: "node --test" },
        dependencies: { commander: "^14.0.0" },
        devDependencies: { typescript: "^6.0.0" },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(root, "tsconfig.json"), "{}");
  writeFileSync(
    join(root, "src", "index.ts"),
    'import { Command } from "commander";\nexport function main() { return new Command(); }\n',
  );

  const project = createRepositoryAnalysis(root);

  assert.equal(project.projectName, "sample-cli");
  assert.equal(project.projectType, "Node.js CLI");
  assert.equal(project.packageManager, "unknown");
  assert.ok(project.frameworks.some((framework) => framework.name === "Node.js CLI"));
  assert.ok(project.languages.some((language) => language.language === "TypeScript"));
  assert.equal(project.riskFindings.some((risk) => risk.id === "placeholder-test-scripts"), false);
});

test("inspectFile reports imports, exports, and declarations", () => {
  const root = mkdtempSync(join(tmpdir(), "ghost-file-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "index.ts"),
    'import { Command } from "commander";\nexport function main() { return new Command(); }\n',
  );

  const insight = inspectFile(root, "src/index.ts");

  assert.deepEqual(insight.imports, ["commander"]);
  assert.deepEqual(insight.exports, ["main"]);
  assert.deepEqual(insight.declarations, ["main"]);
});
