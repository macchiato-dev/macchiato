import assert from "node:assert/strict";
import test from "node:test";
import { EditorState, Text } from "@codemirror/state";
import { countCodePoints, sourceUsage, documentSourceUsage, createSourceEnvelopeExtension } from "../src/source-envelope.js";

function reference(value) {
  const lines = value.split("\n");
  return { codePoints: [...value].length, lines: lines.length,
    longestLineCodePoints: Math.max(...lines.map(line => [...line].length)) };
}

test("source accounting matches string iteration without character arrays", () => {
  for (const value of ["", "abc", "\n\n", "a\r\nb", "A😀e\u0301文", "😀\n中文\n",
    "\ud800", "\udc00", "a\ud800b\udc00c", "😀".repeat(1000), "a".repeat(300_000)]) {
    assert.equal(countCodePoints(value), reference(value).codePoints);
    assert.deepEqual(sourceUsage(value), reference(value));
    const doc = Text.of(value.split("\n"));
    assert.deepEqual(documentSourceUsage(doc), reference(value));
    assert.equal(documentSourceUsage(doc), documentSourceUsage(doc));
  }
});

test("cached document accounting stays exact through edits and restores", () => {
  let doc = Text.of(Array.from({ length: 1000 }, (_, index) => `line ${index}: 😀 中文`));
  const original = doc;
  let seed = 0x31415926;
  const next = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const inserts = ["", "\n", "😀", "a\nb", "中", "long ".repeat(40), "\ud800"];
  for (let index = 0; index < 100; index++) {
    const from = next() % (doc.length + 1);
    const to = Math.min(doc.length, from + next() % 50);
    const insert = inserts[next() % inserts.length];
    const updated = doc.replace(from, to, Text.of(insert.split("\n")));
    assert.deepEqual(documentSourceUsage(updated), reference(updated.toString()));
    assert.deepEqual(documentSourceUsage(doc), reference(doc.toString()));
    doc = updated;
  }
  assert.deepEqual(documentSourceUsage(original), reference(original.toString()));
  doc = doc.replace(0, doc.length, Text.of(["short"]));
  assert.deepEqual(documentSourceUsage(doc), reference("short"));
});

test("paste limits use code points and refuse whole over-budget edits", () => {
  const notices = [];
  let state = EditorState.create({ doc: "😀",
    extensions: createSourceEnvelopeExtension({ limits: {
      maxCodePoints: 4, maxLineCodePoints: 3, maxLines: 2,
    }, onLimit: usage => notices.push(usage) }) });
  state = state.update({ changes: { from: state.doc.length, insert: "ab" }, userEvent: "input.paste" }).state;
  assert.equal(state.doc.toString(), "😀ab");
  state = state.update({ changes: { from: state.doc.length, insert: "c" }, userEvent: "input.paste" }).state;
  assert.equal(state.doc.toString(), "😀ab");
  assert.equal(notices[0].longestLineCodePoints, 4);
  state = state.update({ changes: { from: state.doc.length, insert: "\nx" }, userEvent: "input.paste" }).state;
  assert.equal(state.doc.toString(), "😀ab");
  assert.equal(notices[1].codePoints, 5);
});
