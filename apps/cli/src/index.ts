#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { Command } from "commander";
import {
  analyzeRepository,
  explainRepository,
  generateDocumentation,
  generatePatchPlan,
  generateReport,
  generateTestPlan,
  initializeGhost,
  prepareDashboard,
  runBobAnalysis,
} from "@ghost-engineer/core";
import type { GhostBobOptions, GhostBobTask } from "@ghost-engineer/shared";

interface BobCliOptions {
  bob?: boolean;
  bobAcceptLicense?: boolean;
  bobCommand?: string;
  bobMaxCoins?: string;
  bobModel?: string;
  bobTrust?: boolean;
  goal?: string;
  port?: string;
  root?: string;
  task?: GhostBobTask;
}

const program = new Command();

program
  .name("ghost")
  .description("Ghost Engineer command-line interface")
  .version("0.1.0")
  .showHelpAfterError();

program
  .command("init")
  .argument("[path]", "Path to the project", ".")
  .description("Initialize a .ghost workspace with a baseline analysis")
  .action((path: string) => run(() => initializeGhost(resolve(path))));

const analyze = program
  .command("analyze")
  .argument("[path]", "Path to the project", ".")
  .description("Analyze a repository and write .ghost artifacts");
addBobOptions(analyze);
analyze.action((path: string, options: BobCliOptions) =>
  run(() =>
    analyzeRepository(
      resolve(path),
      maybeBobOptions(options, "architecture"),
    ).summary,
  ),
);

const explain = program
  .command("explain")
  .argument("[target]", "Optional file to explain")
  .option("-r, --root <path>", "Repository root", ".")
  .description("Explain the repository or a specific file");
addBobOptions(explain);
explain.action((target: string | undefined, options: BobCliOptions) =>
  run(() =>
    explainRepository(
      resolve(options.root ?? "."),
      target,
      maybeBobOptions(options, target ? "file" : "architecture", target),
    ),
  ),
);

const docs = program
  .command("docs")
  .argument("[path]", "Path to the project", ".")
  .description("Generate onboarding documentation from the current analysis");
addBobOptions(docs);
docs.action((path: string, options: BobCliOptions) =>
  run(() => generateDocumentation(resolve(path), maybeBobOptions(options, "docs"))),
);

const testgen = program
  .command("testgen")
  .argument("[path]", "Path to the project", ".")
  .description("Generate a risk-driven test plan");
addBobOptions(testgen);
testgen.action((path: string, options: BobCliOptions) =>
  run(() => generateTestPlan(resolve(path), maybeBobOptions(options, "tests"))),
);

const patch = program
  .command("patch")
  .argument("[path]", "Path to the project", ".")
  .requiredOption("-g, --goal <goal>", "Engineering goal for the patch plan")
  .description("Generate a reviewable patch plan for a goal");
addBobOptions(patch);
patch.action((path: string, options: BobCliOptions) =>
  run(() =>
    generatePatchPlan(
      resolve(path),
      options.goal ?? "",
      maybeBobOptions(options, "patch", options.goal),
    ),
  ),
);

const report = program
  .command("report")
  .argument("[path]", "Path to the project", ".")
  .description("Generate the final Ghost Engineer report");
addBobOptions(report);
report.action((path: string, options: BobCliOptions) =>
  run(() => generateReport(resolve(path), maybeBobOptions(options, "report"))),
);

const bob = program
  .command("bob")
  .argument("[path]", "Path to the project", ".")
  .option(
    "-t, --task <task>",
    "Bob task: architecture, docs, file, patch, report, risks, tests",
    "architecture",
  )
  .option("-g, --goal <goal>", "Goal for patch or planning tasks")
  .description("Run IBM Bob against the Ghost repository intelligence context");
addBobRuntimeOptions(bob);
bob.action((path: string, options: BobCliOptions) =>
  run(() =>
    runBobAnalysis(resolve(path), {
      ...readBobRuntimeOptions(options),
      task: parseBobTask(options.task ?? "architecture"),
      goal: options.goal,
    }),
  ),
);

program
  .command("serve")
  .argument("[path]", "Path to the project", ".")
  .option("-p, --port <port>", "Port for the local dashboard", "4321")
  .description("Serve the local .ghost dashboard")
  .action((path: string, options: BobCliOptions) =>
    run(() => {
      const rootPath = resolve(path);
      const port = Number.parseInt(options.port ?? "4321", 10);

      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port: ${options.port}`);
      }

      const { dashboardPath } = prepareDashboard(rootPath);
      serveDashboard(dirname(dashboardPath), port);
      return `Ghost dashboard running at http://localhost:${port}`;
    }),
  );

program.parse();

function run(action: () => string): void {
  try {
    const output = action();
    if (output) {
      console.log(output);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ghost: ${message}`);
    process.exitCode = 1;
  }
}

function addBobOptions(command: Command): void {
  command.option("--bob", "Run IBM Bob CLI and write .ghost/bob artifacts");
  addBobRuntimeOptions(command);
}

function addBobRuntimeOptions(command: Command): void {
  command
    .option("--bob-command <command>", "Bob executable path", "bob")
    .option("--bob-model <model>", "Bob model")
    .option("--bob-max-coins <coins>", "Stop Bob if this coin budget is exceeded")
    .option("--bob-trust", "Pass --trust to Bob")
    .option("--bob-accept-license", "Pass --accept-license to Bob");
}

function maybeBobOptions(
  options: BobCliOptions,
  task: GhostBobTask,
  goal?: string,
): GhostBobOptions | undefined {
  if (!options.bob) {
    return undefined;
  }

  return {
    ...readBobRuntimeOptions(options),
    task,
    goal,
  };
}

function readBobRuntimeOptions(options: BobCliOptions): Omit<GhostBobOptions, "task"> {
  return {
    command: options.bobCommand,
    model: options.bobModel,
    maxCoins: parseOptionalNumber(options.bobMaxCoins, "--bob-max-coins"),
    trust: options.bobTrust,
    acceptLicense: options.bobAcceptLicense,
  };
}

function parseOptionalNumber(
  value: string | undefined,
  flagName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.trim() === "") {
    throw new Error(`Invalid ${flagName}: ${value}`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${flagName}: ${value}`);
  }

  return parsed;
}

function parseBobTask(value: string): GhostBobTask {
  const tasks = new Set<GhostBobTask>([
    "architecture",
    "docs",
    "file",
    "patch",
    "report",
    "risks",
    "tests",
  ]);

  if (!tasks.has(value as GhostBobTask)) {
    throw new Error(`Invalid Bob task: ${value}`);
  }

  return value as GhostBobTask;
}

function serveDashboard(directory: string, port: number): void {
  const rootDirectory = resolve(directory);
  const rootPrefix = rootDirectory.endsWith(sep)
    ? rootDirectory
    : `${rootDirectory}${sep}`;

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://localhost:${port}`);
    const requestedPath =
      requestUrl.pathname === "/"
        ? "index.html"
        : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const filePath = resolve(rootDirectory, requestedPath);

    if (filePath !== rootDirectory && !filePath.startsWith(rootPrefix)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
    });
    createReadStream(filePath).pipe(response);
  });

  server.listen(port);
}

function contentTypeFor(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}
