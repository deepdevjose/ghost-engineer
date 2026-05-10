import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { chmodSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const webDist = new URL("../apps/web/dist/", import.meta.url);
const webApp = new URL("../apps/web/", import.meta.url);

test("web installer build emits static entry files", () => {
  const root = webDist.pathname;
  const html = readFileSync(join(root, "index.html"), "utf8");

  assert.ok(existsSync(join(root, "styles.css")));
  assert.ok(existsSync(join(root, "app.js")));
  assert.ok(existsSync(join(root, "install.sh")));
  assert.ok(existsSync(join(root, "assets", "console-preview.svg")));
  assert.ok(existsSync(join(root, "assets", "bobghost.png")));
  assert.match(html, /Ghost Engineer Installer/);
  assert.match(html, /rel="icon" type="image\/png" href="\.\/assets\/bobghost\.png"/);
  assert.match(html, /Understand any repository before you change it/);
  assert.match(html, /Install Ghost\. Connect Bob/);
  assert.match(html, /ghost setup bob/);
  assert.match(html, /Node\.js 22\.15\.0\+/);
  assert.match(html, /https:\/\/bob\.ibm\.com\/download\/bobshell\.sh/);
  assert.match(html, /IBMid authentication/);
  assert.match(html, /Workspace created: \.ghost\//);
  assert.match(html, /Reason with Bob/);
  assert.match(html, /\.ghost\/architecture\.json/);
  assert.match(html, /analyze \. --bob/);
  assert.match(html, /npm link/);
});

test("web installer script is publish-ready shell", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const contents = readFileSync(installScript, "utf8");
  const stats = statSync(installScript);

  assert.match(contents, /git clone/);
  assert.match(contents, /npm ci|npm install/);
  assert.match(contents, /npm run build/);
  assert.match(contents, /create_ghost_launcher/);
  assert.match(contents, /\.local\/bin\/ghost/);
  assert.match(contents, /command -v bob/);
  assert.match(contents, /22\.15\.0/);
  assert.match(contents, /ghost-engineer\.pages\.dev\/install\.sh/);
  assert.doesNotMatch(contents, /npm link/);
  assert.doesNotMatch(contents, /Node\.js 20|20 or newer|20\+/);
  assert.doesNotMatch(contents, /--add-repo/);
  assert.doesNotMatch(contents, /dnf-plugins-core/);
  assert.equal(Boolean(stats.mode & 0o111), true);
});

test("web installer guides clearly when Node.js is missing", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const emptyBin = mkdtempSync(join(tmpdir(), "ghost-install-no-node-"));
  const bashPath = resolveBash();

  const result = spawnSync(bashPath, [installScript], {
    env: {
      ...process.env,
      PATH: emptyBin,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Node\.js was not found on PATH/);
  assert.match(result.stdout, /Node\.js 22\.15\.0\+ is required/);
  assert.match(result.stdout, /rerun Ghost Engineer installer/i);
  assert.match(result.stdout, /curl -fsSL https:\/\/ghost-engineer\.pages\.dev\/install\.sh \| bash/);
});

test("web installer guides clearly when Node.js version is below 22.15.0", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const binDir = mkdtempSync(join(tmpdir(), "ghost-install-old-node-"));
  const nodeStub = join(binDir, "node");
  const bashPath = resolveBash();

  writeFileSync(
    nodeStub,
    [
      "#!/usr/bin/env bash",
      "if [ \"${1:-}\" = \"--version\" ]; then",
      "  echo \"v22.14.0\"",
      "  exit 0",
      "fi",
      "echo \"v22.14.0\"",
      "",
    ].join("\n"),
  );
  chmodSync(nodeStub, 0o755);

  const result = spawnSync(bashPath, [installScript], {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /requires Node\.js 22\.15\.0 or newer/);
  assert.match(result.stdout, /Found v22\.14\.0/);
  assert.match(result.stdout, /curl -fsSL https:\/\/ghost-engineer\.pages\.dev\/install\.sh \| bash/);
});

test("web installer Fedora guidance uses dnf install nodejs, not obsolete --add-repo", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const contents = readFileSync(installScript, "utf8");

  assert.match(contents, /sudo dnf install -y nodejs/);
  assert.doesNotMatch(contents, /--add-repo/);
  assert.doesNotMatch(contents, /dnf-plugins-core/);
  assert.doesNotMatch(contents, /nodesoure\.repo/);
});

test("web installer Fedora guidance includes version check after install", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const contents = readFileSync(installScript, "utf8");

  const fedoraSection = contents.match(/if is_fedora_rhel_like[\s\S]*?fi;/)?.[0] ?? "";
  assert.match(fedoraSection, /node --version/);
  assert.match(fedoraSection, /nvm/);
});

test("web installer creates ~/.local/bin launcher instead of npm link", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const contents = readFileSync(installScript, "utf8");

  assert.match(contents, /create_ghost_launcher/);
  assert.match(contents, /launcher_dir="\${HOME}\/.local\/bin"/);
  assert.match(contents, /INSTALL_DIR.*apps\/cli\/dist\/index\.js/);
  assert.match(contents, /chmod \+x "\${launcher}"/);
});

test("web installer provides PATH guidance when ~/.local/bin is not on PATH", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const contents = readFileSync(installScript, "utf8");

  assert.match(contents, /ensure_local_bin_on_path/);
  assert.match(contents, /export PATH.*HOME.*\.local\/bin/);
  assert.match(contents, /bashrc|zshrc|\.profile/);
});

test("web dev server falls back when the requested port is busy", async () => {
  const blocker = createServer();
  blocker.listen(0);
  await once(blocker, "listening");
  const address = blocker.address();
  assert.equal(typeof address, "object");

  const child = spawn(
    process.execPath,
    [join(webApp.pathname, "scripts", "serve.mjs"), "src"],
    {
      cwd: webApp.pathname,
      env: {
        ...process.env,
        PORT: String(address.port),
        PORT_ATTEMPTS: "5",
      },
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
    await waitFor(() => /http:\/\/localhost:(\d+)/.test(stdout), 3000);
    const [, portValue] = stdout.match(/http:\/\/localhost:(\d+)/) ?? [];
    assert.ok(portValue);
    assert.notEqual(Number(portValue), address.port);
    assert.match(stderr, /is busy; trying/);

    const html = await httpGet(`http://localhost:${portValue}/`);
    assert.match(html, /Ghost Engineer Installer/);
  } finally {
    child.kill();
    const blockerClosed = once(blocker, "close");
    blocker.close();
    await Promise.race([
      once(child, "exit"),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    await blockerClosed;
  }
});

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

function resolveBash() {
  if (existsSync("/bin/bash")) {
    return "/bin/bash";
  }

  if (existsSync("/usr/bin/bash")) {
    return "/usr/bin/bash";
  }

  return "bash";
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
