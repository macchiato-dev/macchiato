import assert from "node:assert/strict";
import test from "node:test";
import {
  CODE_EDITOR_LINE_LIMITS,
  createCodeEditorDomPolicy,
  normalizeCodeEditorLimits,
} from "../src/index.js";

test("code editor exposes bounded 100, 1000, and 5000 line configurations", () => {
  assert.deepEqual(CODE_EDITOR_LINE_LIMITS, { compact: 100, standard: 1_000, large: 5_000 });
  for (const maxLines of Object.values(CODE_EDITOR_LINE_LIMITS)) {
    assert.equal(normalizeCodeEditorLimits({ maxLines }).maxLines, maxLines);
  }
  assert.throws(() => normalizeCodeEditorLimits({ maxLines: 5_001 }), /maxLines/);
});

test("code editor maps document and gas limits into its surface policy", () => {
  const policy = createCodeEditorDomPolicy({ maxLines: 100, maxCharacters: 2_000, maxSurfaceOperations: 321 });
  assert.equal(policy.maxTextLength, 2_000);
  assert.equal(policy.maxOperations, 321);
  assert.equal(policy.maxElements, 800);
  assert.equal(policy.maxTagCounts.div, 460);
  assert.equal(policy.maxTagCounts.span, 656);
  assert.equal(policy.tags.includes("a"), false);
  assert.equal(policy.tags.includes("iframe"), false);
});
