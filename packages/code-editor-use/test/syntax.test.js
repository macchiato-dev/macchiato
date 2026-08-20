import assert from "node:assert/strict";
import test from "node:test";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { EditorState } from "@codemirror/state";
import { hasSyntaxErrors } from "../src/syntax.js";

function htmlState(source) {
  return EditorState.create({ doc: source, extensions: [html()] });
}

test("HTML syntax checking delegates embedded CSS to the output sanitizer", () => {
  const source = `<style>.card { box-shadow:\n  0 1px 0 #fff inset,\n  0 30px 60px -20px #000;\n}</style><p>Ready</p>`;
  assert.equal(hasSyntaxErrors(htmlState(source), "html"), false);
});

test("HTML delegates detailed script and structure errors to the output pipeline", () => {
  assert.equal(hasSyntaxErrors(htmlState("<script>const = ;</script>"), "html"), false);
  assert.equal(hasSyntaxErrors(htmlState("<div class=>broken</div>"), "html"), false);
});

test("CSS syntax checking delegates definitive validation to the output sanitizer", () => {
  const state = EditorState.create({
    doc: ".tile { width: calc(7 / 760 * 100cqw); }",
    extensions: [css()],
  });
  assert.equal(hasSyntaxErrors(state, "css"), false);
});
