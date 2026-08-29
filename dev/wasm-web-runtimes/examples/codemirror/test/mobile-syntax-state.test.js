import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { recoverMobileSyntaxState } from "../src/mobile-syntax.js";

test("state recovery crosses the old 400-line boundary without retaining batches", () => {
  const source = [
    "const value = `opened;",
    ...Array.from({ length: 850 }, (_, index) => `  template line ${index}`),
    "`;",
    "const after = 1;",
  ].join("\n");
  const doc = EditorState.create({ doc: source }).doc;

  const inside = recoverMobileSyntaxState("javascript", doc, 801);
  assert.equal(inside.state, "template");
  assert.ok(inside.scannedChars > 10_000);

  const after = recoverMobileSyntaxState("javascript", doc, doc.lines);
  assert.equal(after.state, "normal");
});

test("state recovery bounds minified lines and retains no checkpoint", () => {
  const source = `const huge = "${"x".repeat(50_000)}";\nconst after = 1;`;
  const doc = EditorState.create({ doc: source }).doc;

  const first = recoverMobileSyntaxState("javascript", doc, 2);
  const second = recoverMobileSyntaxState("javascript", doc, 2);
  assert.equal(first.state, "normal");
  assert.ok(first.scannedChars <= 4097);
  assert.ok(first.skippedChars > 45_000);
  assert.deepEqual(second, first);
  assert.notEqual(second, first);
});
