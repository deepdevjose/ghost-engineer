import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync, statSync } from "node:fs";
import { get } from "node:http";
import { createServer } from "node:net";
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
  assert.match(contents, /npm link/);
  assert.match(contents, /command -v bob/);
  assert.equal(Boolean(stats.mode & 0o111), true);
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
