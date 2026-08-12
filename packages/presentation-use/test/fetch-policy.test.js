import assert from "node:assert/strict";
import test from "node:test";
import { validateProjectFetchConfig } from "../src/controller.js";

test("allows bounded exact jsDelivr and unpkg resources", () => {
  assert.deepEqual(validateProjectFetchConfig({ resources: [
    "https://cdn.jsdelivr.net/npm/example@1.0.0/data.json",
    "https://unpkg.com/example@1.0.0/data.json",
  ] }).resources.length, 2);
});

test("rejects queries, unapproved origins, long URLs, and more than ten files", () => {
  assert.throws(() => validateProjectFetchConfig({ resources: ["https://cdn.jsdelivr.net/npm/x@1/a.js?v=1"] }), /query string/);
  assert.throws(() => validateProjectFetchConfig({ resources: ["https://example.com/a.js"] }), /origin not allowed/);
  assert.throws(() => validateProjectFetchConfig({ resources: [`https://unpkg.com/${"x".repeat(100)}`] }), /exceeds 100/);
  assert.throws(() => validateProjectFetchConfig({ resources: Array.from({ length: 11 }, (_, index) => `https://unpkg.com/p@1/${index}.js`) }), /at most 10/);
});
