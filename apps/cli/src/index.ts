#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("ghost")
  .description("Ghost Engineer command-line interface")
  .version("0.1.0");

program.parse();
