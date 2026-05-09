import assert from "node:assert/strict";
import { test } from "node:test";

test("shared package has a runtime module entry", async () => {
  const shared = await import("../packages/shared/dist/index.js");
  assert.equal(typeof shared, "object");
});
