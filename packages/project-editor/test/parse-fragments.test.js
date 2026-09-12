import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { retainFinishedParsing } from "../codemirror-parse-budget.js";

const path = fileURLToPath(import.meta.resolve("@codemirror/language"));
const source = await readFile(path, "utf8");

// Bundle each copy with its own matching state/tree types. No browser globals,
// mock parser, timing budget, or production artifacts are needed for this test.
async function loadLanguage(contents) {
  const result = await build({
    stdin: { contents: contents + `
      export { EditorState };
      export { parser as javascriptParser } from "@lezer/javascript";
      export { parser as jsonParser } from "@lezer/json";
      export { parser as htmlParser } from "@lezer/html";
    `, resolveDir: dirname(path) },
    bundle: true, format: "esm", platform: "node", write: false,
  });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const original = await loadLanguage(source);
const candidate = await loadLanguage(retainFinishedParsing(source));

function partial(api, parser, doc) {
  const state = api.EditorState.create({ doc });
  const context = api.ParseContext.create(parser, state, { from: 0, to: doc.length });
  let steps = 0;
  assert.equal(context.work(() => ++steps >= 300), false);
  assert.ok(context.parse.parsedPos > 100 && context.parse.parsedPos < doc.length,
    "the fixture must have unpublished reusable progress");
  return { context, state };
}

function nodes(tree) {
  const result = [];
  tree.iterate({ enter(node) { result.push([node.name, node.from, node.to]); } });
  return result;
}

test("fragment adaptation moves only finalization before the snapshot and fails closed", () => {
  const adapted = retainFinishedParsing(source);
  assert.equal(adapted.replace(
    "        this.takeTree();\n        let { fragments, tree, treeLen, viewport, skipped } = this;",
    "        let { fragments, tree, treeLen, viewport, skipped } = this;\n        this.takeTree();"), source);
  assert.throws(() => retainFinishedParsing(adapted), /Review CodeMirror/);
  assert.throws(() => retainFinishedParsing(source + source), /Review CodeMirror/);
});

test("an edit retains fragments finalized from work between keystrokes", () => {
  const doc = "const item = 1;\n".repeat(500);
  for (const [api, retains] of [[original, false], [candidate, true]]) {
    const { context, state } = partial(api, api.javascriptParser, doc);
    const progress = context.parse.parsedPos;
    const transaction = state.update({ changes: { from: doc.length, insert: "\n" } });
    const next = context.changes(transaction.changes, transaction.state);
    assert.ok(context.fragments.some(fragment => fragment.to >= progress));
    assert.equal(next.fragments.some(fragment => fragment.to >= progress), retains,
      "the installed version loses this progress; the candidate must retain it");
  }
});

for (const [language, row] of [
  ["javascript", "function item() { return 'value 猫 🐈'; }\n"],
  ["json", '["value 猫 🐈", {"enabled":true}],\n'],
  ["html", '<section><p class="text">value 猫 🐈</p></section>\n'],
]) {
  for (const edit of ["append", "inside", "delete", "replace", "multiple", "none"]) {
    test(`${language}: retained partial fragments match a fresh parse after ${edit}`, () => {
      const parser = candidate[language + "Parser"];
      const repeated = row.repeat(500);
      const doc = language === "json" ? "[\n" + repeated.slice(0, -2) + "\n]" : repeated;
      const { context, state } = partial(candidate, parser, doc);
      // Editing inside the completed prefix must invalidate it normally. Include
      // malformed input: reusing an obsolete prefix must not hide syntax errors.
      const changes = edit === "append" ? { from: doc.length, insert: " unfinished(\"" }
        : edit === "inside" ? { from: 15, to: 18, insert: "\"<" }
        : edit === "delete" ? { from: 0, to: row.length * 2 }
        : edit === "replace" ? { from: 0, to: doc.length, insert: row }
        : edit === "multiple" ? [{ from: 0, insert: "\n" },
          { from: 20, to: 22, insert: "🐈" }, { from: doc.length, insert: row }]
        : [];
      const transaction = state.update({ changes });
      const next = context.changes(transaction.changes, transaction.state);
      if (edit === "none") {
        assert.ok(next.treeLen > 0, "a no-op keeps the just-finalized partial tree");
        assert.equal(next.tree, context.tree);
      }
      assert.equal(next.work(() => false), true);
      assert.deepEqual(nodes(next.tree), nodes(parser.parse(transaction.state.doc.toString())));
    });
  }
}
