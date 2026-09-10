import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { hasSyntaxErrors } from "../src/syntax.js";

test("output-owned languages do not recompile or copy the editor document", () => {
  const state = { get doc() { throw new Error("Unexpected document read"); } };
  for (const language of ["javascript", "html", "css"]) {
    assert.equal(hasSyntaxErrors(state, language), false, language);
  }
});

test("configuration JSON still uses its language parser", () => {
  for (const [source, invalid] of [
    ['{"enabled": true}', false],
    ['{"enabled": }', true],
  ]) {
    const state = EditorState.create({ doc: source, extensions: [json()] });
    assert.equal(hasSyntaxErrors(state, "json"), invalid, source);
  }
});
