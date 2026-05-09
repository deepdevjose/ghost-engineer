import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import type {
  DependencyScope,
  GhostDependency,
  GhostDirectorySummary,
  GhostEntryPoint,
  GhostFileInsight,
  GhostFrameworkSignal,
  GhostLanguageStat,
  GhostPackageManifest,
  GhostProject,
  GhostRiskFinding,
} from "@ghost-engineer/shared";

interface DiscoveredFile {
  path: string;
  absolutePath: string;
  bytes: number;
}

interface PackageJsonShape {
  name?: string;
  version?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  bin?: string | Record<string, string>;
  main?: string;
  module?: string;
  types?: string;
  typings?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".ghost",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".cache",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const LANGUAGE_BY_EXTENSION = new Map<string, string>([
  [".cjs", "JavaScript"],
  [".css", "CSS"],
  [".go", "Go"],
  [".html", "HTML"],
  [".java", "Java"],
  [".js", "JavaScript"],
  [".json", "JSON"],
  [".jsx", "JavaScript React"],
  [".md", "Markdown"],
  [".mjs", "JavaScript"],
  [".py", "Python"],
  [".rs", "Rust"],
  [".scss", "SCSS"],
  [".sh", "Shell"],
  [".sql", "SQL"],
  [".svelte", "Svelte"],
  [".toml", "TOML"],
  [".ts", "TypeScript"],
  [".tsx", "TypeScript React"],
  [".vue", "Vue"],
  [".yaml", "YAML"],
  [".yml", "YAML"],
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".go",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".toml",
  ".ts",
  ".tsx",
  ".vue",
  ".yaml",
  ".yml",
]);

export function createInitialAnalysis(rootPath: string): GhostProject {
  return createRepositoryAnalysis(rootPath);
}

export function createRepositoryAnalysis(rootPath: string): GhostProject {
  const absoluteRoot = resolve(rootPath);
  assertDirectory(absoluteRoot);

  const directories: string[] = [];
  const files: DiscoveredFile[] = [];
  walkRepository(absoluteRoot, absoluteRoot, directories, files);

  const packageManifests = readPackageManifests(absoluteRoot, files);
  const dependencies = collectDependencies(absoluteRoot, packageManifests);
  const entryPoints = collectEntryPoints(absoluteRoot, packageManifests, files);
  const scripts = collectScripts(packageManifests);
  const languages = collectLanguages(files);
  const frameworkSignals = detectFrameworks(
    absoluteRoot,
    files,
    packageManifests,
    dependencies,
  );

  const project: GhostProject = {
    rootPath: absoluteRoot,
    projectName: inferProjectName(absoluteRoot, packageManifests),
    analyzedAt: new Date().toISOString(),
    packageManager: detectPackageManager(absoluteRoot),
    projectType: inferProjectType(
      absoluteRoot,
      packageManifests,
      dependencies,
      frameworkSignals,
    ),
    totals: {
      files: files.length,
      directories: directories.length,
      bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      packageManifests: packageManifests.length,
    },
    languages,
    frameworks: frameworkSignals,
    packageManifests,
    dependencies,
    entryPoints,
    scripts,
    directories: summarizeDirectories(directories, files),
    riskFindings: detectRisks(absoluteRoot, files, packageManifests),
  };

  return project;
}

export function inspectFile(rootPath: string, targetPath: string): GhostFileInsight {
  const absoluteRoot = resolve(rootPath);
  const absoluteTarget = resolve(absoluteRoot, targetPath);

  if (!existsSync(absoluteTarget)) {
    throw new Error(`File not found: ${targetPath}`);
  }

  const stats = statSync(absoluteTarget);
  if (!stats.isFile()) {
    throw new Error(`Expected a file, received: ${targetPath}`);
  }

  const extension = extname(absoluteTarget);
  const language = languageForFile(absoluteTarget);
  const contents = isTextFile(absoluteTarget)
    ? readFileSync(absoluteTarget, "utf8")
    : "";
  const lines = contents.length === 0 ? 0 : contents.split(/\r?\n/).length;
  const imports = uniqueMatches(contents, [
    /import[\s\S]+?from\s+["'](.+?)["']/g,
    /^\s*import\s+["'](.+?)["']/gm,
    /^\s*const\s+\w+\s*=\s*require\(["'](.+?)["']\)/gm,
  ]);
  const exports = uniqueMatches(contents, [
    /^\s*export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([A-Za-z0-9_$]+)/gm,
    /^\s*export\s+\{([^}]+)\}/gm,
  ]);
  const declarations = uniqueMatches(contents, [
    /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm,
    /^(?:export\s+)?class\s+([A-Za-z0-9_$]+)/gm,
    /^(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/gm,
    /^(?:export\s+)?type\s+([A-Za-z0-9_$]+)/gm,
    /^export\s+const\s+([A-Za-z0-9_$]+)\s*=/gm,
  ]);

  const notes: string[] = [];
  if (!TEXT_EXTENSIONS.has(extension) && contents.length === 0) {
    notes.push("Binary or unsupported text format; structural details are limited.");
  }
  if (imports.length === 0) {
    notes.push("No imports detected.");
  }
  if (exports.length === 0) {
    notes.push("No exports detected.");
  }
  if (declarations.length > 12) {
    notes.push("This file has many declarations; it may be doing multiple jobs.");
  }

  return {
    path: normalizePath(relative(absoluteRoot, absoluteTarget)),
    language,
    bytes: stats.size,
    lines,
    imports: imports.slice(0, 20),
    exports: exports.slice(0, 20),
    declarations: declarations.slice(0, 20),
    notes,
  };
}

function assertDirectory(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Path does not exist: ${path}`);
  }

  if (!statSync(path).isDirectory()) {
    throw new Error(`Expected a directory: ${path}`);
  }
}

function walkRepository(
  rootPath: string,
  currentPath: string,
  directories: string[],
  files: DiscoveredFile[],
): void {
  const entries = readdirSync(currentPath, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const absolutePath = join(currentPath, entry.name);
    const relativePath = normalizePath(relative(rootPath, absolutePath));

    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      directories.push(relativePath);
      walkRepository(rootPath, absolutePath, directories, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    files.push({
      path: relativePath,
      absolutePath,
      bytes: statSync(absolutePath).size,
    });
  }
}

function shouldIgnoreDirectory(name: string): boolean {
  return IGNORED_DIRECTORIES.has(name);
}

function readPackageManifests(
  rootPath: string,
  files: DiscoveredFile[],
): GhostPackageManifest[] {
  return files
    .filter((file) => basename(file.path) === "package.json")
    .map((file) => {
      const packageJson = readJson<PackageJsonShape>(file.absolutePath);
      const manifestDirectory = dirname(file.path);
      const fallbackName =
        manifestDirectory === "." ? basename(rootPath) : basename(manifestDirectory);

      return {
        path: file.path,
        name: packageJson.name ?? fallbackName,
        version: packageJson.version,
        private: packageJson.private,
        scripts: packageJson.scripts ?? {},
        workspaces: normalizeWorkspaces(packageJson.workspaces),
      };
    });
}

function collectDependencies(
  rootPath: string,
  packageManifests: GhostPackageManifest[],
): GhostDependency[] {
  const dependencies: GhostDependency[] = [];

  for (const manifest of packageManifests) {
    const manifestJson = readJson<PackageJsonShape>(join(rootPath, manifest.path), true);

    addDependencies(
      dependencies,
      manifest.path,
      "production",
      manifestJson.dependencies,
    );
    addDependencies(
      dependencies,
      manifest.path,
      "development",
      manifestJson.devDependencies,
    );
    addDependencies(dependencies, manifest.path, "peer", manifestJson.peerDependencies);
    addDependencies(
      dependencies,
      manifest.path,
      "optional",
      manifestJson.optionalDependencies,
    );
  }

  return dependencies.sort((a, b) =>
    `${a.name}:${a.manifestPath}:${a.scope}`.localeCompare(
      `${b.name}:${b.manifestPath}:${b.scope}`,
    ),
  );
}

function collectEntryPoints(
  rootPath: string,
  packageManifests: GhostPackageManifest[],
  files: DiscoveredFile[],
): GhostEntryPoint[] {
  const entryPoints: GhostEntryPoint[] = [];
  const filePaths = new Set(files.map((file) => file.path));

  for (const manifest of packageManifests) {
    const packageJson = readJson<PackageJsonShape>(join(rootPath, manifest.path), true);
    const baseDirectory = dirname(manifest.path);

    if (typeof packageJson.bin === "string") {
      entryPoints.push({
        kind: "bin",
        path: normalizeManifestPath(baseDirectory, packageJson.bin),
        source: manifest.path,
      });
    } else if (packageJson.bin) {
      for (const [name, binPath] of Object.entries(packageJson.bin)) {
        entryPoints.push({
          kind: "bin",
          path: normalizeManifestPath(baseDirectory, binPath),
          source: `${manifest.path}#bin.${name}`,
        });
      }
    }

    addPackageEntryPoint(entryPoints, manifest.path, baseDirectory, "main", packageJson.main);
    addPackageEntryPoint(
      entryPoints,
      manifest.path,
      baseDirectory,
      "module",
      packageJson.module,
    );
    addPackageEntryPoint(
      entryPoints,
      manifest.path,
      baseDirectory,
      "types",
      packageJson.types ?? packageJson.typings,
    );

    for (const scriptName of ["dev", "start", "build", "test", "serve"]) {
      const command = packageJson.scripts?.[scriptName];
      if (!command) {
        continue;
      }

      entryPoints.push({
        kind: "script",
        path: command,
        source: `${manifest.path}#scripts.${scriptName}`,
      });
    }
  }

  for (const candidate of [
    "src/index.ts",
    "src/index.tsx",
    "src/index.js",
    "src/main.ts",
    "src/main.tsx",
    "src/main.js",
    "apps/cli/src/index.ts",
  ]) {
    if (filePaths.has(candidate)) {
      entryPoints.push({
        kind: "source",
        path: candidate,
        source: "repository scan",
      });
    }
  }

  return uniqueEntryPoints(entryPoints);
}

function collectScripts(
  packageManifests: GhostPackageManifest[],
): Record<string, string[]> {
  const scripts: Record<string, string[]> = {};

  for (const manifest of packageManifests) {
    for (const [name, command] of Object.entries(manifest.scripts)) {
      scripts[name] ??= [];
      scripts[name].push(`${manifest.path}: ${command}`);
    }
  }

  return Object.fromEntries(
    Object.entries(scripts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function collectLanguages(files: DiscoveredFile[]): GhostLanguageStat[] {
  const stats = new Map<string, GhostLanguageStat>();

  for (const file of files) {
    const extension = extname(file.path).toLowerCase();
    const language = languageForFile(file.path);
    const current = stats.get(language) ?? {
      language,
      extensions: [],
      files: 0,
      bytes: 0,
    };

    if (extension && !current.extensions.includes(extension)) {
      current.extensions.push(extension);
    }

    current.files += 1;
    current.bytes += file.bytes;
    stats.set(language, current);
  }

  return Array.from(stats.values())
    .map((stat) => ({
      ...stat,
      extensions: stat.extensions.sort(),
    }))
    .sort((a, b) => b.files - a.files || a.language.localeCompare(b.language));
}

function detectFrameworks(
  rootPath: string,
  files: DiscoveredFile[],
  packageManifests: GhostPackageManifest[],
  dependencies: GhostDependency[],
): GhostFrameworkSignal[] {
  const signals: GhostFrameworkSignal[] = [];
  const dependencyNames = new Set(dependencies.map((dependency) => dependency.name));
  const filePaths = new Set(files.map((file) => file.path));
  const rootManifest = packageManifests.find((manifest) => manifest.path === "package.json");

  const add = (
    name: string,
    confidence: GhostFrameworkSignal["confidence"],
    evidence: string[],
  ) => {
    signals.push({ name, confidence, evidence });
  };

  if (packageManifests.length > 1 || (rootManifest?.workspaces.length ?? 0) > 0) {
    add("Workspace monorepo", "high", [
      `${packageManifests.length} package.json files discovered`,
    ]);
  }

  if (filePaths.has("tsconfig.base.json") || filePaths.has("tsconfig.json")) {
    add("TypeScript", "high", ["TypeScript configuration detected"]);
  } else if (hasAnyDependency(dependencyNames, ["typescript"])) {
    add("TypeScript", "medium", ["typescript dependency detected"]);
  }

  if (hasAnyDependency(dependencyNames, ["commander", "yargs", "cac"])) {
    add("Node.js CLI", "high", ["CLI framework dependency detected"]);
  } else if (packageManifests.some((manifest) => hasPackageBin(rootPath, manifest.path))) {
    add("Node.js CLI", "medium", ["package.json bin entry detected"]);
  }

  if (hasAnyDependency(dependencyNames, ["react", "react-dom", "next"])) {
    add("React", hasAnyDependency(dependencyNames, ["next"]) ? "high" : "medium", [
      "React dependency detected",
    ]);
  }

  if (hasAnyDependency(dependencyNames, ["next"])) {
    add("Next.js", "high", ["next dependency detected"]);
  }

  if (hasAnyDependency(dependencyNames, ["vue", "nuxt"])) {
    add("Vue", hasAnyDependency(dependencyNames, ["nuxt"]) ? "high" : "medium", [
      "Vue dependency detected",
    ]);
  }

  if (hasAnyDependency(dependencyNames, ["svelte", "@sveltejs/kit"])) {
    add("Svelte", "high", ["Svelte dependency detected"]);
  }

  if (hasAnyDependency(dependencyNames, ["vite"])) {
    add("Vite", "medium", ["vite dependency detected"]);
  }

  if (hasAnyDependency(dependencyNames, ["express", "fastify", "koa", "hono"])) {
    add("Node.js server", "medium", ["server framework dependency detected"]);
  }

  return signals.sort((a, b) => a.name.localeCompare(b.name));
}

function inferProjectType(
  rootPath: string,
  packageManifests: GhostPackageManifest[],
  dependencies: GhostDependency[],
  signals: GhostFrameworkSignal[],
): string {
  const signalNames = new Set(signals.map((signal) => signal.name));
  const dependencyNames = new Set(dependencies.map((dependency) => dependency.name));
  const hasBin = packageManifests.some((manifest) => {
    const packageJson = readJson<PackageJsonShape>(join(rootPath, manifest.path), true);
    return Boolean(packageJson.bin);
  });

  if (signalNames.has("Workspace monorepo") && hasBin) {
    return "Node.js CLI monorepo";
  }

  if (hasBin || signalNames.has("Node.js CLI")) {
    return "Node.js CLI";
  }

  if (
    hasAnyDependency(dependencyNames, [
      "next",
      "nuxt",
      "react",
      "react-dom",
      "vue",
      "svelte",
      "@sveltejs/kit",
    ])
  ) {
    return "Web application";
  }

  if (signalNames.has("Workspace monorepo")) {
    return "Workspace monorepo";
  }

  if (packageManifests.length > 0) {
    return "Node.js package";
  }

  return "Software repository";
}

function detectRisks(
  rootPath: string,
  files: DiscoveredFile[],
  packageManifests: GhostPackageManifest[],
): GhostRiskFinding[] {
  const risks: GhostRiskFinding[] = [];
  const filePaths = new Set(files.map((file) => file.path));
  const testFiles = files.filter((file) =>
    /(^|\/)(__tests__|tests?)\/|[.-](test|spec)\.[cm]?[jt]sx?$/.test(file.path),
  );

  if (testFiles.length === 0) {
    risks.push({
      id: "missing-tests",
      severity: "medium",
      title: "No test files found",
      description:
        "The repository does not contain obvious unit, integration, or smoke test files.",
      evidence: ["No files matched __tests__, tests/, *.test.*, or *.spec.* patterns"],
      recommendation:
        "Add focused smoke tests around the CLI commands and analyzer output before expanding AI workflows.",
    });
  }

  const placeholderTestScripts = packageManifests.flatMap((manifest) =>
    Object.entries(manifest.scripts)
      .filter(([name, command]) => name === "test" && /no tests yet|echo/i.test(command))
      .map(([name, command]) => `${manifest.path}#${name}: ${command}`),
  );

  if (placeholderTestScripts.length > 0) {
    risks.push({
      id: "placeholder-test-scripts",
      severity: "medium",
      title: "Test scripts are placeholders",
      description:
        "Several packages expose a test script that does not execute an actual test runner.",
      evidence: placeholderTestScripts,
      recommendation:
        "Replace placeholder scripts with a real test runner or a CLI smoke test script.",
    });
  }

  const readme = files.find((file) => file.path.toLowerCase() === "readme.md");
  if (!readme || readme.bytes < 300) {
    risks.push({
      id: "thin-readme",
      severity: "low",
      title: "README is too thin for onboarding",
      description:
        "The root README does not yet explain installation, commands, artifacts, or release scope.",
      evidence: readme ? [`README.md is ${readme.bytes} bytes`] : ["README.md not found"],
      recommendation:
        "Document the MVP command workflow and make clear which AI features are planned.",
    });
  }

  if (!filePaths.has(".github/workflows/ci.yml") && !filePaths.has(".github/workflows/ci.yaml")) {
    risks.push({
      id: "missing-ci",
      severity: "low",
      title: "No CI workflow detected",
      description:
        "The repository has no obvious GitHub Actions workflow for build or test verification.",
      evidence: ["No .github/workflows/ci.yml or .github/workflows/ci.yaml file found"],
      recommendation:
        "Add CI once the MVP command behavior has tests, so releases stay reproducible.",
    });
  }

  const todoFiles = files
    .filter((file) => isTextFile(file.path))
    .flatMap((file) => {
      const contents = readFileSync(file.absolutePath, "utf8");
      const count = countCodeMarkers(contents);
      return count > 0 ? [`${file.path}: ${count}`] : [];
    });

  if (todoFiles.length > 0) {
    risks.push({
      id: "open-code-markers",
      severity: "info",
      title: "Open TODO/FIXME markers found",
      description:
        "Some files contain explicit follow-up markers that may represent unfinished work.",
      evidence: todoFiles.slice(0, 10),
      recommendation:
        "Review these markers during hardening and either resolve them or convert them into tracked issues.",
    });
  }

  if (!existsSync(join(rootPath, "LICENSE"))) {
    risks.push({
      id: "missing-license",
      severity: "low",
      title: "No license file detected",
      description: "The repository does not contain a root LICENSE file.",
      evidence: ["LICENSE not found"],
      recommendation:
        "Add a license before publishing packages or distributing an installer.",
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function summarizeDirectories(
  directories: string[],
  files: DiscoveredFile[],
): GhostDirectorySummary[] {
  return directories
    .filter((directory) => !directory.includes(sep))
    .map((directory) => ({
      path: directory,
      files: files.filter((file) => file.path.startsWith(`${directory}/`)).length,
      directories: directories.filter((nested) => nested.startsWith(`${directory}/`)).length,
    }))
    .sort((a, b) => b.files - a.files || a.path.localeCompare(b.path));
}

function readJson<T>(path: string, tolerateMissing = false): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    if (tolerateMissing) {
      return {} as T;
    }

    throw error;
  }
}

function normalizeWorkspaces(workspaces: PackageJsonShape["workspaces"]): string[] {
  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  return workspaces?.packages ?? [];
}

function addDependencies(
  dependencies: GhostDependency[],
  manifestPath: string,
  scope: DependencyScope,
  values: Record<string, string> | undefined,
): void {
  for (const [name, version] of Object.entries(values ?? {})) {
    dependencies.push({
      name,
      version,
      scope,
      manifestPath,
    });
  }
}

function addPackageEntryPoint(
  entryPoints: GhostEntryPoint[],
  manifestPath: string,
  baseDirectory: string,
  kind: GhostEntryPoint["kind"],
  value: string | undefined,
): void {
  if (!value) {
    return;
  }

  entryPoints.push({
    kind,
    path: normalizeManifestPath(baseDirectory, value),
    source: `${manifestPath}#${kind}`,
  });
}

function uniqueEntryPoints(entryPoints: GhostEntryPoint[]): GhostEntryPoint[] {
  const seen = new Set<string>();
  return entryPoints.filter((entryPoint) => {
    const key = `${entryPoint.kind}:${entryPoint.path}:${entryPoint.source}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeManifestPath(baseDirectory: string, value: string): string {
  if (baseDirectory === ".") {
    return normalizePath(value);
  }

  return normalizePath(join(baseDirectory, value));
}

function hasPackageBin(rootPath: string, manifestPath: string): boolean {
  const packageJson = readJson<PackageJsonShape>(join(rootPath, manifestPath), true);
  return Boolean(packageJson.bin);
}

function detectPackageManager(rootPath: string): string {
  if (existsSync(join(rootPath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (existsSync(join(rootPath, "yarn.lock"))) {
    return "yarn";
  }

  if (existsSync(join(rootPath, "bun.lockb")) || existsSync(join(rootPath, "bun.lock"))) {
    return "bun";
  }

  if (existsSync(join(rootPath, "package-lock.json"))) {
    return "npm";
  }

  return "unknown";
}

function inferProjectName(
  rootPath: string,
  packageManifests: GhostPackageManifest[],
): string {
  const rootManifest = packageManifests.find((manifest) => manifest.path === "package.json");
  return rootManifest?.name ?? basename(rootPath);
}

function hasAnyDependency(dependencies: Set<string>, names: string[]): boolean {
  return names.some((name) => dependencies.has(name));
}

function languageForFile(path: string): string {
  const base = basename(path);
  if (base === "Dockerfile") {
    return "Docker";
  }

  return LANGUAGE_BY_EXTENSION.get(extname(path).toLowerCase()) ?? "Other";
}

function isTextFile(path: string): boolean {
  const base = basename(path);
  return base === "Dockerfile" || TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

function uniqueMatches(contents: string, patterns: RegExp[]): string[] {
  const matches = new Set<string>();

  for (const pattern of patterns) {
    for (const match of contents.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (value) {
        matches.add(value.replace(/\s+/g, " "));
      }
    }
  }

  return Array.from(matches).sort((a, b) => a.localeCompare(b));
}

function countCodeMarkers(contents: string): number {
  return contents
    .split(/\r?\n/)
    .filter((line) =>
      /(?:^|\s)(?:\/\/|#|\/\*|\*|<!--|--|;)\s*(?:TODO|FIXME|HACK)\b/i.test(line),
    ).length;
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function severityRank(severity: GhostRiskFinding["severity"]): number {
  switch (severity) {
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "info":
      return 1;
  }
}
