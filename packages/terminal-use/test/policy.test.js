import test from "node:test";
import assert from "node:assert/strict";
import { createTerminalDomPolicy, normalizeTerminalLimits } from "../src/index.js";

test("terminal limits are bounded", () => {
  assert.equal(normalizeTerminalLimits({ rows: 40 }).rows, 40);
  assert.throws(() => normalizeTerminalLimits({ rows: 201 }), /rows/);
  assert.throws(() => normalizeTerminalLimits({ scrollback: 10_001 }), /scrollback/);
});

test("terminal surface has no URL-bearing elements or attributes", () => {
  const policy = createTerminalDomPolicy();
  for (const tag of ["a", "img", "iframe", "link", "script", "video"]) assert.ok(!policy.tags.includes(tag));
  for (const attribute of ["href", "src", "srcset", "action", "formaction"]) assert.equal(policy.attributes[attribute], undefined);
  assert.equal(policy.maxTagCounts.textarea, 1);
});
