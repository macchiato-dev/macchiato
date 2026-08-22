import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { countCodePoints, createSourceEnvelopeExtension, hardWrapSource,
  SOURCE_LIMITS } from "../src/source-envelope.js";

test("hard wraps source at 256 Unicode code points", () => {
  const input = `${"a".repeat(255)}🐈b`;
  const output = hardWrapSource(input);
  assert.equal(output, `${"a".repeat(255)}🐈\nb`);
  assert.equal(countCodePoints(output.split("\n")[0]), 256);
});

test("the CodeMirror extension wraps before recording the transaction", () => {
  let state = EditorState.create({ extensions: createSourceEnvelopeExtension() });
  state = state.update({ changes: { from: 0, insert: "x".repeat(257) } }).state;
  assert.equal(state.doc.toString(), `${"x".repeat(256)}\nx`);
});

test("hard wrapping preserves a mapped caret", () => {
  let state = EditorState.create({
    doc: "x".repeat(255),
    selection: { anchor: 255 },
    extensions: createSourceEnvelopeExtension(),
  });
  state = state.update({
    changes: { from: 255, insert: "🐈y" },
    selection: { anchor: 258 },
  }).state;
  assert.equal(state.doc.toString(), `${"x".repeat(255)}🐈\ny`);
  assert.equal(state.selection.main.head, state.doc.length);
});

test("refuses an overlong paste atomically and reports it", () => {
  const rejected = [];
  let state = EditorState.create({
    doc: "kept",
    extensions: createSourceEnvelopeExtension((usage) => rejected.push(usage)),
  });
  state = state.update({
    changes: { from: state.doc.length, insert: "x".repeat(257) },
    userEvent: "input.paste",
  }).state;
  assert.equal(state.doc.toString(), "kept");
  assert.equal(rejected.at(-1).input, "paste");
  assert.equal(rejected.at(-1).longestLineCodePoints, 261);
});

test("accepts a paste whose lines and resulting document fit", () => {
  let state = EditorState.create({ extensions: createSourceEnvelopeExtension() });
  const pasted = `${"x".repeat(256)}\n${"y".repeat(256)}`;
  state = state.update({ changes: { from: 0, insert: pasted }, userEvent: "input.paste" }).state;
  assert.equal(state.doc.toString(), pasted);
});

test("rejects source beyond the line and code-point limits", () => {
  const rejected = [];
  let state = EditorState.create({ extensions: createSourceEnvelopeExtension((usage) => rejected.push(usage)) });
  const tooManyLines = Array.from({ length: SOURCE_LIMITS.maxLines + 1 }, () => "x").join("\n");
  state = state.update({ changes: { from: 0, insert: tooManyLines } }).state;
  assert.equal(state.doc.length, 0);
  assert.equal(rejected.at(-1).lines, SOURCE_LIMITS.maxLines + 1);

  const tooManyCodePoints = Array.from({ length: SOURCE_LIMITS.maxLines },
    () => "x".repeat(161)).join("\n");
  state = state.update({ changes: { from: 0, insert: tooManyCodePoints } }).state;
  assert.equal(state.doc.length, 0);
  assert.ok(rejected.at(-1).codePoints > SOURCE_LIMITS.maxCodePoints);
});
