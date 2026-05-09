import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = join(currentDirectory, "..");
const sourceDirectory = join(appRoot, "src");
const publicDirectory = join(appRoot, "public");
const outputDirectory = join(appRoot, "dist");

if (!existsSync(sourceDirectory)) {
  throw new Error(`Missing source directory: ${sourceDirectory}`);
}

rmSync(outputDirectory, { force: true, recursive: true });
mkdirSync(outputDirectory, { recursive: true });
cpSync(sourceDirectory, outputDirectory, { recursive: true });

if (existsSync(publicDirectory)) {
  cpSync(publicDirectory, outputDirectory, { recursive: true });
}

console.log(`Built Ghost Engineer web installer at ${outputDirectory}`);
