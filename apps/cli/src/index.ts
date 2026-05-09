#!/usr/bin/env node

import { resolve } from "node:path";
import { Command } from "commander";
import { initializeGhost } from "@ghost-engineer/core";

const program = new Command();

program
  .name("ghost")
  .description("Ghost Engineer command-line interface")
  .version("0.1.0");

program
  .command("init")
  .argument("[path]", "Path to the project", ".")
  .description("Initialize Ghost Engineer for a project")
  .action((path: string) => {
    const rootPath = resolve(path);
    const summary = initializeGhost(rootPath);
    console.log(summary);
  });

program.parse();
