import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const webDist = new URL("../apps/web/dist/", import.meta.url);

test("web installer build emits static entry files", () => {
  const root = webDist.pathname;
  const html = readFileSync(join(root, "index.html"), "utf8");

  assert.ok(existsSync(join(root, "styles.css")));
  assert.ok(existsSync(join(root, "app.js")));
  assert.ok(existsSync(join(root, "install.sh")));
  assert.ok(existsSync(join(root, "assets", "console-preview.svg")));
  assert.match(html, /Ghost Engineer Installer/);
  assert.match(html, /analyze \. --bob/);
});

test("web installer script is publish-ready shell", () => {
  const installScript = join(webDist.pathname, "install.sh");
  const contents = readFileSync(installScript, "utf8");
  const stats = statSync(installScript);

  assert.match(contents, /npm install -g/);
  assert.match(contents, /bob --help|command -v bob/);
  assert.equal(Boolean(stats.mode & 0o111), true);
});
