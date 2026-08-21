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
  for (const style of [
    "background: url(//example.test/pixel)",
    "background-image: image-set(//example.test/a 1x)",
    "@import //example.test/theme.css",
  ]) assert.equal(policy.attributes.style.test(style), false);
  assert.equal(policy.attributes.style.test("position: absolute; width: 640px; transform: translateY(2px)"), true);
  assert.equal(policy.maxTagCounts.textarea, 1);
});
